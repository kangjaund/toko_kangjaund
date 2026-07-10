import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toko Kang Jaund",
  description: "Link & produk digital Toko Kang Jaund",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
