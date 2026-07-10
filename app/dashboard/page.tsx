import { createClient } from "@/lib/supabase/server";

export default async function DashboardHome() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("amount_idr, status, created_at");

  const paidOrders = orders?.filter((o) => o.status === "paid") ?? [];
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount_idr, 0);
  const totalOrders = orders?.length ?? 0;

  const stats = [
    { label: "Total pendapatan", value: `Rp ${totalRevenue.toLocaleString("id-ID")}` },
    { label: "Pesanan lunas", value: paidOrders.length },
    { label: "Total pesanan masuk", value: totalOrders },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Ringkasan</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Halo, Kang Jaund 👋</h1>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border-2 border-ink/5 bg-white p-4">
            <p className="text-xs text-stone">{s.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-stone">
        Kelola link di tab <b className="text-ink">Links</b>, kelola produk & upload file di tab{" "}
        <b className="text-ink">Produk</b>, dan lihat detail transaksi di tab{" "}
        <b className="text-ink">Pesanan</b>.
      </p>
    </div>
  );
}
