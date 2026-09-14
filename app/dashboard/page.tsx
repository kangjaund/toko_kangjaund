import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type OrderItem = {
  id: string;
  order_code: string;
  product_id: string;
  buyer_name: string | null;
  buyer_email: string;
  amount_idr: number;
  status: string;
  created_at: string;
  products: { title: string } | null;
};

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

export default async function DashboardHome() {
  const supabase = await createClient();

  const [{ data: ordersData }, { data: products }, { data: links }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_code, product_id, buyer_name, buyer_email, amount_idr, status, created_at, products(title)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, title, price_idr, is_active"),
    supabase
      .from("links")
      .select("id, title, url, click_count, is_active")
      .order("click_count", { ascending: false }),
  ]);

  const orders = (ordersData as unknown as OrderItem[]) ?? [];
  const paidOrders = orders.filter((o) => o.status === "paid");
  const pendingOrders = orders.filter((o) => o.status === "pending_review");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount_idr, 0);
  const totalOrders = orders.length;
  const conversionRate = totalOrders > 0 ? Math.round((paidOrders.length / totalOrders) * 100) : 0;
  const aov = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const totalClicks = links?.reduce((sum, l) => sum + (l.click_count || 0), 0) ?? 0;

  // Breakdown penjualan per produk
  const productStatsMap = new Map<string, { title: string; count: number; revenue: number }>();
  products?.forEach((p) => {
    productStatsMap.set(p.id, { title: p.title, count: 0, revenue: 0 });
  });
  paidOrders.forEach((o) => {
    const existing = productStatsMap.get(o.product_id);
    const title = o.products?.title || existing?.title || "Produk";
    if (existing) {
      existing.count += 1;
      existing.revenue += o.amount_idr;
    } else {
      productStatsMap.set(o.product_id, { title, count: 1, revenue: o.amount_idr });
    }
  });
  const productSales = Array.from(productStatsMap.values()).sort((a, b) => b.revenue - a.revenue);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Ringkasan</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Halo, Kang Jaund</h1>
        </div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-sm font-semibold text-orange hover:text-orange-dark hover:underline"
        >
          Lihat semua pesanan →
        </Link>
      </div>

      {/* Quick Alert if Pending Orders Exist */}
      {pendingOrders.length > 0 && (
        <Link
          href="/dashboard/orders"
          className="flex items-center justify-between rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 transition hover:border-amber-400 hover:shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold text-amber-800">
              Ada {pendingOrders.length} pesanan baru menunggu verifikasi!
            </span>
            <span className="text-xs text-amber-700">
              Segera periksa bukti transfer dan kirim akses ke pembeli.
            </span>
          </div>
          <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white shrink-0">
            Proses Sekarang
          </span>
        </Link>
      )}

      {/* Metrik Utama (Clickable Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-ink/5 bg-white p-5 transition hover:border-orange/30">
          <p className="text-xs font-medium text-stone">Total Pendapatan</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
            Rp {totalRevenue.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-stone">Dari {paidOrders.length} transaksi berhasil</p>
        </div>

        <Link
          href="/dashboard/orders"
          className="group rounded-2xl border-2 border-ink/5 bg-white p-5 transition hover:border-orange hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-stone">Pesanan Lunas</p>
            <span className="text-[11px] font-bold text-green-700 bg-green-50 rounded-full px-2 py-0.5">
              {conversionRate}% sukses
            </span>
          </div>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink group-hover:text-orange-dark">
            {paidOrders.length}
          </p>
          <p className="mt-1 text-[11px] text-stone">Klik untuk melihat detail →</p>
        </Link>

        <Link
          href="/dashboard/orders"
          className={`group rounded-2xl border-2 p-5 transition hover:shadow-sm ${
            pendingOrders.length > 0
              ? "border-amber-200 bg-amber-50/50 hover:border-amber-400"
              : "border-ink/5 bg-white hover:border-orange"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-stone">Menunggu Verifikasi</p>
            {pendingOrders.length > 0 && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                Perlu aksi
              </span>
            )}
          </div>
          <p
            className={`mt-1 text-2xl font-extrabold tracking-tight ${
              pendingOrders.length > 0 ? "text-amber-700" : "text-ink"
            }`}
          >
            {pendingOrders.length}
          </p>
          <p className="mt-1 text-[11px] text-stone">Klik untuk verifikasi →</p>
        </Link>

        <Link
          href="/dashboard/orders"
          className="group rounded-2xl border-2 border-ink/5 bg-white p-5 transition hover:border-orange hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-stone">Total Pesanan Masuk</p>
            <span className="text-[11px] text-stone">Semua status</span>
          </div>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink group-hover:text-orange-dark">
            {totalOrders}
          </p>
          <p className="mt-1 text-[11px] text-stone">Klik untuk kelola tab Pesanan →</p>
        </Link>
      </div>

      {/* Grid Analitik 2 Kolom: Produk & Link Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Penjualan per Produk */}
        <div className="rounded-2xl border-2 border-ink/5 bg-white p-5">
          <div className="flex items-center justify-between border-b border-ink/5 pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Penjualan per Produk</h2>
              <p className="text-xs text-stone">Performa produk digital terlaris</p>
            </div>
            <Link
              href="/dashboard/products"
              className="text-xs font-semibold text-orange hover:underline"
            >
              Kelola Produk →
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {productSales.map((ps) => (
              <div
                key={ps.title}
                className="flex items-center justify-between rounded-xl border border-ink/5 p-3 text-sm"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-semibold text-ink truncate">{ps.title}</p>
                  <p className="text-xs text-stone">{ps.count} unit terjual</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-orange-dark">
                    Rp {ps.revenue.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[11px] text-stone">
                    {totalRevenue > 0
                      ? `${Math.round((ps.revenue / totalRevenue) * 100)}% omzet`
                      : "0%"}
                  </p>
                </div>
              </div>
            ))}
            {productSales.length === 0 && (
              <p className="py-4 text-center text-xs text-stone">Belum ada data produk.</p>
            )}
          </div>
        </div>

        {/* Performa Link Profil */}
        <div className="rounded-2xl border-2 border-ink/5 bg-white p-5">
          <div className="flex items-center justify-between border-b border-ink/5 pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Performa Tautan Profil</h2>
              <p className="text-xs text-stone">Total {totalClicks} klik dari pengunjung</p>
            </div>
            <Link
              href="/dashboard/links"
              className="text-xs font-semibold text-orange hover:underline"
            >
              Kelola Links →
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {links?.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-xl border border-ink/5 p-3 text-sm"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-semibold text-ink truncate">{link.title}</p>
                  <p className="text-xs text-stone truncate">{link.url}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="rounded-full bg-peach px-2.5 py-1 text-xs font-bold text-ink">
                    {link.click_count ?? 0} klik
                  </span>
                </div>
              </div>
            ))}
            {(!links || links.length === 0) && (
              <p className="py-4 text-center text-xs text-stone">Belum ada tautan ditambahkan.</p>
            )}
          </div>
        </div>
      </div>

      {/* Pesanan Terbaru */}
      <div className="rounded-2xl border-2 border-ink/5 bg-white p-5">
        <div className="flex items-center justify-between border-b border-ink/5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Pesanan Terbaru</h2>
            <p className="text-xs text-stone">5 transaksi terakhir yang masuk</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-orange hover:underline"
          >
            Buka Tab Pesanan →
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {recentOrders.map((o) => (
            <div
              key={o.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-ink/5 p-3 text-sm gap-2"
            >
              <div>
                <p className="font-semibold text-ink">{o.products?.title ?? "Produk"}</p>
                <p className="text-xs text-stone">
                  {o.buyer_name || "-"} · {o.buyer_email} · {new Date(o.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <p className="font-bold text-ink">Rp {o.amount_idr.toLocaleString("id-ID")}</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[o.status] ?? "bg-neutral-100 text-neutral-700"}`}
                >
                  {statusLabel[o.status] ?? o.status}
                </span>
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <p className="py-6 text-center text-xs text-stone">Belum ada pesanan masuk.</p>
          )}
        </div>
      </div>
    </div>
  );
}
