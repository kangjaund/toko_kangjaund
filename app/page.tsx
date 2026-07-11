import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/app/components/Badge";
import { LinkButton } from "@/app/components/Button";

export const revalidate = 30;

export default async function ProfilePage() {
  const supabase = await createClient();

  const [{ data: profile }, { data: links }, { data: products }] = await Promise.all([
    supabase.from("profile").select("*").limit(1).single(),
    supabase.from("links").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const displayName = profile?.display_name ?? "Toko Kang Jaund";

  function stockBadge(stockQty: number | null) {
    if (stockQty === null) return null;
    return (
      <span
        className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${
          stockQty > 0 ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-400"
        }`}
      >
        {stockQty > 0 ? `Tersisa ${stockQty}` : "Habis"}
      </span>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-ink/5 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="text-lg font-extrabold tracking-tight text-orange">
            {displayName.toUpperCase()}
          </span>
          {products && products.length > 0 && (
            <LinkButton href="#produk" variant="outline" size="sm">
              Lihat Produk
            </LinkButton>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-peach/70 to-cream px-6 py-16">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
          <Badge>Produk Digital</Badge>

          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            Selamat Datang di
            <br />
            <span className="text-orange">{displayName}</span>
          </h1>

          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={220}
              height={220}
              className="h-auto w-48 object-contain sm:w-56"
            />
          ) : null}

          {profile?.bio && (
            <p className="max-w-sm text-stone">{profile.bio}</p>
          )}

          {/* Links */}
          {links && links.length > 0 && (
            <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border-2 border-ink/10 bg-white px-5 py-3 text-center text-sm font-semibold text-ink transition hover:border-orange hover:text-orange"
                >
                  {link.title}
                </a>
              ))}
            </div>
          )}

          {products && products.length > 0 && (
            <LinkButton href="#produk" variant="primary" size="lg" className="mt-2">
              Lihat Produk ↓
            </LinkButton>
          )}
        </div>
      </section>

      {/* Produk */}
      {products && products.length > 0 && (
        <section id="produk" className="mx-auto max-w-3xl px-6 py-14">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-orange">
            Produk
          </p>
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-ink">
            Download, langsung pakai.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/produk/${product.slug}`}
                className="group flex items-center gap-4 rounded-2xl border-2 border-ink/5 bg-white p-4 transition hover:border-orange hover:shadow-md"
              >
                {product.cover_image_url ? (
                  <Image
                    src={product.cover_image_url}
                    alt={product.title}
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-peach" />
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold text-ink group-hover:text-orange-dark">
                    {product.title}
                  </p>
                  <p className="text-sm font-medium text-stone">
                    Rp {product.price_idr.toLocaleString("id-ID")}
                  </p>
                  {stockBadge(product.stock_qty)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-stone">
        © {new Date().getFullYear()} {displayName}
      </footer>
    </>
  );
}
