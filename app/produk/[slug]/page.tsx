import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import CheckoutForm from "./checkout-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, description, price_idr, cover_image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) return { title: "Produk tidak ditemukan" };

  const description =
    product.description?.slice(0, 155) ||
    `Beli ${product.title} seharga Rp ${product.price_idr.toLocaleString("id-ID")}. Download langsung setelah bayar.`;

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.cover_image_url ? [product.cover_image_url] : [],
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: profile }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, title, description, price_idr, stock_qty, cover_image_url, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .single(),
    supabase.from("profile").select("qris_image_url, whatsapp_number").limit(1).single(),
  ]);

  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || product.title,
    image: product.cover_image_url || undefined,
    offers: {
      "@type": "Offer",
      price: product.price_idr,
      priceCurrency: "IDR",
      availability:
        product.stock_qty === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-ink/5 bg-cream/90 backdrop-blur">
        <div className="mx-auto max-w-xl px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-stone hover:text-orange">
            ← Kembali
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-10">
        {product.cover_image_url ? (
          <Image
            src={product.cover_image_url}
            alt={product.title}
            width={600}
            height={400}
            className="w-full rounded-2xl border-2 border-ink/5 object-cover"
          />
        ) : (
          <div className="aspect-video w-full rounded-2xl bg-peach" />
        )}

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{product.title}</h1>
          <p className="mt-1 text-xl font-bold text-orange-dark">
            Rp {product.price_idr.toLocaleString("id-ID")}
          </p>
          {product.stock_qty !== null && (
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                product.stock_qty > 0
                  ? "bg-red-50 text-red-600"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {product.stock_qty > 0 ? `Tersisa ${product.stock_qty}` : "Stok habis"}
            </span>
          )}
        </div>

        {product.description && (
          <p className="whitespace-pre-line leading-relaxed text-stone">
            {product.description}
          </p>
        )}

        <CheckoutForm
          productSlug={product.slug}
          price={product.price_idr}
          qrisImageUrl={profile?.qris_image_url ?? null}
          whatsappNumber={profile?.whatsapp_number ?? null}
          soldOut={product.stock_qty === 0}
        />
      </main>
    </>
  );
}
