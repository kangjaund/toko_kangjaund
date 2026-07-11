import type { Metadata } from "next";
import "./globals.css";
import BasicProtection from "./components/BasicProtection";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://toko-kangjaund.vercel.app";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Toko Kang Jaund — Produk Digital",
    template: "%s | Toko Kang Jaund",
  },
  description:
    "Produk digital dari Kang Jaund — download, langsung pakai. Bayar mudah lewat QRIS.",
  openGraph: {
    title: "Toko Kang Jaund — Produk Digital",
    description: "Produk digital dari Kang Jaund — download, langsung pakai.",
    url: siteUrl,
    siteName: "Toko Kang Jaund",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Toko Kang Jaund — Produk Digital",
    description: "Produk digital dari Kang Jaund — download, langsung pakai.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} />}
      </head>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <BasicProtection />
        {children}
      </body>
    </html>
  );
}
