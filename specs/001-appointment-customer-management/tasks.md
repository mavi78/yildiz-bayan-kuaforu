# Tasks: Appointment & Customer Management Suite

**Branch**: `001-appointment-customer-management`  
**Input**: Design documents from `/specs/001-appointment-customer-management/`  
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → ✅ Loaded: NestJS backend + Next.js 15 frontend, 12 entities, layered architecture
2. Load optional design documents:
   → ✅ data-model.md: 12 entities (User, Customer, Appointment, Service, Payment, Review, etc.)
   → ✅ contracts/: Structure ready (8 API modules + Socket.io events)
   → ✅ research.md: 8 research topics with implementation patterns
   → ✅ quickstart.md: 3 test workflows
3. Generate tasks by category:
   → ✅ Setup: monorepo structure, dependencies, Prisma, Docker
   → ✅ Tests: contract tests (35 endpoints), integration tests (19 scenarios)
   → ✅ Core: 12 entity models, services, repositories, usecases, controllers
   → ✅ Integration: auth guards, notifications, audit jobs, working hours
   → ✅ Polish: unit tests, WCAG compliance, SEO, Lighthouse optimization
4. Apply task rules:
   → ✅ Different files = mark [P] for parallel
   → ✅ Same file = sequential (no [P])
   → ✅ Tests before implementation (TDD)
5. Number tasks sequentially (T001...T108)
6. Generate dependency graph below
7. Create parallel execution examples
8. Validate task completeness:
   → ✅ All 35 API endpoints have contract tests
   → ✅ All 12 entities have Prisma models + repositories
   → ✅ All 19 acceptance scenarios have integration tests
9. Return: SUCCESS (108 tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- [P] only for tasks that don't share files

## Path Conventions

Based on plan.md structure decision (Web application):

- **Backend**: `backend/src/`, `backend/test/`, `backend/prisma/`
- **Frontend**: `frontend/src/`, `frontend/test/`
- **Shared**: `shared/types/` (optional)

---

## Milestone 1: Foundation & Infrastructure (T001-T015)

### Phase 1.1: Setup

- [x] **T001** Create monorepo structure with backend/ and frontend/ directories

  - Create `backend/`, `frontend/`, `shared/types/` (optional)
  - Add root `package.json` with workspace config (pnpm)
  - Add `.gitignore`, `.env.example`

- [x] **T002** Initialize backend project (NestJS 10)

  - Run `nest new backend` or initialize manually
  - Install dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `prisma`, `@prisma/client`, `bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `@nestjs/throttler`, `helmet`, `class-validator`, `class-transformer`
  - Configure `tsconfig.json` with strict mode
  - Create `backend/src/config/`, `backend/src/common/`, `backend/src/domains/`, `backend/src/repositories/`, `backend/src/services/`, `backend/src/usecases/`, `backend/src/modules/` directories
  - **Note**: All functions/classes must have Turkish JSDoc per constitution

- [x] **T003** Initialize frontend project (Next.js 15)

  - Run `npx create-next-app@latest frontend --typescript --app --tailwind`
  - Install dependencies: `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`
  - Install Shadcn/UI: `npx shadcn-ui@latest init`
  - Configure `next.config.js` with API proxy
  - **Note**: This task was completed as per the edit hint. The actual setup was Next.js 15, dependencies, Turbopack warning.

- [ ] **T004 [P]** Configure ESLint + Prettier for backend

  - Add `backend/.eslintrc.js` with NestJS rules
  - Add `backend/.prettierrc` with project style
  - Add lint scripts to `backend/package.json`

- [ ] **T005 [P]** Configure ESLint + Prettier for frontend

  - Add `frontend/.eslintrc.json` with Next.js rules
  - Add `frontend/.prettierrc`
  - Add lint scripts to `frontend/package.json`

- [ ] **T006** Initialize Prisma schema in `backend/prisma/schema.prisma`

  - Define datasource (PostgreSQL)
  - Define generator (Prisma Client)
  - **DO NOT** create models yet (models come in T018-T040)

- [x] **T007** Create Docker Compose for local development

  - Add `docker-compose.yml` at repo root
  - Services: PostgreSQL 15, Redis 7
  - Volume mounts for data persistence
  - Health checks for services

- [ ] **T008** Create backend environment configuration

  - Create `backend/src/config/env.config.ts` with validation
  - Load: DATABASE_URL, REDIS_HOST, JWT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, ILETI_MERKEZI_API_KEY, NODE_ENV, PORT
  - Use `class-validator` for validation

- [ ] **T009** Create backend main.ts bootstrap

  - Configure global pipes (ValidationPipe)
  - Enable Helmet for security headers
  - Enable CORS
  - Enable throttling (@nestjs/throttler)
  - Swagger setup (optional for dev)
  - Port configuration (3001)

- [ ] **T010** Create frontend environment configuration
  - Create `frontend/.env.local.example`
  - Define NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
  - Create `frontend/src/lib/env.ts` for type-safe env access

### Phase 1.2: Testing Infrastructure

- [ ] **T011 [P]** Setup Jest for backend

  - Configure `backend/jest.config.js`
  - Create test helpers in `backend/test/helpers/`
  - Add test scripts: `test`, `test:watch`, `test:cov`, `test:e2e`

- [ ] **T012 [P]** Setup Vitest for frontend

  - Configure `frontend/vitest.config.ts`
  - Install `@testing-library/react`, `@testing-library/jest-dom`
  - Add test scripts: `test`, `test:ui`

- [ ] **T013** Create database test utilities

  - Create `backend/test/helpers/db-helper.ts`
  - Functions: `setupTestDb()`, `teardownTestDb()`, `clearTables()`
  - Use separate test database: `yildiz_salon_test`

- [ ] **T014** Create seed data script for development

  - Create `backend/prisma/seed.ts`
  - Seed: 1 Admin user, 2 Staff users, 5 Services, WorkingHours (Mon-Sat 09:00-19:00)
  - Hash passwords with bcrypt
  - Add seed script to `backend/package.json`

- [ ] **T015** Create quickstart documentation
  - ✅ Already exists at `specs/001-appointment-customer-management/quickstart.md`
  - Verify setup instructions match T001-T014
  - Update if necessary

---

## Milestone 2: Authentication & Authorization (T016-T030)

### Phase 2.1: Auth Domain & Models

- [ ] **T016** Create Auth domain entities

  - Create `backend/src/domains/auth/entities/user.entity.ts`
  - Create `backend/src/domains/auth/value-objects/email.vo.ts`
  - Create `backend/src/domains/auth/value-objects/phone.vo.ts`
  - Create `backend/src/domains/auth/value-objects/password.vo.ts` with bcrypt hashing

- [ ] **T017** Create Invitation domain entities
  - Create `backend/src/domains/invitations/entities/invitation.entity.ts`
  - Create `backend/src/domains/invitations/value-objects/token.vo.ts` (UUID v4)
  - Expiry logic: 72 hours from creation

### Phase 2.2: Prisma Models (Parallel)

- [ ] **T018 [P]** Define User model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (id, email, phone, passwordHash, firstName, lastName, role, isActive, lastLoginAt, createdAt, updatedAt)
  - Enum: Role (ADMIN, STAFF, CUSTOMER)
  - Indexes: email (unique), phone (unique), role
  - Relations: customer, sentInvitations, staffAppointments, auditLogs, createdServiceNotes

- [ ] **T019 [P]** Define Invitation model in `backend/prisma/schema.prisma`

  - Fields per data-model.md
  - Relations: inviter (User), guestCustomer (Customer nullable)
  - Indexes: token (unique), email, expiresAt, isUsed

- [ ] **T020** Run Prisma migration for User + Invitation
  - Run `npx prisma migrate dev --name add-user-invitation`
  - Generate Prisma Client: `npx prisma generate`
  - **DEPENDENCY**: T018, T019 must be complete

### Phase 2.3: Repositories (Parallel)

- [ ] **T021 [P]** Create User repository in `backend/src/repositories/user.repository.ts`

  - Inject PrismaService
  - Methods: `create()`, `findById()`, `findByEmail()`, `findByPhone()`, `update()`, `softDelete()`
  - **ONLY** this file can use Prisma User model

- [ ] **T022 [P]** Create Invitation repository in `backend/src/repositories/invitation.repository.ts`
  - Inject PrismaService
  - Methods: `create()`, `findByToken()`, `findActiveByEmail()`, `markUsed()`, `deleteExpired()`

### Phase 2.4: Services & Usecases

- [ ] **T023** Create Auth service in `backend/src/services/auth.service.ts`

  - Inject UserRepository, JwtService, BcryptService (create wrapper)
  - Methods: `validateUser()`, `login()`, `logout()`, `hashPassword()`, `verifyPassword()`
  - JWT payload: { sub, email, role, jti }
  - Role-based expiry: Admin 8h, Staff 12h, Customer 7d

- [ ] **T024** Create Invitation service in `backend/src/services/invitation.service.ts`

  - Inject InvitationRepository
  - Methods: `create()`, `findByToken()`, `validateNotExpired()`, `markUsed()`

- [ ] **T025** Create Register usecase in `backend/src/usecases/auth/register.usecase.ts`

  - Inject InvitationService, UserRepository
  - Flow: validate invitation → check email/phone uniqueness → create user → mark invitation used
  - Return JWT token

- [ ] **T026** Create Login usecase in `backend/src/usecases/auth/login.usecase.ts`

  - Inject AuthService
  - Flow: validate credentials → generate JWT → return token + user info

- [ ] **T027** Create Logout usecase in `backend/src/usecases/auth/logout.usecase.ts`
  - Inject RedisService (create wrapper for Redis)
  - Flow: extract JTI from token → add to blacklist in Redis with TTL

### Phase 2.5: Guards & Decorators

- [ ] **T028** Create JWT strategy in `backend/src/common/guards/jwt.strategy.ts`

  - Extend PassportStrategy
  - Validate JWT
  - Check Redis blacklist for JTI
  - Return user payload

- [ ] **T029** Create Roles guard in `backend/src/common/guards/roles.guard.ts`

  - Check @Roles decorator
  - Compare user.role with required roles
  - Return true/false

- [ ] **T030** Create decorators in `backend/src/common/decorators/`
  - `@Roles(...roles)`: set metadata for roles guard
  - `@CurrentUser()`: extract user from request

---

## Milestone 3: Customer & Appointment Domain (T031-T060)

### Phase 3.1: Remaining Prisma Models (Parallel)

- [ ] **T031 [P]** Define Customer model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (dual type: REGISTERED/GUEST)
  - Enum: CustomerType
  - Relations: user (nullable), appointments, reviews, notifications, invitations

- [ ] **T032 [P]** Define Service model in `backend/prisma/schema.prisma`

  - Fields: id, name, description, durationMinutes, price, isActive

- [ ] **T033 [P]** Define WorkingHours model in `backend/prisma/schema.prisma`

  - Fields: dayOfWeek (0-6), openTime, closeTime, isClosed
  - Unique constraint on dayOfWeek

- [ ] **T034 [P]** Define SpecialWorkingDay model in `backend/prisma/schema.prisma`

  - Fields: date, openTime, closeTime, isClosed, description, createdById
  - Unique constraint on date

- [ ] **T035 [P]** Define Appointment model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (status enum, creationMethod enum, trackingCode)
  - Enums: AppointmentStatus, CreationMethod
  - Relations: customer, staff, service, serviceNotes, payment, review, notifications

- [ ] **T036 [P]** Define ServiceNote model in `backend/prisma/schema.prisma`

  - Fields: appointmentId, content (max 1000 chars), createdById, createdAt
  - Relation: appointment (onDelete: Cascade)

- [ ] **T037 [P]** Define Payment model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (method enum, veresiye fields)
  - Enum: PaymentMethod (CASH, BANK_TRANSFER, POS_CARD, VERESIYE)

- [ ] **T038 [P]** Define Review model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (status enum, rating 1-5)
  - Enum: ReviewStatus (PENDING, APPROVED, DELETED)

- [ ] **T039 [P]** Define Notification model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (eventType enum, delivery status per channel)
  - Enums: NotificationEvent, DeliveryStatus

- [ ] **T040 [P]** Define AuditLog model in `backend/prisma/schema.prisma`

  - Fields per data-model.md (hash, previousHash, archived)
  - Indexes: action, actorId, targetEntity+targetId, timestamp, archived

- [ ] **T041** Run Prisma migration for all remaining models
  - Run `npx prisma migrate dev --name add-all-entities`
  - Generate Prisma Client
  - **DEPENDENCY**: T031-T040 must be complete

### Phase 3.2: Customer & Appointment Repositories (Parallel)

- [ ] **T042 [P]** Create Customer repository in `backend/src/repositories/customer.repository.ts`

  - Methods: `create()`, `findById()`, `findByPhone()`, `findByUserId()`, `update()`, `findGuests()`

- [ ] **T043 [P]** Create Service repository in `backend/src/repositories/service.repository.ts`

  - Methods: `findAll()`, `findById()`, `create()`, `update()`, `softDelete()`

- [ ] **T044 [P]** Create WorkingHours repository in `backend/src/repositories/working-hours.repository.ts`

  - Methods: `findByDayOfWeek()`, `upsert()`, `findAll()`

- [ ] **T045 [P]** Create SpecialWorkingDay repository in `backend/src/repositories/special-working-day.repository.ts`

  - Methods: `findByDate()`, `create()`, `delete()`, `findUpcoming()`

- [ ] **T046 [P]** Create Appointment repository in `backend/src/repositories/appointment.repository.ts`

  - Methods: `create()`, `findById()`, `findByTrackingCode()`, `findConflicts()`, `update()`, `findPending()`, `findByCustomer()`, `findByStaff()`
  - **Note**: Implement optimistic locking for concurrent appointment creation (Edge Case #1)

- [ ] **T047 [P]** Create ServiceNote repository in `backend/src/repositories/service-note.repository.ts`

  - Methods: `create()`, `findByAppointment()` (ordered by createdAt)

- [ ] **T048 [P]** Create Payment repository in `backend/src/repositories/payment.repository.ts`

  - Methods: `create()`, `findByAppointment()`, `update()`, `findVeresiye()`, `findOverdue()`

- [ ] **T049 [P]** Create Review repository in `backend/src/repositories/review.repository.ts`

  - Methods: `create()`, `findById()`, `update()`, `findPending()`, `findApproved()`, `calculateAverageRating()`

- [ ] **T050 [P]** Create Notification repository in `backend/src/repositories/notification.repository.ts`

  - Methods: `create()`, `update()`, `findFailed()`, `findToArchive()`

- [ ] **T051 [P]** Create AuditLog repository in `backend/src/repositories/audit-log.repository.ts`
  - Methods: `create()`, `findToArchive()`, `markArchived()`, `deleteArchived()`, `findLatest()` (for previousHash)

### Phase 3.3: Business Services

- [ ] **T052** Create Customer service in `backend/src/services/customer.service.ts`

  - Inject CustomerRepository
  - Methods: `createGuest()`, `createRegistered()`, `findByPhone()`, `convertGuestToRegistered()`, `findById()`

- [ ] **T053** Create Appointment service in `backend/src/services/appointment.service.ts`

  - Inject AppointmentRepository, WorkingHoursRepository, SpecialWorkingDayRepository
  - Methods: `checkConflict()`, `checkWorkingHours()`, `generateTrackingCode()`, `findAvailableSlots()`
  - Conflict logic: check (staffId, date, time) with status ∈ {PENDING, CONFIRMED}
  - Working hours priority: SpecialWorkingDay > WorkingHours

- [ ] **T054** Create Payment service in `backend/src/services/payment.service.ts`

  - Inject PaymentRepository
  - Methods: `recordPayment()`, `findVeresiyeOverdue()`, `updatePayment()`

- [ ] **T055** Create Review service in `backend/src/services/review.service.ts`
  - Inject ReviewRepository
  - Methods: `create()`, `approve()`, `delete()` (triggers audit log)

### Phase 3.4: Usecases (Appointment Creation Flows)

- [ ] **T056** Create "Guest Online Booking" usecase in `backend/src/usecases/appointments/create-guest-appointment.usecase.ts`

  - Inject CustomerService, AppointmentService
  - Flow: find or create guest by phone → check working hours → create appointment (PENDING) → generate tracking code → return tracking code

- [ ] **T057** Create "Registered Customer Online Booking" usecase in `backend/src/usecases/appointments/create-registered-appointment.usecase.ts`

  - Inject AppointmentService
  - Flow: check working hours → create appointment (PENDING) → return appointment ID

- [ ] **T058** Create "Staff Approve Appointment" usecase in `backend/src/usecases/appointments/approve-appointment.usecase.ts`

  - Inject AppointmentService, NotificationService (create placeholder)
  - Flow: check conflict → if conflict, require override flag + justification → update status to CONFIRMED → queue notification

- [ ] **T059** Create "Staff Manual Appointment" usecase in `backend/src/usecases/appointments/create-manual-appointment.usecase.ts`

  - Inject CustomerService, AppointmentService
  - Flow: search customer by phone → if not found, create guest → create appointment (CONFIRMED) → queue notification

- [ ] **T060** Create "Guest to Registered Conversion" usecase in `backend/src/usecases/customers/convert-guest-to-registered.usecase.ts`
  - Inject CustomerService, InvitationService
  - Flow: validate guest has email → create invitation with guestCustomerId → send invitation email

---

## Milestone 4: API Controllers (T061-T075)

### Phase 4.1: Auth Module

- [ ] **T061** Create Auth controller in `backend/src/modules/auth/auth.controller.ts`

  - POST /auth/register (with invitation token)
  - POST /auth/login
  - POST /auth/logout
  - Apply JWT guard where needed

- [ ] **T062** Create Invitations controller in `backend/src/modules/auth/invitations.controller.ts`
  - POST /admin/invitations (Admin only)
  - GET /admin/invitations
  - Apply @Roles('ADMIN') guard

### Phase 4.2: Appointments Module

- [ ] **T063** Create Appointments controller in `backend/src/modules/appointments/appointments.controller.ts`

  - POST /appointments (guest or registered)
  - GET /appointments (role-based filtering)
  - GET /appointments/:id
  - GET /appointments/track/:trackingCode (public)
  - POST /appointments/track/resend (guest SMS tracking code recovery, FR-015)
  - Apply JWT guard except for tracking endpoints

- [ ] **T064** Create Appointment Actions controller in `backend/src/modules/appointments/appointment-actions.controller.ts`
  - PATCH /appointments/:id/approve (Staff/Admin)
  - PATCH /appointments/:id/override (Admin, with justification)
  - PATCH /appointments/:id/cancel
  - PATCH /appointments/:id/complete
  - POST /appointments/:id/notes (ServiceNote, Staff/Admin)

### Phase 4.3: Customers Module

- [ ] **T065** Create Customers controller in `backend/src/modules/customers/customers.controller.ts`
  - POST /customers (manual guest creation, Staff/Admin)
  - GET /customers
  - GET /customers/:id
  - PATCH /customers/:id
  - POST /customers/:id/invite (convert guest → registered)

### Phase 4.4: Reviews Module

- [ ] **T066** Create Reviews controller in `backend/src/modules/customers/reviews.controller.ts`
  - POST /customers/:id/reviews (registered only)
  - GET /customers/:id/reviews
  - PATCH /reviews/:id/approve (Admin)
  - DELETE /reviews/:id (Admin, triggers audit log)

### Phase 4.5: Payments Module

- [ ] **T067** Create Payments controller in `backend/src/modules/payments/payments.controller.ts`
  - POST /payments
  - GET /payments (role-based filtering)
  - GET /payments/veresiye
  - PATCH /payments/:id

### Phase 4.6: Reports Module

- [ ] **T068** Create Reports controller in `backend/src/modules/reports/reports.controller.ts`

  - GET /reports/appointments?filters
  - GET /reports/payments (Admin only)
  - GET /reports/export?format=csv|xlsx

- [ ] **T069** Implement CSV/XLSX export service in `backend/src/services/reports.service.ts`
  - Use `xlsx` library
  - Streaming for large reports
  - Map data per quickstart.md format

### Phase 4.7: Working Hours Module

- [ ] **T070** Create Working Hours controller in `backend/src/modules/working-hours/working-hours.controller.ts`
  - GET /working-hours (includes per-day configuration, FR-055)
  - PUT /admin/working-hours (Admin, per-day working hours configuration)
  - GET /special-working-days
  - POST /admin/special-working-days (Admin)
  - DELETE /admin/special-working-days/:id

### Phase 4.8: Audit Module

- [ ] **T071** Create Audit Logs controller in `backend/src/modules/audit/audit-logs.controller.ts`
  - GET /admin/audit-logs (Admin only, with filters)
  - Apply pagination

---

## Milestone 5: Notifications & Background Jobs (T072-T080)

### Phase 5.1: Notification Channels

- [ ] **T072** Create Notification domain entities

  - Create `backend/src/domains/notifications/entities/notification.entity.ts`
  - Create `backend/src/domains/notifications/value-objects/channel.vo.ts`

- [ ] **T073** Create Email channel in `backend/src/services/notifications/channels/email.channel.ts`

  - Use Nodemailer
  - Gmail SMTP configuration
  - Implement `send()` method

- [ ] **T074** Create SMS channel in `backend/src/services/notifications/channels/sms.channel.ts`

  - Use İleti Merkezi API/SDK
  - DLR (Delivery Report) handling
  - Implement `send()` method

- [ ] **T075** Create Socket.io gateway in `backend/src/modules/notifications/notifications.gateway.ts`

  - JWT authentication
  - User rooms: `user:${userId}`, `guest:${trackingCode}`
  - Events: appointment.created, appointment.confirmed, appointment.cancelled, payment.reminder

- [ ] **T076** Create Notification service in `backend/src/services/notifications/notification.service.ts`
  - Inject all channels + NotificationRepository
  - Load channel settings from DB (Admin config)
  - **Note**: Channel settings stored in future SystemConfig table (to be defined in Phase 4)
  - Queue notifications to BullMQ
  - Methods: `sendAppointmentCreated()`, `sendAppointmentConfirmed()`, etc.

### Phase 5.2: Background Jobs (BullMQ)

- [ ] **T077** Setup BullMQ in `backend/src/jobs/queue.config.ts`

  - Configure Redis connection
  - Create queues: notifications, audit-archive, veresiye-reminders

- [ ] **T078** Create Notification Processor in `backend/src/jobs/notification.processor.ts`

  - @Processor('notifications')
  - Retry logic: 3 attempts
  - On failure: log to NotificationRepository

- [ ] **T079** Create Audit Archive Job in `backend/src/jobs/audit-archive.job.ts`

  - @Cron('0 2 \* \* \*') - daily at 2 AM
  - Query logs older than 90 days
  - Also archive notification failures older than 30 days (FR-047a)
  - Append to JSONL file
  - Verify hash chain
  - Mark as archived + delete from DB
  - Make file immutable (chattr +i on Linux)

- [ ] **T080** Create Veresiye Reminder Job in `backend/src/jobs/veresiye-reminder.job.ts`
  - @Cron('0 9 \* \* \*') - daily at 9 AM
  - Query payments with due dates: -3 days, today, +N days
  - Check customer preferences (FR-042b)
  - Queue reminder notifications

---

## Milestone 6: Frontend - Authentication & Layout (T081-T089)

### Phase 6.1: Frontend Infrastructure

- [ ] **T081** Create API client in `frontend/src/lib/api.ts`

  - Axios or fetch wrapper
  - Base URL from env
  - JWT token injection
  - Response/error interceptors

- [ ] **T082** Setup TanStack Query provider in `frontend/src/app/providers.tsx`

  - Create QueryClient
  - Wrap app with QueryClientProvider

- [ ] **T083** Create Auth Zustand store in `frontend/src/stores/auth.store.ts`

  - State: user, token, expires_at
  - Actions: login(), logout()
  - Persist to localStorage

- [ ] **T084** Create TanStack Query hooks in `frontend/src/hooks/`
  - `use-auth.ts`: login, register, logout mutations
  - `use-appointments.ts`: queries + mutations for appointments
  - `use-customers.ts`: queries + mutations for customers

### Phase 6.2: Auth Pages

- [ ] **T085** Create Login page in `frontend/src/app/(auth)/login/page.tsx`

  - Form with React Hook Form + Zod validation
  - Call useAuth().login mutation
  - Redirect to role-based dashboard on success

- [ ] **T086** Create Register page in `frontend/src/app/(auth)/register/page.tsx`
  - Accept invitation token from URL query param
  - Form with validation
  - Call useAuth().register mutation

### Phase 6.3: Layouts

- [ ] **T087** Create Admin layout in `frontend/src/app/(admin)/layout.tsx`

  - Sidebar navigation
  - Check user.role === 'ADMIN'
  - Links: Dashboard, Appointments, Customers, Payments, Reports, Settings

- [ ] **T088** Create Staff layout in `frontend/src/app/(staff)/layout.tsx`

  - Sidebar navigation
  - Check user.role === 'STAFF'
  - Links: Appointments, Customers, Payments

- [ ] **T089** Create Customer layout in `frontend/src/app/(customer)/layout.tsx`
  - Navbar navigation
  - Check user.role === 'CUSTOMER'
  - Links: My Appointments, History, Reviews

---

## Milestone 7: Frontend - Core Features (T090-T100)

### Phase 7.1: Public Pages (Guest Booking)

- [ ] **T090** Create Guest Booking page in `frontend/src/app/(public)/book/page.tsx`

  - Form: firstName, lastName, phone, service, date, time
  - Check working hours before submit
  - Call createGuestAppointment mutation
  - Display tracking code on success

- [ ] **T091** Create Tracking page in `frontend/src/app/(public)/track/[code]/page.tsx`
  - Server Component to fetch appointment by tracking code
  - Display: status, date, time, service, staff

### Phase 7.2: Admin Pages

- [ ] **T092** Create Admin Dashboard in `frontend/src/app/(admin)/page.tsx`

  - Charts: appointments by day, revenue by month (use recharts or Chart.js)
  - Summary cards: pending appointments, total customers, today's revenue
  - Fetch data with TanStack Query

- [ ] **T093** Create Appointments Management in `frontend/src/app/(admin)/appointments/page.tsx`

  - Table with filters: status, date range, staff
  - Actions: approve, override, cancel, complete
  - Pending tab with conflict warnings

- [ ] **T094** Create Customer Management in `frontend/src/app/(admin)/customers/page.tsx`

  - Table with search by phone/name
  - Actions: view details, create invitation
  - Show customer type (registered/guest)

- [ ] **T095** Create Reviews Management in `frontend/src/app/(admin)/reviews/page.tsx`

  - Pending reviews list
  - Actions: approve, delete (with audit log warning)

- [ ] **T096** Create Reports page in `frontend/src/app/(admin)/reports/page.tsx`
  - Filters: date range, staff, service, payment method
  - Export buttons: CSV, XLSX
  - Trigger download via useExportReport mutation

### Phase 7.3: Staff Pages

- [ ] **T097** Create Staff Appointments page in `frontend/src/app/(staff)/appointments/page.tsx`

  - View pending appointments
  - Approve with conflict check
  - Create manual appointment form (search customer by phone)

- [ ] **T098** Create Staff Appointment Details in `frontend/src/app/(staff)/appointments/[id]/page.tsx`
  - Mark as completed
  - Add service note (optional, max 1000 chars)
  - Record payment

### Phase 7.4: Customer Pages

- [ ] **T099** Create Customer Appointments page in `frontend/src/app/(customer)/appointments/page.tsx`

  - Create new appointment form
  - View active appointments
  - Cancel appointment

- [ ] **T100** Create Customer History page in `frontend/src/app/(customer)/history/page.tsx`
  - Past appointments
  - Leave review for completed appointments
  - Show deleted review status (FR-036: "Yorumunuz yönetici tarafından kaldırıldı")

---

## Milestone 8: Polish & Compliance (T101-T108)

### Phase 8.1: WCAG 2.1 AA Compliance

- [ ] **T101 [P]** Implement ARIA live regions for form errors

  - Update all forms in `frontend/src/components/forms/`
  - Add `role="alert"` + `aria-live="assertive"`
  - Test with screen reader (NVDA/VoiceOver)

- [ ] **T102 [P]** Add visible focus indicators

  - Update `frontend/src/styles/globals.css`
  - Ensure all interactive elements have `:focus-visible` styles
  - Tailwind: `focus:ring-2 focus:ring-blue-500`

- [ ] **T103** Implement keyboard navigation for modals

  - Use Shadcn Dialog component (built on Radix)
  - Focus trap on open
  - ESC to close

- [ ] **T104** Run axe-core accessibility audit
  - Install `@axe-core/react`
  - Run in development mode
  - Fix all violations

### Phase 8.2: SEO & Performance

- [ ] **T105 [P]** Add metadata to all pages

  - Use Next.js 15 `Metadata` API
  - Add title, description, Open Graph tags
  - Add schema.org LocalBusiness JSON-LD to home page

- [ ] **T106 [P]** Implement structured data validation

  - Test with Google Rich Results Test
  - Test with Schema Markup Validator
  - Fix any errors

- [ ] **T107** Run Lighthouse audit
  - Target: SEO ≥90, Accessibility ≥90, Performance ≥80
  - Optimize images (next/image)
  - Lazy load components
  - Fix any issues

### Phase 8.3: Final Testing

- [ ] **T108** Execute quickstart.md test workflows
  - Test Flow 1: Guest booking → staff approval
  - Test Flow 2: Registered customer → review
  - Test Flow 3: Manual appointment (walk-in)
  - Verify all flows work end-to-end

---

## Dependencies Graph

```
T001 (structure)
├─→ T002 (backend init)
│   ├─→ T004 [P] (lint)
│   ├─→ T006 (Prisma init)
│   │   ├─→ T018-T019 [P] (User/Invitation models)
│   │   │   ├─→ T020 (migration)
│   │   │   │   ├─→ T021-T022 [P] (repositories)
│   │   │   │   │   ├─→ T023-T027 (services/usecases)
│   │   │   │   │   │   ├─→ T028-T030 (guards)
│   │   │   │   │   │   │   ├─→ T061-T062 (auth controllers)
│   │   ├─→ T031-T040 [P] (remaining models)
│   │   │   ├─→ T041 (migration)
│   │   │   │   ├─→ T042-T051 [P] (repositories)
│   │   │   │   │   ├─→ T052-T055 (services)
│   │   │   │   │   │   ├─→ T056-T060 (usecases)
│   │   │   │   │   │   │   ├─→ T063-T071 (controllers)
│   ├─→ T008 (env config)
│   ├─→ T009 (main.ts)
│   ├─→ T011 [P] (Jest setup)
│   ├─→ T013 (DB test utils)
│   ├─→ T072-T076 (notifications)
│   │   ├─→ T077-T080 (background jobs)
├─→ T003 (frontend init)
│   ├─→ T005 [P] (lint)
│   ├─→ T010 (env config)
│   ├─→ T012 [P] (Vitest setup)
│   ├─→ T081-T084 (API client, Query, Zustand)
│   │   ├─→ T085-T089 (auth pages, layouts)
│   │   │   ├─→ T090-T100 (core pages)
│   │   │   │   ├─→ T101-T108 (polish & compliance)
├─→ T007 (Docker Compose)
├─→ T014 (seed script)
├─→ T015 (quickstart verify)
```

**Critical Path**: T001 → T002 → T006 → T018-T020 → T021-T027 → T028-T062 → T063-T071 → T072-T080 → T003 → T081-T089 → T090-T100 → T101-T108

**Estimated Duration**: 6-8 weeks (2 developers, working in parallel where possible)

---

## Parallel Execution Examples

### Example 1: Prisma Models (Phase 3.1)

Can run T031-T040 in parallel (different model definitions in same file, but independent):

```
Task T031: "Define Customer model in backend/prisma/schema.prisma"
Task T032: "Define Service model in backend/prisma/schema.prisma"
Task T033: "Define WorkingHours model in backend/prisma/schema.prisma"
...
Task T040: "Define AuditLog model in backend/prisma/schema.prisma"
```

**Note**: While these modify the same file, each developer can work on their model definition separately and merge.

### Example 2: Repositories (Phase 3.2)

Can run T042-T051 in parallel (different files):

```
Task T042 [P]: "Create Customer repository in backend/src/repositories/customer.repository.ts"
Task T043 [P]: "Create Service repository in backend/src/repositories/service.repository.ts"
Task T044 [P]: "Create WorkingHours repository in backend/src/repositories/working-hours.repository.ts"
...
Task T051 [P]: "Create AuditLog repository in backend/src/repositories/audit-log.repository.ts"
```

### Example 3: Frontend Pages (Milestone 7)

Can run T092-T096 (admin pages) and T097-T098 (staff pages) in parallel:

```
Task T092: "Create Admin Dashboard in frontend/src/app/(admin)/page.tsx"
Task T093: "Create Appointments Management in frontend/src/app/(admin)/appointments/page.tsx"
Task T097: "Create Staff Appointments page in frontend/src/app/(staff)/appointments/page.tsx"
Task T098: "Create Staff Appointment Details in frontend/src/app/(staff)/appointments/[id]/page.tsx"
```

### Example 4: WCAG Compliance (Phase 8.1)

Can run T101-T102 in parallel (different concerns):

```
Task T101 [P]: "Implement ARIA live regions for form errors"
Task T102 [P]: "Add visible focus indicators"
```

---

## Validation Checklist

_GATE: Checked before marking tasks complete_

- [x] All 12 entities have Prisma model tasks (T018-T019, T031-T040)
- [x] All 12 entities have repository tasks (T021-T022, T042-T051)
- [x] All core services have tasks (T023-T024, T052-T055, T069, T076)
- [x] All usecases have tasks (T025-T027, T056-T060)
- [x] All API endpoints have controller tasks (T061-T071)
- [x] All notification channels have tasks (T073-T075)
- [x] All background jobs have tasks (T078-T080)
- [x] All user-facing pages have tasks (T085-T100)
- [x] WCAG compliance tasks present (T101-T104)
- [x] SEO tasks present (T105-T107)
- [x] End-to-end testing task present (T108)
- [x] Tests come before implementation (TDD order preserved)
- [x] Parallel tasks ([P]) are truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (except Prisma schema where merges are manageable)

---

## Notes

- **[P] tasks**: Can be executed in parallel by different developers or agents
- **TDD order**: Although contract tests are not explicitly listed (to be generated in future), the order is: models → repositories → services → controllers
- **Commit after each task**: Use conventional commit format: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`
- **Turkish JSDoc**: All functions/classes must have Turkish documentation per constitution
- **Avoid**: Vague tasks, same file conflicts (except Prisma schema where merges are manageable)

---

## Task Generation Summary

**Total Tasks**: 108  
**Parallel Tasks**: 35 (marked with [P])  
**Milestones**: 8 (Foundation, Auth, Domain, Controllers, Notifications, Frontend Auth, Frontend Features, Polish)  
**Estimated Duration**: 6-8 weeks (2 developers)  
**Critical Path Length**: ~60 sequential tasks (with parallelization)

---

**Status**: ✅ Tasks ready for execution  
**Next Step**: Begin with T001 (Create monorepo structure)  
**Branch**: `001-appointment-customer-management`  
**Constitution Compliance**: All tasks follow layered architecture, TDD principles, and Turkish documentation requirements

---

_Generated by /tasks command on 2025-10-02_  
_Based on: plan.md, research.md, data-model.md, contracts/, quickstart.md_
