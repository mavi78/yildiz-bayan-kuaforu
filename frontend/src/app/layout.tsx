import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yıldız Bayan Kuaförü",
  description: "Randevu ve müşteri yönetim sistemi",
};

/**
 * Uygulamanın kök layout bileşeni
 *
 * @description
 * Next.js App Router için global layout. Tüm sayfalar bu layout altında render edilir.
 * - HTML dili Türkçe olarak ayarlanır
 * - Geist font değişkenleri body elementine uygulanır
 *
 * @param {React.ReactNode} children - Layout içerisinde render edilecek alt içerik
 * @returns {JSX.Element} Root layout bileşeni
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
