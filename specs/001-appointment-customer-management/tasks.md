# Tasks: Appointment & Customer Management Suite

**Feature**: `001-appointment-customer-management`
**Kaynak dokümanlar**: `spec.md`, `plan.md`, `data-model.md`, `research.md`, `quickstart.md`
**Varsayım**: Tüm görevler backend açısından spec senaryolarına tam uyum sağlayacak şekilde yürütülecek; her görev kendi doğrulama testini içerir. Testsiz görev tamamlanmış sayılmaz.

---

## Milestone 1 – Altyapı ve Test İskeleleri (T001–T010)

- [x] **T001** Proje bağımlılıklarını ve workspace yapılandırmasını doğrula.
  - Adımlar: `pnpm install`, workspace link'lerini ve `pnpm-workspace.yaml` içeriğini plan.md ile karşılaştır.
  - Test: `pnpm --filter backend run lint` ve `pnpm --filter backend test -- --help` komutlarının hatasız çalıştığını doğrula.

- [x] **T002** Backend env yapılandırmasını gözden geçir (`backend/src/config`).
  - Adımlar: `EnvConfig` sınıfının plan.md'de listelenen değişkenleri (DATABASE_URL, REDIS_HOST, JWT_SECRET vb.) beklediğini ve validation kurallarını kontrol et.
  - Test: `pnpm --filter backend exec ts-node src/config/env.config.spec.ts` tarzı unit/spec veya mevcut test dosyasıyla env validation'ını çalıştır (gerekirse yeni test yaz).

- [x] **T003** Jest test altyapısını senaryoya uygun hale getir (`backend/jest.config.js`).
  - Adımlar: ts-jest dönüşümleri, path alias'ları, project bazlı yapı plan.md'deki beklentiyle aynı mı kontrol et.
  - Test: `SKIP_DB_SETUP=true pnpm --filter backend test -- --selectProjects unit --runInBand` komutunun yeşil dönmesini sağla (gerekirse mock/test düzenlemeleri yap).

- [x] **T004** Prisma client yapılandırmasını ve test DB yardımcılarını senaryoya göre gözden geçir.
  - Adımlar: `prisma/schema.prisma` datasource/generator tanımları, `test/helpers/db-helper.ts` fonksiyonları single-location senaryoya uygun mu incele.
  - Test: `pnpm --filter backend exec prisma validate` ve `SKIP_DB_SETUP=true pnpm --filter backend test -- --runTestsByPath test/helpers/db-helper.spec.ts` (yoksa oluştur).

- [x] **T005** Backend seed ve Docker compose dosyalarını doğrula.
  - Adımlar: `docker-compose.yml` servisleri (Postgres, Redis) plan.md ile uyumlu mu, `prisma/seed.ts` planlanan örnek verileri içeriyor mu kontrol et.
  - Test: `docker compose up -d` ardından `pnpm --filter backend exec prisma db push --force-reset && pnpm --filter backend exec prisma db seed` komutları sorunsuz tamamlanmalı.

- [x] **T006** Quickstart dokümanındaki test iş akışlarının iskelelerini hazırla.
  - Adımlar: `quickstart.md`deki 3 akışı incele, her biri için hangi komut/test dosyası çalışacak belirle.
  - Test: Her akış için Jest'te boş iskelet test veya e2e betiği oluştur ve `SKIP_DB_SETUP=true pnpm --filter backend test -- --runTestsByPath test/quickstart/flow1.spec.ts` benzeri komutla koştur.

- [x] **T007** Logger ve global exception handling yapılarını doğrula (`backend/src/common`).
  - Adımlar: `filters`, `interceptors`, `pipes` içerikleri FR gereksinimlerini destekliyor mu kontrol et.
  - Test: İlgili unit testleri çalıştır (`pnpm --filter backend test -- --runTestsByPath test/unit/bootstrap.spec.ts`) ve gerekirse genişlet.

- [x] **T008** Swagger/OpenAPI jenerasyonunun mevcut durumunu incele (`main.ts` ve ilgili modüller).
  - Adımlar: Swagger modalitesi plan.md ile uyumlu mu (Bearer auth, tag'ler).
  - Test: `pnpm --filter backend exec ts-node tools/generate-swagger.ts` gibi bir script varsa çalıştır; yoksa `/swagger-json` e2e testi ekle.

- [x] **T009** Redis bağlantı yapılandırmasını doğrula (`backend/src/jobs/queue.config.ts`).
  - Adımlar: Default değerler, parola/dB fallback'leri specs'deki FR-043/FR-047a ile uyumlu mu bak.
  - Test: `SKIP_DB_SETUP=true pnpm --filter backend test -- --runTestsByPath test/unit/redis-connections.spec.ts` yeşil olmalı; eksikler varsa düzelt.

- [x] **T010** Notification kanalları için temel sağlık kontrollerini gözden geçir (`NotificationService`, `email.channel`, `sms.channel`).
  - Adımlar: `NotificationService` planmd/taslakta belirtilen multi-channel davranışı destekliyor mu kontrol et.
  - Test: `pnpm --filter backend test -- --runTestsByPath src/services/notifications/channels/email.channel.spec.ts` ve SMS için benzeri.

---

## Milestone 2 – Auth & Invitation Domain (T011–T020)

- [x] **T011** User & Invitation Prisma modellerini spec'teki data-model ile kıyasla.
  - Test: `pnpm --filter backend exec prisma format && pnpm --filter backend exec prisma validate`.

- [x] **T012** UserRepository & InvitationRepository davranışlarını doğrula.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/repositories/user.repository.spec.ts test/unit/repositories/invitation.repository.spec.ts` (gerekirse yaz).

- [ ] **T013** Auth servisleri (`AuthService`, `AuthController`, guards) FR-001…FR-009 ile uyumlu mu kontrol et.
  - Test: Unit + e2e (`pnpm --filter backend test -- --runTestsByPath test/unit/controllers/auth.controller.spec.ts test/e2e/auth.e2e-spec.ts`).

- [ ] **T014** Register ve Login usecase’lerini FR gereksinimlerine göre gözden geçir.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/usecases/auth/*.spec.ts`.

- [ ] **T015** Davet akışı (`ConvertGuestToRegisteredUsecase`, `InvitationsController`) FR-021/FR-022 ile uyumlu mu.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/usecases/customers/convert-guest-to-registered.usecase.spec.ts test/unit/controllers/invitations.controller.spec.ts`.

- [ ] **T016** JWT stratejileri ve rol guard’larını kontrol et (`RolesGuard`, `CurrentUser` decorator).
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/common/roles-guard.spec.ts` (gerekirse ekle).

- [ ] **T017** Refresh token / logout mekanizmalarının audit’lenmesini incele.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/auth-token.spec.ts`.

- [ ] **T018** Auth modülü Swagger dökümantasyonu FR-005 ile uyumlu mu.
  - Test: Swagger e2e testi (login/register endpointlerinin 200/401 cevaplarını doğrula).

- [ ] **T019** Auth alanları için audit log tetiklemeleri (login başarısız, davet oluşturma) kontrol et.
  - Test: Audit repository unit testleri (`test/unit/repositories/audit-log.repository.spec.ts`).

- [ ] **T020** Auth domaininde quickstart Flow-0 (davet → kayıt → login) senaryosunu uçtan uca test et.
  - Test: Yeni bir e2e testi yaz (`test/e2e/auth-invitation.flow.spec.ts`) ve `pnpm --filter backend test -- --selectProjects e2e --runTestsByPath ...` ile çalıştır.

---

## Milestone 3 – Appointment & Working Hours (T021–T036)

- [ ] **T021** Appointment Prisma modeli ve ilişkilerini data-model.md ile karşılaştır.
  - Test: `pnpm --filter backend exec prisma db pull --print` ile şema incele; unit testlerde `AppointmentRepository` create/find metodlarını kapsa.

- [ ] **T022** AppointmentRepository metotlarını (findConflicts, findByTrackingCode, updateStatus) FR-011…FR-020’a göre doğrula.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/repositories/appointment.repository.spec.ts` (yoksa oluştur).

- [ ] **T023** AppointmentService iş kuralları: çalışma saati, conflict, tracking code üretimi.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/appointment.service.spec.ts`.

- [ ] **T024** CreateGuestAppointment / CreateRegisteredAppointment usecase’lerini FR-013/FR-014’e göre kontrol et.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/usecases/appointments/create-guest-appointment.usecase.spec.ts test/unit/usecases/appointments/create-registered-appointment.usecase.spec.ts`.

- [ ] **T025** Manual appointment usecase’ini (staff tarafından walk-in) FR-025/FR-026 ile karşılaştır.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/usecases/appointments/create-manual-appointment.usecase.spec.ts`.

- [ ] **T026** Appointment approval/cancel/complete akışlarını (`AppointmentActionsController`) FR-027…FR-031 ile uyumlu hale getir.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/controllers/appointment-actions.controller.spec.ts` ve gerekirse yeni testler ekle.

- [ ] **T027** AppointmentController’ın müşteri/rol bazlı filtrelemelerini FR-018/FR-019’a göre tamamla (TODO’ları gider).
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/controllers/appointments.controller.spec.ts` + e2e.

- [ ] **T028** Tracking code public endpoint ve SMS resend akışını FR-015’e göre doğrula.
  - Test: Public endpoint için e2e testi (`test/e2e/appointments-tracking.spec.ts`).

- [ ] **T029** WorkingHours & SpecialWorkingDay repository/service katmanlarını FR-054…FR-059’a göre kontrol et.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/repositories/working-hours.repository.spec.ts test/unit/repositories/special-working-day.repository.spec.ts`.

- [ ] **T030** Working hours yönetim controller’larını (GET/PUT özel gün ekleme vb.) doğrula.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/controllers/working-hours.controller.spec.ts` ve e2e.

- [ ] **T031** Quickstart Flow-1: misafir randevu oluşturma → staff onayı → tracking code doğrulaması.
  - Test: `pnpm --filter backend test -- --selectProjects e2e --runTestsByPath test/e2e/flow-guest-booking.spec.ts`.

- [ ] **T032** Appointment alanında kullanılan cron/availability hesaplamalarını spec’e göre stres test et.
  - Test: Jest’te sınır durumları (açılış kapanış ucu, aynı anda iki conflict) için ek testler oluştur.

- [ ] **T033** Appointment event’lerinin NotificationService ile entegrasyonunu doğrula.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/notifications/notification.service.spec.ts`.

- [ ] **T034** Appointment domainindeki audit log tetiklemelerini kontrol et (create/approve/cancel).
  - Test: Audit log repository mock’layarak unit test ekle (`test/unit/usecases/appointments/audit.integration.spec.ts`).

- [ ] **T035** Appointment raporlama sorgularının (dashboard aggregate) plan.md’deki performans hedeflerine uyumunu test et.
  - Test: Integration test (yüksek hacimli örnek data ile 3s p95 altında).

- [ ] **T036** Appointment modülünün Swagger/OpenAPI kontratını güncelle ve kontrat testini yaz.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/contract/appointments.contract.spec.ts`.

---

## Milestone 4 – Customer, Review & Payment Domainleri (T037–T058)

- [ ] **T037** Customer Prisma modeli ve istatistik alanlarını data-model ile karşılaştır.
  - Test: `pnpm --filter backend exec prisma validate` + repository unit testi.

- [ ] **T038** CustomerService’in misafir/ kayıtlı akışlarını FR-019a, FR-021, FR-022’ye göre doğrula.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/customer.service.spec.ts`.

- [ ] **T039** CustomerController CRUD ve invite endpoint’lerini kontrol et.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/controllers/customers.controller.spec.ts` + e2e.

- [ ] **T040** Review domain’i (repository/service/controller) FR-032…FR-036 ile uyumlu mu kontrol et.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/controllers/reviews.controller.spec.ts`.

- [ ] **T041** Review oluşturma akışının müşteri yetkilendirmesini doğrula (yalnızca kayıtlı müşteriler).
  - Test: e2e testi (`test/e2e/reviews-create.flow.spec.ts`).

- [ ] **T042** Payment Prisma modeli ve repository’sini FR-037…FR-042b’ye göre incele.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/repositories/payment.repository.spec.ts`.

- [ ] **T043** PaymentService iş kurallarını (veresiye alanları, audit trail) doğrula.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/payment.service.spec.ts`.

- [ ] **T044** PaymentController endpoint’lerini ve role bazlı erişimleri kontrol et.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/controllers/payments.controller.spec.ts` + e2e.

- [ ] **T045** Veresiye ödeme hatırlatma bildirim zincirinin NotificationService ile entegrasyonunu gözden geçir.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/notifications/veresiye-reminder.spec.ts`.

- [ ] **T046** Payment event’leri için audit log tetiklemelerini doğrula.
  - Test: Audit log integration testi.

- [ ] **T047** Customer + Payment ortak raporlama query’lerinin performansını ölç.
  - Test: Integration test (örn. `test/integration/reports/payments-report.spec.ts`).

- [ ] **T048** Payment domain Swagger kontratını güncelle ve kontrat testini yaz.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/contract/payments.contract.spec.ts`.

- [ ] **T049** Customer domain Swagger kontrat testi.
  - Test: `test/contract/customers.contract.spec.ts`.

- [ ] **T050** Quickstart Flow-2: kayıtlı müşteri → randevu → ödeme → review.
  - Test: `pnpm --filter backend test -- --selectProjects e2e --runTestsByPath test/e2e/flow-registered-customer.spec.ts`.

- [ ] **T051** Customer arama (telefon/ad-soyad) senaryosu için repository ve controller testleri ekle.
  - Test: `test/unit/controllers/customers.controller.spec.ts` içinde arama varyantını doğrula.

- [ ] **T052** Review silme işleminin audit log ve notification gereksinimlerini karşılamasını sağla.
  - Test: Unit + integration.

- [ ] **T053** Customer stats (totalAppointments, totalSpent) güncelleme akışını randevu & ödeme tamamlanmalarıyla entegre et.
  - Test: `test/unit/services/customer-stats.integration.spec.ts`.

- [ ] **T054** Payment veresiye hatırlatma job’unun DB sorgularını doğrula (due date filtreleri).
  - Test: `test/unit/jobs/veresiye-reminder.job.spec.ts`.

- [ ] **T055** Customer deletion kurallarını (aktif randevu varsa engelle) e2e’de test et.
  - Test: `test/e2e/customers-delete.spec.ts`.

- [ ] **T056** Customer ve payment domainleri için seed verilerini güncelle (plan’daki örnek kullanıcılar ile).
  - Test: `pnpm --filter backend exec prisma db seed` sonrası e2e testleri yeşil dönmeli.

- [ ] **T057** Customer portalı için API rate limit/throttler kurallarını doğrula (FR-010).
  - Test: Rate limit unit testi.

- [ ] **T058** Customer/payment domainleri için smoke test script’i oluştur (`scripts/test-customer-payment.sh`).
  - Test: Script’i çalıştır (`bash scripts/test-customer-payment.sh`) ve sonuç raporla.

---

## Milestone 5 – Notification, Audit, Reports & Background Jobs (T059–T080)

- [ ] **T059** Notification Prisma modeli ve repository’sini data-model ile karşılaştır.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/repositories/notification.repository.spec.ts`.

- [ ] **T060** NotificationService’in FR-043…FR-048 gereksinimlerini doğrula (multi-channel, retry, failure logging).
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/services/notifications/notification.service.spec.ts`.

- [ ] **T061** EmailChannel içeriklerinin FR’den türetilen Türkçe metinlerle uyumunu sağla.
  - Test: `pnpm --filter backend test -- --runTestsByPath src/services/notifications/channels/email.channel.spec.ts`.

- [ ] **T062** SmsChannel için benzer testleri oluştur (DLR statüleri, mesaj metinleri).
  - Test: `src/services/notifications/channels/sms.channel.spec.ts`.

- [ ] **T063** NotificationsGateway (Socket.io) olaylarını ve auth kontrolünü doğrula.
  - Test: `test/unit/gateways/notifications.gateway.spec.ts` + e2e.

- [ ] **T064** Notification ayarlarının admin tarafından yapılandırılmasını (gelecekteki SystemConfig) mock’la ve test et.
  - Test: configuration service unit testi.

- [ ] **T065** Notification gönderimlerinin audit log ile entegrasyonunu kontrol et.
  - Test: `test/unit/services/notifications/notification-audit.spec.ts`.

- [ ] **T066** AuditLog Prisma modeli ve repository’sini data-model ile kıyasla.
  - Test: `pnpm --filter backend test -- --runTestsByPath test/unit/repositories/audit-log.repository.spec.ts`.

- [ ] **T067** AuditService’in FR-061…FR-065 gereksinimlerini doğrula (hash chain, JSONL arşiv).
  - Test: `test/unit/services/audit.service.spec.ts`.

- [ ] **T068** Audit arşiv cron job’unu (T079’da tanımlı) unit/integration testleriyle doğrula.
  - Test: `test/unit/jobs/audit-archive.job.spec.ts`.

- [ ] **T069** Reports domain (appointments, payments raporları) için repository/service katmanlarını kontrol et.
  - Test: `test/unit/services/reports.service.spec.ts` + integration.

- [ ] **T070** ReportsController endpoint’lerini FR-049…FR-053’e göre doğrula.
  - Test: `test/unit/controllers/reports.controller.spec.ts` + e2e.

- [ ] **T071** Rapor export (CSV/XLSX) fonksiyonlarını test et.
  - Test: `test/unit/services/reports-export.spec.ts` (dosya içerik assertion’ı).

- [ ] **T072** Notification queue job’larının Worker entegrasyonunu doğrula (`notification.processor.ts`).
  - Test: `test/unit/jobs/notification.processor.spec.ts`.

- [ ] **T073** QueueManager yaşam döngüsü (`OnModuleInit/Destroy`) testleri.
  - Test: `test/unit/jobs/queue-manager.spec.ts`.

- [ ] **T074** Redis bağlantısı için graceful shutdown senaryolarını test et.
  - Test: Integration test (Redis unavailable fallback).

- [ ] **T075** Notification failure raporlama (FR-047) için repository/service akışını doğrula.
  - Test: `test/unit/services/notifications/notification-failure-report.spec.ts`.

- [ ] **T076** Notification health check endpoint’lerini test et (email/sms/socket status).
  - Test: `test/unit/controllers/notifications-health.controller.spec.ts`.

- [ ] **T077** BullMQ queue konfigürasyon testleri (retry strategy, job cleanup).
  - Test: `test/unit/jobs/queue-config.spec.ts`.

- [ ] **T078** Notification Processor job e2e testi (mock channel’larla).
  - Test: `test/e2e/jobs/notification-processor.spec.ts`.

- [ ] **T079** Audit archive job e2e testi (dummy audit log verisi ile).
  - Test: `test/e2e/jobs/audit-archive.spec.ts`.

- [ ] **T080** Veresiye reminder job e2e testi.
  - Test: `test/e2e/jobs/veresiye-reminder.spec.ts`.

---

## Milestone 6 – Backend Finalizasyon & Quickstart (T081–T090)

*Frontend milestone’ları başlamadan önce backend’in tamamen hazır olduğundan emin olmak için ek doğrulamalar.*

- [ ] **T081** Quickstart Flow-3: manuel randevu + ödeme + hatırlatma senaryosunu e2e’de çalıştır.
  - Test: `pnpm --filter backend test -- --selectProjects e2e --runTestsByPath test/e2e/flow-manual-appointment.spec.ts`.

- [ ] **T082** Tüm Swagger kontrat testlerini tek seferde koştur (`test/contract/**/*`).
  - Test: `pnpm --filter backend test -- --runTestsByPath test/contract`.

- [ ] **T083** Unit + integration + e2e suite’lerini paralel çalıştırıp raporla.
  - Test: `pnpm --filter backend test` (tüm projektler yeşil).

- [ ] **T084** Seed + e2e kombinasyonunu CI ortamı simülasyonunda dene (`scripts/ci-backend-smoke.sh`).
  - Test: Script çalıştır.

- [ ] **T085** Plan dokümanındaki başarı ölçütlerini (rapor sorgusu <3s, Notification <100ms) manuel/test kodlarıyla ölç.
  - Test: Benchmark testleri.

- [ ] **T086** Audit arşiv dosyalarını oluşturup hash zincirini doğrula (manuel/otomasyon).
  - Test: `pnpm --filter backend exec ts-node scripts/verify-audit-archive.ts`.

- [ ] **T087** Notification kanallarının sağlık kontrol script’ini çalıştır (`scripts/test-notifications.sh`).
  - Test: Script çıktısı yeşil.

- [ ] **T088** Tüm domain modüllerinin NestJS module bağımlılıklarını gözden geçir (AppModule). Dokümana uygun mu.
  - Test: `pnpm --filter backend exec ts-node scripts/verify-modules.ts`.

- [ ] **T089** Quickstart.md’de listelenen tüm CLI komutlarını (dev, test, seed) sırayla koştur ve sonuç raporu oluştur.
  - Test: Liste halinde çıktıları kaydet.

- [ ] **T090** Backend release notu draft’ı hazırlayıp implementasyonun spec.md’deki tüm FR’leri kapsadığını doğrula (checklist).
  - Test: FR-001…FR-071 için insan gözetimli checklist + gerekiyorsa otomatik Assertion (örn. `scripts/check-fr-coverage.ts`).

---

Bu görev listesi sırasıyla tamamlandığında backend tarafının senaryo ve plan dokümanlarıyla tam uyumlu, kapsamlı testlerle doğrulanmış olması hedeflenmektedir.
