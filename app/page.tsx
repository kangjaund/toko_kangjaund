import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/app/components/Button";
import { SocialIcon } from "@/app/components/SocialIcons";
import { Tile } from "@/app/components/Tile";
import { Badge } from "@/app/components/Badge";

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
      <Badge>
        {stockQty > 0 ? `Tersisa ${stockQty}` : "Habis"}
      </Badge>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* HEADER — Metro style */}
      <div className="flex items-center justify-between border-b-2 border-[#CCCCCC] pb-3 mb-6">
        <span className="text-sm font-bold uppercase tracking-wider text-[#666666]">
          {displayName.toUpperCase()}
        </span>
        {products && products.length > 0 && (
          <LinkButton variant="outline" size="sm" href="#products">
            Lihat Produk
          </LinkButton>
        )}
      </div>

      {/* HERO TILE — Metro hero block */}
      <div className="metro-hero">
        <h1>Selamat Datang di {displayName}</h1>
        {profile?.bio && <p>{profile.bio}</p>}
      </div>

      {/* AVATAR — optional, in a small tile */}
      {profile?.avatar_url && (
        <div className="metro-tile inline-block mb-4">
          <Image
            src={profile.avatar_url}
            alt={displayName}
            width={80}
            height={80}
            className="object-cover"
          />
        </div>
      )}

      {/* SOCIAL ICONS — as tile row */}
      {links && links.some((l) => l.link_type === "social") && (
        <div className="flex flex-wrap gap-3 mb-6">
          {links
            .filter((l) => l.link_type === "social")
            .map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="metro-tile !p-2 hover:border-[#0078D7]"
              >
                <SocialIcon platform={link.platform} className="w-6 h-6" />
              </a>
            ))}
        </div>
      )}

      {/* REGULAR LINKS — as Metro tiles */}
      {links && links.some((l) => l.link_type !== "social") && (
        <div className="metro-grid mb-8">
          {links
            .filter((l) => l.link_type !== "social")
            .map((link) => (
              <Tile key={link.id} href={link.url} color="default">
                <span className="font-bold text-sm">{link.title}</span>
              </Tile>
            ))}
        </div>
      )}

      {/* PRODUCTS SECTION */}
      {products && products.length > 0 && (
        <section id="products" className="mt-10">
          <div className="border-t-2 border-[#CCCCCC] pt-6 mb-6">
            <h2 className="metro-heading text-2xl">Produk</h2>
            <p className="text-[#666666]">Download, langsung pakai.</p>
          </div>

          <div className="metro-grid">
            {products.map((product) => (
              <Tile key={product.id} color="default" className="flex flex-col">
                {product.cover_image_url ? (
                  <div className="relative w-full aspect-square bg-[#E5E5E5] mb-3">
                    <Image
                      src={product.cover_image_url}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-[#E5E5E5] mb-3 flex items-center justify-center text-[#999] text-sm">
                    No image
                  </div>
                )}

                <h3 className="font-bold text-base leading-tight">{product.title}</h3>
                <p className="text-lg font-bold mt-1">
                  Rp {product.price_idr.toLocaleString("id-ID")}
                </p>
                <div className="mt-2">{stockBadge(product.stock_qty)}</div>

                <LinkButton
                  href={`/produk/${product.slug}`}
                  variant="primary"
                  size="sm"
                  className="mt-3 w-full justify-center"
                >
                  Lihat
                </LinkButton>
              </Tile>
            ))}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t-2 border-[#CCCCCC] mt-12 pt-4 text-xs text-[#666666]">
        © {new Date().getFullYear()} {displayName} · dibuat oleh{" "}
        <a href="https://www.threads.com" className="underline hover:text-[#1A1A1A]">
          Kang Jaund
        </a>
      </footer>
    </main>
  );
}
