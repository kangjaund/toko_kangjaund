"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/app/components/Button";

type OrderRow = {
  id: string;
  order_code: string;
  product_id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_whatsapp: string | null;
  amount_idr: number;
  status: string;
  proof_path: string | null;
  download_token: string | null;
  created_at: string;
  products: { title: string } | null;
};

type ProductWithId = { id: string; title: string; stock_qty: number | null };

const statusLabel: Record<string, string> = {
  pending_review: "Menunggu verifikasi",
  paid: "Lunas",
  rejected: "Ditolak",
};

const statusStyle: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState<{ id: string; text: string } | null>(null);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_code, product_id, buyer_email, buyer_name, buyer_whatsapp, amount_idr, status, proof_path, download_token, created_at, products(title)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    setOrders((data as unknown as OrderRow[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function viewProof(orderId: string, proofPath: string) {
    const { data } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(proofPath, 300);
    if (data?.signedUrl) {
      setProofUrls((prev) => ({ ...prev, [orderId]: data.signedUrl }));
    }
  }

  function exportCsv() {
    if (orders.length === 0) return;

    const headers = [
      "Kode Order",
      "Tanggal",
      "Nama Pembeli",
      "Email",
      "WhatsApp",
      "Produk",
      "Nominal (IDR)",
      "Status",
    ];

    const rows = orders.map((o) => [
      `"${o.order_code}"`,
      `"${new Date(o.created_at).toLocaleString("id-ID")}"`,
      `"${(o.buyer_name || "").replace(/"/g, '""')}"`,
      `"${o.buyer_email}"`,
      `"${o.buyer_whatsapp || ""}"`,
      `"${(o.products?.title || "").replace(/"/g, '""')}"`,
      o.amount_idr,
      `"${statusLabel[o.status] || o.status}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `rekap-pesanan-kangjaund-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function markPaid(order: OrderRow) {
    setProcessingId(order.id);

    try {
      // Panggil API route server untuk update status & kirim email otomatis
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengonfirmasi pesanan");
      }

      setNotifyMsg({
        id: order.id,
        text: data.emailSent
          ? "Pesanan lunas & email link download otomatis terkirim ke pembeli!"
          : "Pesanan lunas! Silakan kirim link download via WhatsApp.",
      });

      setTimeout(() => setNotifyMsg(null), 5000);
    } catch (err: unknown) {
      console.error(err);
      // Fallback update langsung dari browser jika API route terkendala
      const token = crypto.randomUUID();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      await supabase
        .from("orders")
        .update({
          status: "paid",
          download_token: token,
          download_token_expires_at: expires.toISOString(),
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      const { data: product } = await supabase
        .from("products")
        .select("id, stock_qty")
        .eq("id", order.product_id)
        .single<ProductWithId>();

      if (product && product.stock_qty !== null && product.stock_qty > 0) {
        await supabase
          .from("products")
          .update({ stock_qty: product.stock_qty - 1 })
          .eq("id", product.id);
      }
    } finally {
      setProcessingId(null);
      load();
    }
  }

  async function reject(orderId: string) {
    await supabase.from("orders").update({ status: "rejected" }).eq("id", orderId);
    load();
  }

  function copyDownloadLink(token: string, orderId: string) {
    const url = `${window.location.origin}/api/download/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Pesanan</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Pesanan Masuk</h1>
          <p className="mt-1 text-sm text-stone">
            Cek bukti transfer, lalu tandai lunas. Email konfirmasi akan terkirim otomatis ke pembeli.
          </p>
        </div>

        {orders.length > 0 && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border-2 border-ink/10 bg-white px-4 py-2 text-xs font-bold text-ink transition hover:border-orange hover:text-orange cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Ekspor Rekap CSV
          </button>
        )}
      </div>

      {notifyMsg && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm animate-fade-in">
          {notifyMsg.text}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border-2 border-ink/5 bg-white p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">{o.products?.title ?? "Produk"}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[o.status]}`}
              >
                {statusLabel[o.status] ?? o.status}
              </span>
            </div>
            <p className="mt-1 text-stone">
              {o.buyer_name || "-"} · {o.buyer_email}
              {o.buyer_whatsapp ? ` · ${o.buyer_whatsapp}` : ""}
            </p>
            <p className="font-medium text-ink">Rp {o.amount_idr.toLocaleString("id-ID")}</p>
            <p className="text-xs text-stone">
              {o.order_code} · {new Date(o.created_at).toLocaleString("id-ID")}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {o.proof_path && !proofUrls[o.id] && (
                <button
                  onClick={() => viewProof(o.id, o.proof_path!)}
                  className="rounded-full border-2 border-ink/10 px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-orange hover:text-orange"
                >
                  Lihat bukti transfer
                </button>
              )}
              {proofUrls[o.id] && (
                <a
                  href={proofUrls[o.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-orange-dark underline"
                >
                  Buka bukti transfer
                </a>
              )}

              {o.status === "pending_review" && (
                <>
                  <Button
                    onClick={() => markPaid(o)}
                    size="sm"
                    disabled={processingId === o.id}
                  >
                    {processingId === o.id ? "Memproses..." : "Tandai lunas"}
                  </Button>
                  <button
                    onClick={() => reject(o.id)}
                    className="rounded-full border-2 border-red-200 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:border-red-400"
                  >
                    Tolak
                  </button>
                </>
              )}

              {o.status === "paid" && o.download_token && (
                <>
                  <button
                    onClick={() => copyDownloadLink(o.download_token!, o.id)}
                    className="rounded-full border-2 border-green-300 px-3.5 py-1.5 text-xs font-semibold text-green-700 hover:border-green-500"
                  >
                    {copiedId === o.id ? "Tersalin!" : "Salin link download"}
                  </button>

                  {o.buyer_whatsapp && (
                    <a
                      href={`https://wa.me/${o.buyer_whatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(
                        `Halo Kak ${o.buyer_name || ""}, pesanan ${o.products?.title ?? "produk"} kamu sudah kami konfirmasi. Ini link download produk kamu ya:\n\n${typeof window !== "undefined" ? window.location.origin : ""}/api/download/${o.download_token}\n\nLink ini aktif selama 7 hari. Jika ada kendala langsung hubungi kami ya. Terima kasih banyak!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border-2 border-emerald-400 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Kirim via WA
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="text-sm text-stone">Belum ada pesanan masuk.</p>
        )}
      </div>
    </div>
  );
}
