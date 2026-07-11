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

  async function markPaid(order: OrderRow) {
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

    // Kurangi stok otomatis kalau produk itu punya stok terbatas (bukan null/tak terbatas)
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

    load();
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
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Pesanan</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Pesanan Masuk</h1>
        <p className="mt-1 text-sm text-stone">
          Cek bukti transfer, lalu tandai lunas. Link download dibuat otomatis, tapi
          kamu yang kirim manual ke pembeli (WA/email).
        </p>
      </div>

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
                  <Button onClick={() => markPaid(o)} size="sm">
                    Tandai lunas
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
                <button
                  onClick={() => copyDownloadLink(o.download_token!, o.id)}
                  className="rounded-full border-2 border-green-300 px-3.5 py-1.5 text-xs font-semibold text-green-700 hover:border-green-500"
                >
                  {copiedId === o.id ? "Tersalin!" : "Salin link download"}
                </button>
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
