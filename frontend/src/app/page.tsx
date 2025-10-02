import Link from "next/link";
import React from "react";

/**
 * Ana sayfa bileşeni
 *
 * @returns {React.ReactNode} Ana sayfa içeriği
 */
export default function HomePage(): React.ReactNode {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-white px-6 py-16 text-center text-neutral-900">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold sm:text-5xl">Yıldız Bayan Kuaförü Randevu Sistemi</h1>
        <p className="max-w-2xl text-base text-neutral-600 sm:text-lg">
          Bu uygulama, salon müşterileri ve personeli için randevu yönetimi, ödeme takibi,
          bildirimler ve raporlama gibi özellikleri modern ve kolay kullanılabilir bir arayüz ile
          sunar.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-neutral-500">
        <Link
          href="/book"
          className="rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800"
        >
          Misafir Randevusu Oluştur
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 hover:border-neutral-300"
        >
          Giriş Yap (Admin / Staff / Müşteri)
        </Link>
      </div>
    </main>
  );
}
