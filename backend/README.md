# Backend - Yıldız Bayan Kuaförü API

## 📋 Genel Bakış

NestJS 10 ile geliştirilmiş RESTful API ve WebSocket servisi.

### Mimari

**Katmanlı Mimari** (Layered Architecture):
```
Domain → Repository → Service → Usecase → Controller/Gateway
```

- **Domain**: İş mantığı ve entity'ler
- **Repository**: Veri erişim katmanı (sadece bu katman Prisma kullanır)
- **Service**: İş kuralları ve orchestration
- **Usecase**: Uygulama mantığı (use case'ler)
- **Controller/Gateway**: HTTP ve WebSocket endpoint'leri

### Özellikler

- 🔐 JWT Authentication + Role-based Authorization
- 📊 Prisma ORM ile PostgreSQL
- 🚀 Redis cache ve job queue
- 📧 Multi-channel notifications (Email, SMS, WebSocket)
- 📝 Audit logging ile hash chain
- 🛡️ Helmet güvenlik başlıkları
- ⚡ Rate limiting (DDoS koruması)
- 📚 Swagger API dokümantasyonu
- ✅ Jest ile unit/integration/e2e testler

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL 15+
- Redis 7+

### Kurulum

1. **Bağımlılıkları yükle**:
```bash
pnpm install
```

2. **Environment dosyasını oluştur**:
```bash
# Root dizindeki .env.example'dan kopyala
cp ../.env.example ../.env
# .env dosyasını düzenle
```

3. **Prisma setup**:
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

4. **Development server başlat**:
```bash
pnpm dev
```

API: http://localhost:3001/api  
Swagger: http://localhost:3001/api/docs

## 📁 Dizin Yapısı

```
backend/
├── prisma/                 # Prisma schema ve migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── config/             # Konfigürasyon (env, jwt, redis)
│   ├── common/             # Paylaşılan bileşenler
│   │   ├── guards/         # JWT guard, role guard
│   │   ├── decorators/     # @Roles, @CurrentUser
│   │   ├── filters/        # Exception filters
│   │   └── pipes/          # Validation pipes
│   ├── domains/            # Domain layer (entity + value objects)
│   │   ├── auth/
│   │   ├── appointments/
│   │   ├── customers/
│   │   ├── payments/
│   │   ├── notifications/
│   │   └── audit/
│   ├── repositories/       # Repository layer (Prisma access)
│   ├── services/           # Service layer (business logic)
│   ├── usecases/           # Usecase layer (application logic)
│   │   ├── auth/
│   │   ├── appointments/
│   │   ├── customers/
│   │   ├── payments/
│   │   └── reports/
│   ├── modules/            # NestJS modules (controllers)
│   │   ├── auth/
│   │   ├── appointments/
│   │   ├── customers/
│   │   ├── payments/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── working-hours/
│   │   └── audit/
│   ├── jobs/               # Background jobs (BullMQ)
│   │   ├── audit-archive.job.ts
│   │   ├── notification-retry.job.ts
│   │   └── veresiye-reminder.job.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── contract/           # Contract tests (API schema)
│   ├── integration/        # Integration tests (repo + DB)
│   ├── e2e/                # End-to-end tests
│   └── unit/               # Unit tests (services)
└── dist/                   # Build output
```

## 🧪 Test

```bash
# Tüm testler
pnpm test

# Watch mode
pnpm test:watch

# Coverage raporu
pnpm test:cov

# E2E testler
pnpm test:e2e
```

## 📝 Kod Standartları

### Turkish JSDoc

**Constitution gereksinimi**: Tüm fonksiyon ve class'lar Türkçe JSDoc ile dokümante edilmelidir.

```typescript
/**
 * Kullanıcı randevusunu oluşturur
 * 
 * @description
 * Randevu oluşturma işlemini gerçekleştirir:
 * - Çakışma kontrolü yapar
 * - Çalışma saatleri içinde olduğunu doğrular
 * - Bildirim gönderir
 * 
 * @param {CreateAppointmentDto} dto - Randevu bilgileri
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<Appointment>} Oluşturulan randevu
 * @throws {ConflictException} Çakışma varsa
 */
async createAppointment(dto: CreateAppointmentDto, userId: string): Promise<Appointment> {
  // ...
}
```

### Katman İzolasyonu

- ✅ **Prisma sadece Repository katmanında** kullanılabilir
- ✅ **Controller'lar doğrudan Service çağırmaz**, Usecase kullanır
- ✅ **Domain modelleri external dependency'lere bağımlı olmaz**

## 🔐 Güvenlik

- JWT tokens ile authentication
- Role-based authorization (Admin, Staff, Customer)
- Rate limiting: 100 req/60s
- Helmet security headers
- CORS yapılandırması
- Input validation (class-validator)

## 📚 API Dokümantasyonu

Development ortamında Swagger UI: http://localhost:3001/api/docs

## 🔧 Geliştirme

```bash
# Format code
pnpm format

# Lint
pnpm lint

# Build
pnpm build

# Production start
pnpm start:prod
```

## 📄 Lisans

UNLICENSED - Private project

---

**Version**: 0.1.0  
**NestJS**: 10.3.0  
**Node.js**: >= 20.0.0

