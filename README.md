# Yıldız Bayan Kuaförü - Appointment & Customer Management Suite

## 📋 Proje Hakkında

Yıldız Bayan Kuaförü için geliştirilmiş randevu ve müşteri yönetim sistemi.

### Özellikler

- 🗓️ **Randevu Yönetimi**: Online ve offline randevu oluşturma, çakışma kontrolü, takip sistemi
- 👥 **Müşteri Yönetimi**: Kayıtlı ve misafir müşteri desteği, davet sistemi
- 💰 **Ödeme Takibi**: Nakit, banka transferi, POS kart, veresiye ödemeleri
- 📧 **Çok Kanallı Bildirim**: E-posta, SMS, gerçek zamanlı bildirimler
- 📊 **Admin Dashboard**: Grafikler, raporlar, CSV/XLSX dışa aktarma
- 🔒 **Güvenlik**: JWT authentication, role-based authorization, audit log
- ♿ **Erişilebilirlik**: WCAG 2.1 AA uyumlu
- 🎨 **Modern UI**: Next.js 15 App Router, Shadcn/UI, Tailwind CSS

## 🏗️ Teknoloji Stack

### Backend

- **Framework**: NestJS 10
- **Database**: PostgreSQL 15+ (Prisma ORM)
- **Cache**: Redis 7+
- **Authentication**: JWT with role-based guards
- **Notifications**: Nodemailer (Gmail), İleti Merkezi (SMS), Socket.io

### Frontend

- **Framework**: Next.js 15 (App Router)
- **UI Library**: Shadcn/UI + Tailwind v4
- **State Management**: Zustand (client state), TanStack Query (server state)
- **Forms**: React Hook Form + Zod validation

### Architecture

- Katmanlı mimari: Domain → Repository → Service → Usecase → Controller/UI
- Monorepo yapısı (pnpm workspaces)

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose (local development için)
- PostgreSQL 15+ (production için)
- Redis 7+ (production için)

### Kurulum

1. **Repository'yi klonlayın**:

   ```bash
   git clone <repository-url>
   cd yildiz-bayan-kuaforu
   ```

2. **Bağımlılıkları yükleyin**:

   ```bash
   pnpm install
   ```

3. **Environment dosyasını oluşturun**:

   ```bash
   cp .env.example .env
   # .env dosyasını düzenleyin
   ```

4. **Docker ile veritabanı başlatın** (local development):

   ```bash
   docker-compose up -d
   ```

5. **Prisma migration çalıştırın**:

   ```bash
   cd backend
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

6. **Uygulamayı başlatın**:

   ```bash
   # Root dizininde
   pnpm dev

   # Backend: http://localhost:3001
   # Frontend: http://localhost:3000
   ```

## 📁 Proje Yapısı

```
yildiz-bayan-kuaforu/
├── backend/                 # NestJS backend
│   ├── prisma/             # Prisma schema & migrations
│   ├── src/                # Kaynak kodlar
│   │   ├── config/         # Configuration
│   │   ├── common/         # Shared guards, decorators, filters
│   │   ├── domains/        # Domain models
│   │   ├── repositories/   # Data access layer
│   │   ├── services/       # Business logic
│   │   ├── usecases/       # Application logic
│   │   ├── modules/        # NestJS modules (controllers)
│   │   └── jobs/           # Background jobs (BullMQ)
│   └── test/               # Test files
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities
│   │   ├── stores/         # Zustand stores
│   │   └── hooks/          # Custom hooks
│   └── public/             # Static assets
├── shared/                 # Shared types (optional)
│   └── types/              # TypeScript types
└── specs/                  # Feature specifications
    └── 001-appointment-customer-management/
        ├── spec.md         # Feature specification
        ├── plan.md         # Implementation plan
        ├── tasks.md        # Task breakdown
        ├── data-model.md   # Database schema
        └── research.md     # Technical research
```

## 🧪 Test

```bash
# Tüm testler
pnpm test

# Backend testleri
pnpm --filter backend test

# Frontend testleri
pnpm --filter frontend test

# Coverage raporu
pnpm --filter backend test:cov
```

## 📝 Dokümantasyon

Detaylı dokümantasyon için `specs/` dizinine bakın:

- [Feature Specification](specs/001-appointment-customer-management/spec.md)
- [Implementation Plan](specs/001-appointment-customer-management/plan.md)
- [Tasks Breakdown](specs/001-appointment-customer-management/tasks.md)
- [Data Model](specs/001-appointment-customer-management/data-model.md)
- [Quickstart Guide](specs/001-appointment-customer-management/quickstart.md)

## 🔒 Güvenlik

- Tüm API endpoint'leri JWT ile korunur
- Role-based authorization (Admin, Staff, Customer)
- Rate limiting (@nestjs/throttler)
- Helmet.js ile güvenlik headers
- Audit log ile tüm kritik işlemler kaydedilir

## 📄 Lisans

Bu proje özel mülkiyettedir ve lisanssızdır (UNLICENSED).

## 👥 Katkıda Bulunanlar

Yıldız Bayan Kuaförü Development Team

---

**Version**: 0.1.0  
**Status**: 🚧 Development  
**Branch**: `001-appointment-customer-management`  
**Constitution**: v1.0.0
