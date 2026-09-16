import Link from "next/link";
import LogoutButton from "./logout-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/dashboard/links", label: "Links" },
  { href: "/dashboard/products", label: "Produk" },
  { href: "/dashboard/orders", label: "Pesanan" },
  { href: "/dashboard/settings", label: "Pengaturan" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/5 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-sm font-extrabold tracking-tight text-orange">
            DASHBOARD
          </span>
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium text-stone transition hover:bg-peach hover:text-orange-dark cursor-pointer"
              >
                <span>{tab.label}</span>
                {tab.href === "/dashboard/orders" && (pendingCount ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
