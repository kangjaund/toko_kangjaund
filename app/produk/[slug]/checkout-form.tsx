"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import FileInput from "@/app/components/FileInput";

import { Button, LinkButton } from "@/app/components/Button";

type Destination = {
  id: number;
  label: string;
  province: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  zipCode: string | null;
};

type ShippingQuote = {
  courierCode: string;
  courierName: string;
  courierService: string;
  courierDescription: string;
  costIdr: number;
  etd: string | null;
};

export default function CheckoutForm({
  productId,
  productSlug,
  productType,
  weightGrams,
  price,
  qrisImageUrl,
  whatsappNumber,
  soldOut = false,
}: {
  productId: string;
  productSlug: string;
  productType: "digital" | "physical";
  weightGrams: number | null;
  price: number;
  qrisImageUrl: string | null;
  whatsappNumber: string | null;
  soldOut?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [proofFile, setProofFile] = useState<File | null>(null);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);

  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<ShippingQuote | null>(null);

  const [destinationLoading, setDestinationLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isPhysical = productType === "physical";
  const shippingIdr = selectedQuote?.costIdr ?? 0;
  const totalIdr = price + shippingIdr;

  useEffect(() => {
    if (!isPhysical) return;

    const query = destinationQuery.trim();

    if (query.length < 2) {
      setDestinations([]);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setDestinationLoading(true);
      setShippingError("");

      try {
        const res = await fetch(
          `/api/shipping/destinations?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Gagal mencari tujuan pengiriman.");
        }

        setDestinations(data.destinations ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDestinations([]);
        setShippingError(
          error instanceof Error
            ? error.message
            : "Gagal mencari tujuan pengiriman."
        );
      } finally {
        setDestinationLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [destinationQuery, isPhysical]);

  async function chooseDestination(nextDestination: Destination) {
    setDestination(nextDestination);
    setDestinationQuery(nextDestination.label);
    setDestinations([]);
    setSelectedQuote(null);
    setQuotes([]);
    setShippingError("");

    if (!weightGrams || weightGrams <= 0) {
      setShippingError(
        "Berat produk belum diatur. Produk fisik tidak bisa menghitung ongkir."
      );
      return;
    }

    setQuoteLoading(true);

    try {
      const res = await fetch("/api/shipping/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: nextDestination.id,
          items: [{ product_id: productId, quantity: 1 }],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Gagal menghitung ongkir.");
      }

      setQuotes(data.quotes ?? []);
    } catch (error) {
      setShippingError(
        error instanceof Error
          ? error.message
          : "Gagal menghitung ongkir."
      );
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleSubmit() {
    setErrorMsg("");

    if (isPhysical) {
      setErrorMsg(
        "Checkout produk fisik belum bisa menerima pembayaran sampai QRIS dinamis aktif. Phase ini hanya untuk pengujian ongkir."
      );
      setStatus("error");
      return;
    }

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

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

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
        <p className="font-bold">
          Terima kasih, bukti transfer sudah kami terima.
        </p>
        <p className="mt-1.5 leading-relaxed">
          Pesanan kamu akan kami cek maksimal dalam <b>30 menit</b>. Link
          download akan dikirim ke <b>{email}</b>
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

      {isPhysical && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-orange">
            1. Tujuan pengiriman
          </p>

          <div>
            <input
              type="text"
              placeholder="Ketik kelurahan / kecamatan / kota"
              value={destinationQuery}
              onChange={(e) => {
                setDestinationQuery(e.target.value);
                if (destination) {
                  setDestination(null);
                  setQuotes([]);
                  setSelectedQuote(null);
                }
              }}
              className={inputClass + " w-full"}
              disabled={soldOut}
            />

            {destinationLoading && (
              <p className="mt-2 text-xs text-stone">Mencari tujuan...</p>
            )}

            {destinations.length > 0 && (
              <div className="mt-2 max-h-56 overflow-auto rounded-xl border-2 border-ink/10 bg-white">
                {destinations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseDestination(item)}
                    className="block w-full border-b border-ink/5 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-peach/40"
                  >
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-stone">
                      {item.zipCode ? `Kode pos ${item.zipCode}` : " "}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {destination && (
            <div className="rounded-xl bg-peach/40 px-4 py-3 text-sm">
              <p className="font-semibold text-ink">Tujuan dipilih</p>
              <p className="mt-0.5 text-stone">{destination.label}</p>
              <p className="mt-1 text-xs text-stone">
                Berat paket: {weightGrams?.toLocaleString("id-ID") ?? "-"} g
              </p>
            </div>
          )}

          {quoteLoading && (
            <p className="text-sm text-stone">Menghitung pilihan ongkir...</p>
          )}

          {quotes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-orange">
                Pilih layanan pengiriman
              </p>

              {quotes.map((quote) => {
                const selected =
                  selectedQuote?.courierCode === quote.courierCode &&
                  selectedQuote?.courierService === quote.courierService;

                return (
                  <button
                    key={`${quote.courierCode}-${quote.courierService}`}
                    type="button"
                    onClick={() => setSelectedQuote(quote)}
                    className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                      selected
                        ? "border-orange bg-peach/40"
                        : "border-ink/10 bg-white hover:border-orange/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">
                          {quote.courierName} {quote.courierService}
                        </p>
                        <p className="mt-0.5 text-xs text-stone">
                          {quote.etd ? `Estimasi ${quote.etd}` : "Estimasi waktu mengikuti layanan"}
                        </p>
                      </div>

                      <p className="shrink-0 font-bold text-orange-dark">
                        Rp {quote.costIdr.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {destination && quotes.length === 0 && !quoteLoading && !shippingError && (
            <p className="text-sm text-stone">
              Belum ada layanan pengiriman yang tersedia untuk tujuan ini.
            </p>
          )}

          {shippingError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {shippingError}
            </p>
          )}
        </div>
      )}

      <div className={soldOut ? "opacity-50" : ""}>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange">
          {isPhysical ? "2. Ringkasan pembayaran" : "1. Scan & bayar"}
        </p>

        {isPhysical ? (
          <div className="rounded-xl bg-neutral-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone">Harga produk</span>
              <span className="font-semibold text-ink">
                Rp {price.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-stone">Ongkir</span>
              <span className="font-semibold text-ink">
                {selectedQuote
                  ? `Rp ${shippingIdr.toLocaleString("id-ID")}`
                  : "Pilih layanan"}
              </span>
            </div>

            <div className="mt-3 border-t border-ink/10 pt-3">
              <div className="flex justify-between gap-4">
                <span className="font-bold text-ink">Total</span>
                <span className="font-extrabold text-orange-dark">
                  Rp {totalIdr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-stone">
              Scan QRIS ini, bayar tepat{" "}
              <b className="text-ink">Rp {price.toLocaleString("id-ID")}</b>
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
                    Transaksi lewat m-banking di HP ini? Download gambar
                    QRIS-nya di sini
                  </a>
                )}
              </>
            ) : (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                QRIS belum diatur oleh penjual. Hubungi penjual dulu sebelum
                membeli.
              </p>
            )}
          </>
        )}
      </div>

      <div className={`flex flex-col gap-2.5 ${soldOut ? "opacity-50" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">
          {isPhysical ? "3. Data pembeli" : "2. Kirim bukti transfer"}
        </p>

        {isPhysical && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <b>Beta test:</b> ongkir dan total sudah dihitung dari RajaOngkir.
            Pembayaran produk fisik belum diaktifkan sampai QRIS dinamis siap.
            Jangan melakukan transfer dari halaman ini dulu.
          </div>
        )}

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

        {!isPhysical && (
          <>
            <FileInput
              label="Screenshot/foto bukti transfer"
              accept="image/*"
              onChange={setProofFile}
              disabled={soldOut}
            />

            {errorMsg && (
              <p className="text-sm font-medium text-red-600">{errorMsg}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading || !qrisImageUrl || soldOut}
              size="lg"
              className="w-full"
            >
              {soldOut
                ? "Stok Habis"
                : loading
                  ? "Mengirim..."
                  : "Kirim bukti transfer"}
            </Button>
          </>
        )}

        {isPhysical && (
          <Button
            onClick={handleSubmit}
            disabled={soldOut || !destination || !selectedQuote}
            size="lg"
            className="w-full"
          >
            Lanjut ke pembayaran (segera hadir)
          </Button>
        )}

        {errorMsg && (
          <p className="text-sm font-medium text-red-600">{errorMsg}</p>
        )}

        {whatsappNumber && (
          <LinkButton
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
            className="self-center"
          >
            {soldOut
              ? "Tanya kapan restock ke penjual"
              : "Ada kendala? Chat WhatsApp penjual"}
          </LinkButton>
        )}
      </div>
    </div>
  );
}
