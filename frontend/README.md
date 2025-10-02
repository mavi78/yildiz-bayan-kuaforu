# Frontend - Yıldız Bayan Kuaförü Web Uygulaması

## 🎨 Genel Bakış

Next.js 15 App Router ile geliştirilmiş frontend uygulaması. Salon müşterileri, çalışanları ve yöneticileri için modern, hızlı ve erişilebilir web deneyimi sunar.

### Ana Özellikler

- ✅ **App Router** (Next.js 15)
- ✅ **Shadcn/UI + Tailwind CSS v4** ile modern UI
- ✅ **Zustand** ile client-side state yönetimi
- ✅ **TanStack Query 5** ile server state senkronizasyonu
- ✅ **React Hook Form + Zod** ile form validasyonu
- ✅ **Socket.io client** (ileride eklenecek) ile gerçek zamanlı bildirimler
- ✅ **Türkçe JSDoc** ve **WCAG 2.1 AA** uyumluluğu

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Kurulum

```bash
# Root dizininde (pnpm workspaces)
pnpm install

# Frontend bağımlılıklarını güncellemek için
pnpm --filter frontend install

# Development sunucusunu başlat
pnpm --filter frontend dev
```

Tarayıcıdan şu adresi açın: http://localhost:3000

> Backend API varsayılan olarak http://localhost:3001 üzerinde çalışır.

## 📁 Dizin Yapısı

```
frontend/
├── public/                     # Statik dosyalar (favicon, og image, logos)
├── src/
│   ├── app/                    # App Router sayfaları
│   │   ├── (auth)/             # Auth layout + sayfalar
│   │   ├── (admin)/            # Admin dashboard
│   │   ├── (staff)/            # Çalışan paneli
│   │   ├── (customer)/         # Müşteri paneli
│   │   └── (public)/           # Misafir randevu ve takip
│   ├── components/             # UI bileşenleri (Shadcn uyumlu)
│   ├── hooks/                  # Custom React hook'ları
│   ├── lib/                    # API client, util fonksiyonları
│   ├── stores/                 # Zustand store'ları
│   ├── types/                  # Tip tanımları
│   └── styles/                 # Global stiller
├── eslint.config.mjs           # Eslint yapılandırması (Next.js 15 uyumlu)
├── next.config.ts              # Next.js yapılandırması
├── tsconfig.json               # TypeScript yapılandırması
├── postcss.config.mjs          # Tailwind/PostCSS config
└── README.md                   # Bu dosya
```

> Not: Bazı dizinler (örn. hooks/, stores/) ilerleyen görevlerde oluşturulacak.

## 🧪 Kod Kalitesi ve Test

```bash
# ESLint ile lint
pnpm --filter frontend lint

# Unit/component testleri (ileride eklenecek)
pnpm --filter frontend test
```

**Erişilebilirlik** hedefi: Lighthouse Accessibility ≥ 90  
**SEO** hedefi: Lighthouse SEO ≥ 90

## 📦 Bağımlılıklar

### Runtime

- `next@15` - App Router
- `react@19`, `react-dom@19`
- `zustand@5`
- `@tanstack/react-query@5`
- `@hookform/resolvers`, `react-hook-form`, `zod`

### Development

- `typescript@5`
- `eslint@8` (Next.js önerilmektedir)
- `@typescript-eslint/eslint-plugin`, `parser`
- `tailwindcss@4`

## 🔒 Güvenlik

- `.env` dosyalarındaki sensitive verileri paylaşmayın
- `NEXT_PUBLIC_*` prefix'i sadece public değerler için kullanılmalı
- Audit raporları düzenli kontrol edilmeli (`pnpm audit`)
  - Not: Şu an `tmp@0.2.3` paketinden dolayı **low** seviyede bir uyarı bulunmaktadır (Nest CLI bağımlılığı). Prisma/Nest CLI güncellendiğinde otomatik çözülecektir.

## 🛠️ Geliştirme Çalışma Akışı

1. **Yeni bileşen** eklemeden önce Shadcn CLI kullanın:
   ```bash
   pnpm dlx shadcn add button
   ```
2. **State** yönetimi için Zustand store'ları `src/stores/` klasöründe tanımlayın.
3. **API Çağrıları** için `src/lib/api.ts` dosyasında fetch/axios wrapper oluşturun (T081).
4. **Formlar** için RHF + Zod kombinasyonu kullanın (validation backend ile uyumlu).
5. **Socket** entegrasyonunu `src/lib/socket.ts` üzerinden gerçekleştirin (T075 sonrası).

## 📚 Dokümantasyon

- [Feature Spec](../specs/001-appointment-customer-management/spec.md)
- [Implementation Plan](../specs/001-appointment-customer-management/plan.md)
- [Tasks](../specs/001-appointment-customer-management/tasks.md)

## ℹ️ Notlar

- Proje pnpm workspaces kullanıyor (`pnpm-workspace.yaml`).
- Backend API için `.env` dosyasındaki `NEXT_PUBLIC_API_URL` değerini güncellemeyi unutmayın.
- Shadcn UI bileşenleri Tailwind v4 ile uyumlu çalışır.
- Tüm kodlar anayasa gereği Türkçe JSDoc ile dokümante edilecek.

## 🧭 Sonraki Adımlar

- T081: API client oluşturma
- T082: TanStack Query provider kurulumu
- T083: Auth store (Zustand)
- T084: Query hook'ları

---

**Version**: 0.1.0  
**Next.js**: 15.5.4  
**Tailwind**: 4.x  
**Yarn**: pnpm (workspaces)
