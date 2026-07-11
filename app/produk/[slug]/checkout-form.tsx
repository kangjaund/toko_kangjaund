"use client";

import { useState } from "react";
import Image from "next/image";
import FileInput from "@/app/components/FileInput";
import { Button, LinkButton } from "@/app/components/Button";

export default function CheckoutForm({
  productSlug,
  price,
  qrisImageUrl,
  whatsappNumber,
  soldOut = false,
}: {
  productSlug: string;
  price: number;
  qrisImageUrl: string | null;
  whatsappNumber: string | null;
  soldOut?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    setErrorMsg("");
    if (!email || !proofFile) {
      setErrorMsg("Email dan bukti transfer wajib diisi.");
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("productSlug", productSlug);
      formData.append("buyerEmail", email);
      formData.append("buyerName", name);
      formData.append("buyerWhatsapp", whatsapp);
      formData.append("proofFile", proofFile);

      const res = await fetch("/api/orders", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal mengirim pesanan");
        setStatus("error");
      } else {
        setStatus("sent");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan, coba lagi.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange disabled:bg-neutral-50 disabled:text-neutral-400";

  if (status === "sent") {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 text-sm text-green-900">
        <p className="font-bold">Terima kasih, bukti transfer sudah kami terima 🙏</p>
        <p className="mt-1.5 leading-relaxed">
          Pesanan kamu akan kami cek maksimal dalam <b>30 menit</b>. Link download
          akan dikirim ke <b>{email}</b>
          {whatsapp ? " atau via WhatsApp" : ""} setelah kami konfirmasi.
        </p>
        {whatsappNumber && (
          <p className="mt-2.5">
            Belum menerima link setelah 30 menit?{" "}
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-2 underline-offset-2"
            >
              Chat kami di WhatsApp
            </a>
            , ya.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-5 rounded-2xl border-2 border-ink/5 bg-white p-5">
      {soldOut && (
        <span className="absolute right-4 top-4 rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-white">
          STOK HABIS
        </span>
      )}

      <div className={soldOut ? "opacity-50" : ""}>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange">
          1. Scan &amp; bayar
        </p>
        <p className="mb-3 text-sm text-stone">
          Scan QRIS ini, bayar tepat <b className="text-ink">Rp {price.toLocaleString("id-ID")}</b>
        </p>
        {qrisImageUrl ? (
          <>
            <Image
              src={qrisImageUrl}
              alt="Kode QRIS"
              width={260}
              height={260}
              className="mx-auto rounded-xl border-2 border-ink/10 p-2"
            />
            {!soldOut && (
              <a
                href="/api/qris-download"
                className="mt-2 block text-center text-xs font-semibold text-stone underline hover:text-orange"
              >
                Download QRIS
              </a>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            QRIS belum diatur oleh penjual. Hubungi penjual dulu sebelum membeli.
          </p>
        )}
      </div>

      <div className={`flex flex-col gap-2.5 ${soldOut ? "opacity-50" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">
          2. Kirim bukti transfer
        </p>
        <input
          type="email"
          placeholder="Email kamu (buat kirim link download)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          disabled={soldOut}
        />
        <input
          type="text"
          placeholder="Nama (opsional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          disabled={soldOut}
        />
        <input
          type="text"
          placeholder="Nomor WhatsApp (opsional, biar lebih cepat dihubungi)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className={inputClass}
          disabled={soldOut}
        />
        <FileInput
          label="Screenshot/foto bukti transfer"
          accept="image/*"
          onChange={setProofFile}
          disabled={soldOut}
        />
        {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
        <Button
          onClick={handleSubmit}
          disabled={loading || !qrisImageUrl || soldOut}
          size="lg"
          className="w-full"
        >
          {soldOut ? "Stok Habis" : loading ? "Mengirim..." : "Kirim bukti transfer"}
        </Button>
        {whatsappNumber && (
          <LinkButton
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
            className="self-center"
          >
            {soldOut ? "Tanya kapan restock ke penjual" : "Ada kendala? Chat WhatsApp penjual"}
          </LinkButton>
        )}
      </div>
    </div>
  );
}
