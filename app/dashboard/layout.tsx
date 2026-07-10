import Link from "next/link";
import LogoutButton from "./logout-button";

const tabs = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/dashboard/links", label: "Links" },
  { href: "/dashboard/products", label: "Produk" },
  { href: "/dashboard/orders", label: "Pesanan" },
  { href: "/dashboard/settings", label: "Pengaturan" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-stone transition hover:bg-peach hover:text-orange-dark"
              >
                {tab.label}
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
