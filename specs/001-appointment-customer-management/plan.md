# Implementation Plan: Appointment & Customer Management Suite

**Branch**: `001-appointment-customer-management` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-appointment-customer-management/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → ✅ Loaded from /home/nazif/proje/yildiz-bayan-kuaforu/specs/001-appointment-customer-management/spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: Web application (NestJS backend + Next.js frontend)
   → ✅ No NEEDS CLARIFICATION markers remain in spec
3. Fill the Constitution Check section
   → ✅ Constitution loaded from .specify/memory/constitution.md v1.0.0
4. Evaluate Constitution Check section
   → ✅ PASS - All requirements align with constitution
   → ✅ Progress Tracking: Initial Constitution Check updated
5. Execute Phase 0 → research.md
   → IN PROGRESS
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CURSOR.md
   → PENDING
7. Re-evaluate Constitution Check
   → PENDING
8. Plan Phase 2 → Describe task generation approach
   → PENDING
9. STOP - Ready for /tasks command
   → PENDING
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 is executed by /tasks command.

## Summary

**Primary Requirement**: Build a comprehensive appointment and customer management system for a single-location women's salon, supporting online and offline booking, guest and registered customers, payment tracking (offline only), notifications (email/SMS/real-time), admin dashboard with reports, and audit logging with archival.

**Technical Approach**:

- **Backend**: Layered architecture (domain → repository → service → usecase → controller) using NestJS + Prisma ORM + PostgreSQL + Redis for caching
- **Frontend**: Next.js 15 App Router with Shadcn/UI + Tailwind v4, client state via Zustand, server state via TanStack Query, form validation via React Hook Form + Zod
- **Notifications**: Multi-channel (Gmail, İleti Merkezi SMS, Socket.io), admin-configurable per event type
- **Auth**: JWT-based with invitation-only registration, role-based guards (Admin/Staff/Customer)
- **Audit**: Database storage with auto-archival to JSONL append-only files after 90 days, hash chain verification

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS for backend, Next.js 15 for frontend)  
**Primary Dependencies**:

- Backend: NestJS 10.x, Prisma 5.x, bcrypt, @nestjs/jwt, @nestjs/throttler, Helmet, class-validator
- Frontend: Next.js 15, React 18, Shadcn/UI, Tailwind v4, Zustand, TanStack Query, React Hook Form, Zod
- Notifications: Nodemailer (Gmail), İleti Merkezi SDK, Socket.io

**Storage**: PostgreSQL 15+ (primary), Redis 7+ (session cache, job queue)  
**Testing**: Jest + Supertest (backend unit/integration/e2e), Vitest + React Testing Library (frontend)  
**Target Platform**: Linux server (Docker containers), modern browsers (Chrome/Firefox/Safari last 2 versions)  
**Project Type**: Web application (backend + frontend monorepo or separate repos)  
**Performance Goals**:

- API p95 latency < 200ms for simple queries, < 3s for complex reports
- SSR initial page load < 400ms p95
- Real-time notification delivery < 100ms

**Constraints**:

- Single-location salon (no multi-tenancy)
- Offline payment tracking only (no Stripe/PayPal integration)
- Invitation-only registration (no public signup)
- WCAG 2.1 AA compliance mandatory
- Audit log retention minimum 5 years

**Scale/Scope**:

- Expected: ~100 appointments/week, ~500 registered customers, ~5-10 staff (single-location salon)
- Data: ~12 entities, ~70 functional requirements across 9 domain groups
- UI: ~20-25 pages/screens (admin dashboard, customer portal, staff interface)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Güvenli ve Resmi Kaynak Tabanlı Geliştirme

- ✅ **context7 Documentation**: All tech stack items (NestJS, Next.js 15, Prisma, Shadcn/UI, TanStack Query) must reference official context7 MCP docs before implementation
- ✅ **Security Baseline**: Helmet, CORS, @nestjs/throttler, JWT, bcrypt are explicitly specified
- ⚠️ **Secret Management**: `.env` files mentioned but vault/parameter store integration needed for production
  - **Justification**: Development phase accepts `.env`; production deployment will use Docker secrets or AWS Parameter Store
- ✅ **Audit**: KVKK compliance supported via audit log archival (minimum 5 years)

### II. Katmanlı Domain Odaklı Mimari

- ✅ **Layer Enforcement**: Spec explicitly requires domain → repository → service → usecase → UI
- ✅ **Database Isolation**: FR implies Prisma usage restricted to repository layer
- ✅ **Domain Separation**: Clear bounded contexts: appointments, customers, payments, notifications, audit
- ✅ **Cross-Domain**: Antipattern prevention via clean module boundaries

### III. Kimlik, Yetki ve Davet Akışı Bütünlüğü

- ✅ **JWT Auth**: FR-006 to FR-009 specify JWT, bcrypt, throttling, session expiry
- ✅ **Invitation-Only**: FR-001 to FR-004 enforce invite-only registration with 72h expiry
- ✅ **Role Guards**: FR-005 defines Admin/Staff/Customer roles with explicit permissions
- ✅ **Unique Constraints**: FR-004 enforces unique email/phone at domain and DB level
- ✅ **Offboarding**: FR-009 specifies forced logout capability

### IV. Test, Gözlemlenebilirlik ve Kayıt Disiplini

- ✅ **TDD Mandatory**: Constitution requires unit (services), integration (repo+DB), e2e (flows)
- ✅ **Audit Log**: FR-060 to FR-065 define critical action logging, 90-day archival, JSONL format, hash chain verification
- ✅ **Observability**: Structured logging implied; metrics/alerting to be defined in Phase 1
- ✅ **CI/CD Gates**: Tests must pass before merge (standard practice)

### V. Deneyim, Erişilebilirlik ve Performans Mükemmelliği

- ✅ **WCAG 2.1 AA**: FR-066, FR-067, FR-067a/b specify compliance, ARIA, keyboard navigation, focus indicators
- ✅ **SEO**: FR-068, FR-068a, FR-069 require metadata, schema.org LocalBusiness, Lighthouse ≥90
- ✅ **Multi-Channel Notifications**: FR-043 to FR-048 define Gmail, İleti Merkezi, Socket.io with admin config
- ✅ **Performance Targets**: FR-053 specifies p95 < 3s for reports; constitution requires SSR < 400ms, interaction < 100ms
- ✅ **Caching**: Redis for session and incremental data caching implied

### Operasyonel Standartlar

- ✅ **Randevu Çakışma**: FR-016, FR-017 define conflict detection + admin override with justification
- ✅ **Offline Ödemeler**: FR-037 to FR-042 enforce no online payment, veresiye tracking with vade/teminat
- ✅ **Davet**: FR-002, FR-003 specify 72h expiry, single-use token, admin resend
- ✅ **Bildirim**: FR-044 admin channel selection, FR-046 retry 3x, FR-047 daily failure report
- ✅ **Audit Arşiv**: FR-065 WORM storage, 5-year retention, hash chain integrity
- ✅ **Raporlama**: FR-050, FR-052 role-based segmentation, FR-053 optimized queries

### Geliştirme Süreci

- ✅ **context7 Referencing**: Phase 0 will document all tech stack references
- ✅ **Design Review**: Phase 1 design must re-check constitution compliance
- ✅ **Tests First**: TDD enforced via Phase 1 contract test generation before implementation
- ✅ **Code Review**: Tasks will include review steps for security/performance/maintainability
- ✅ **Turkish JSDoc**: All functions/classes must have Turkish documentation
- ✅ **Semantic Versioning**: Initial version 0.1.0, breaking changes bump major

**Constitution Compliance**: ✅ PASS (with production secret management deferred)

## Project Structure

### Documentation (this feature)

```
specs/001-appointment-customer-management/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── api/             # OpenAPI specs per domain
│   └── events/          # Socket.io event contracts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
backend/
├── prisma/
│   ├── schema.prisma              # Prisma schema (12 entities)
│   ├── migrations/                # Migration files
│   └── seed.ts                    # Seed data for development
├── src/
│   ├── config/                    # Environment config, JWT config
│   ├── common/                    # Shared decorators, guards, filters, pipes
│   │   ├── guards/                # JWT guard, role guard, throttle guard
│   │   ├── decorators/            # @Roles, @CurrentUser
│   │   ├── filters/               # Exception filters
│   │   └── pipes/                 # Validation pipes
│   ├── domains/                   # Domain layer (business logic)
│   │   ├── appointments/          # Appointment domain models, value objects
│   │   ├── customers/             # Customer domain models
│   │   ├── payments/              # Payment domain models
│   │   ├── notifications/         # Notification domain models
│   │   └── audit/                 # Audit log domain models
│   ├── repositories/              # Repository layer (Prisma only here)
│   │   ├── appointments.repository.ts
│   │   ├── customers.repository.ts
│   │   ├── payments.repository.ts
│   │   └── audit.repository.ts
│   ├── services/                  # Service layer (orchestration, business rules)
│   │   ├── appointments.service.ts
│   │   ├── customers.service.ts
│   │   ├── payments.service.ts
│   │   ├── notifications.service.ts
│   │   └── audit.service.ts
│   ├── usecases/                  # Usecase layer (application logic)
│   │   ├── appointments/          # Create, approve, override, cancel
│   │   ├── customers/             # Register, invite, manage
│   │   ├── payments/              # Record, track veresiye
│   │   └── reports/               # Generate, export
│   ├── modules/                   # NestJS modules (controllers, module definitions)
│   │   ├── auth/                  # Auth controller, JWT strategy
│   │   ├── appointments/          # Appointments controller
│   │   ├── customers/             # Customers controller
│   │   ├── payments/              # Payments controller
│   │   ├── reports/               # Reports controller
│   │   └── notifications/         # Notifications gateway (Socket.io)
│   ├── jobs/                      # Background jobs (BullMQ)
│   │   ├── audit-archive.job.ts   # 90-day audit archival
│   │   ├── notification-retry.job.ts
│   │   └── veresiye-reminder.job.ts
│   └── main.ts                    # Application bootstrap
├── test/
│   ├── contract/                  # Contract tests (API schema validation)
│   ├── integration/               # Repository + DB integration tests
│   ├── e2e/                       # End-to-end flow tests
│   └── unit/                      # Service unit tests
└── dist/                          # Build output

frontend/
├── src/
│   ├── app/                       # Next.js 15 App Router
│   │   ├── (auth)/                # Auth route group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (admin)/               # Admin dashboard route group
│   │   │   ├── appointments/
│   │   │   ├── customers/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── (staff)/               # Staff interface route group
│   │   │   ├── appointments/
│   │   │   └── customers/
│   │   ├── (customer)/            # Customer portal route group
│   │   │   ├── appointments/
│   │   │   ├── history/
│   │   │   └── reviews/
│   │   ├── (public)/              # Public pages (guest booking, tracking)
│   │   │   ├── book/
│   │   │   └── track/
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Shadcn/UI components
│   │   ├── forms/                 # Form components (React Hook Form + Zod)
│   │   ├── tables/                # Data tables (appointments, payments)
│   │   ├── charts/                # Chart components (admin dashboard)
│   │   └── layouts/               # Layout components
│   ├── lib/                       # Utilities and configurations
│   │   ├── api.ts                 # API client (TanStack Query config)
│   │   ├── auth.ts                # Auth utilities
│   │   ├── socket.ts              # Socket.io client config
│   │   └── utils.ts               # Helper functions
│   ├── stores/                    # Zustand stores
│   │   ├── auth.store.ts          # Auth state
│   │   ├── notifications.store.ts # Real-time notifications
│   │   └── ui.store.ts            # UI state (modals, drawers)
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-appointments.ts    # TanStack Query hooks for appointments
│   │   ├── use-customers.ts       # TanStack Query hooks for customers
│   │   └── use-socket.ts          # Socket.io connection hook
│   ├── types/                     # TypeScript types (shared with backend)
│   └── styles/                    # Global styles, Tailwind config
├── public/                        # Static assets
├── test/                          # Frontend tests (Vitest + RTL)
└── next.config.js                 # Next.js configuration

shared/ (optional)
└── types/                         # Shared TypeScript types (DTOs, contracts)
```

**Structure Decision**: Web application with separate `backend/` and `frontend/` directories in monorepo structure. Backend follows layered architecture (domain → repository → service → usecase → module). Frontend follows Next.js 15 App Router conventions with route groups for role-based access. Shared types can be extracted to a `shared/types` directory or kept in sync manually.

## Phase 0: Outline & Research

### Research Tasks

Since all technical context is already specified (no NEEDS CLARIFICATION markers), Phase 0 focuses on best practices and integration patterns:

1. **NestJS Layered Architecture Patterns**

   - Research: Best practices for domain → repository → service → usecase → controller layering
   - Research: Prisma isolation patterns (repository-only access)
   - Research: NestJS module organization for bounded contexts

2. **Next.js 15 App Router + Shadcn/UI**

   - Research: Next.js 15 App Router route groups for RBAC
   - Research: Shadcn/UI integration with Tailwind v4
   - Research: Server Components vs. Client Components strategy

3. **Multi-Channel Notification System**

   - Research: Nodemailer Gmail integration best practices
   - Research: İleti Merkezi SDK usage patterns
   - Research: Socket.io NestJS gateway patterns with JWT auth

4. **Audit Log Archival & Hash Chain**

   - Research: JSONL append-only file patterns
   - Research: Hash chain implementation for tamper detection
   - Research: WORM storage solutions (filesystem, S3 with Object Lock)

5. **JWT + Role-Based Guards**

   - Research: NestJS @nestjs/jwt + passport strategy
   - Research: Custom role guard implementation
   - Research: Session expiry handling (Redis cache)

6. **Zustand + TanStack Query Integration**

   - Research: Zustand for client-side state (auth, UI)
   - Research: TanStack Query for server state (API data)
   - Research: Optimistic updates for appointment booking

7. **WCAG 2.1 AA Compliance**

   - Research: ARIA live regions for form errors
   - Research: Keyboard navigation patterns for modals/drawers
   - Research: Focus management in React

8. **CSV/XLSX Export**
   - Research: Server-side report generation (xlsx library)
   - Research: Streaming large reports

### Research Output (research.md structure)

Will document:

- **Decision**: Chosen approach for each research area
- **Rationale**: Why this approach fits constitution and requirements
- **Alternatives Considered**: Other options evaluated
- **Implementation Notes**: Key patterns, gotchas, references to context7 docs

**Output**: `research.md` with 8 research topics documented

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

### 1. Data Model Extraction (data-model.md)

Extract from spec.md Key Entities section (lines 304-317) and functional requirements:

**Entities**:

- **User**: Authentication + profile (Admin/Staff/Customer roles)
- **Invitation**: Invitation tokens with 72h expiry
- **Customer**: Registered (User-linked) and Guest (standalone) customer profiles
- **Appointment**: Booking records with PENDING/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW states
- **WorkingHours**: Normal salon hours (day-based)
- **SpecialWorkingDay**: Override hours for specific dates
- **ServiceNote**: Post-appointment notes (admin/staff only, 1000 char max)
- **Service**: Service catalog (haircut, coloring, etc.)
- **Payment**: Offline payment tracking (nakit/banka/kart/veresiye)
- **Review**: Customer reviews (registered customers only, admin approval)
- **AuditLog**: Critical action logging (before archival)
- **Notification**: Multi-channel notification records

**Relationships**:

- User 1:1 Customer (registered) | Customer standalone (guest)
- Appointment N:1 Customer, N:1 User (staff), N:1 Service
- ServiceNote N:1 Appointment
- Payment N:1 Appointment
- Review N:1 Appointment, N:1 Customer (registered)
- Notification N:1 Appointment (if applicable)
- AuditLog N:1 User (actor)
- Invitation 1:1? Customer (optional, for guest-to-registered conversion)

**State Transitions**:

- Appointment: PENDING → CONFIRMED → COMPLETED | CANCELLED | NO_SHOW
- Review: beklemede → onaylandı | silindi
- Invitation: active → kullanıldı | expired

**Validation Rules** (from FRs):

- Email/phone uniqueness (FR-004)
- Tracking code 8-char alphanumeric (FR-013)
- ServiceNote max 1000 chars (FR-026a)
- JWT expiry: Admin 8h, Staff 12h, Customer 7d (FR-008)
- Invitation expiry 72h (FR-002)
- Audit log archival after 90 days (FR-062)

### 2. API Contract Generation (contracts/)

Based on FR grouping (spec.md lines 167-177), generate OpenAPI contracts for:

**Auth Module** (FR-001 to FR-009):

- POST /auth/register (with invitation token)
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- POST /admin/invitations (Admin only)
- GET /admin/invitations (Admin only)

**Appointments Module** (FR-010 to FR-026c):

- POST /appointments (create: guest or registered)
- GET /appointments (list: role-based filtering)
- GET /appointments/:id
- PATCH /appointments/:id/approve (Staff/Admin)
- PATCH /appointments/:id/override (Admin, with justification)
- PATCH /appointments/:id/cancel
- PATCH /appointments/:id/complete
- POST /appointments/:id/notes (ServiceNote, Staff/Admin)
- GET /appointments/track/:trackingCode (public, guest tracking)

**Customers Module** (FR-027 to FR-036):

- POST /customers (Staff/Admin, manual guest creation)
- GET /customers
- GET /customers/:id
- PATCH /customers/:id
- POST /customers/:id/invite (convert guest to registered)
- POST /customers/:id/reviews (registered customer only)
- GET /customers/:id/reviews

**Payments Module** (FR-037 to FR-042b):

- POST /payments (link to appointment)
- GET /payments (role-based filtering)
- GET /payments/veresiye (veresiye tracking)
- PATCH /payments/:id (update veresiye)

**Notifications Module** (FR-043 to FR-048):

- WS /notifications (Socket.io gateway)
- GET /notifications/failed (Admin daily report)
- PATCH /admin/notification-settings (channel config per event)

**Reports Module** (FR-049 to FR-053):

- GET /reports/appointments (with filters)
- GET /reports/payments (Admin only)
- GET /reports/export?format=csv|xlsx

**Working Hours Module** (FR-054 to FR-059a):

- GET /working-hours
- PUT /admin/working-hours (Admin)
- GET /special-working-days
- POST /admin/special-working-days (Admin)
- DELETE /admin/special-working-days/:id

**Audit Module** (FR-060 to FR-065):

- GET /admin/audit-logs (Admin only, with filters)

### 3. Contract Tests (test/contract/)

Generate failing tests for each endpoint:

- Schema validation (request/response DTOs)
- Auth guard checks (401/403 expected for unauthorized)
- Role-based access (Admin-only endpoints reject Staff)

### 4. Integration Test Scenarios (test/e2e/)

From User Scenarios (spec.md lines 63-73) and Acceptance Scenarios (lines 77-113):

- E2E: Guest booking flow (create → track → staff approve → confirm notification)
- E2E: Registered customer booking flow (login → book → pending → approve → complete → review)
- E2E: Staff manual booking (search customer → create confirmed appointment → notification)
- E2E: Admin override conflict (detect conflict → override with justification → audit log)
- E2E: Guest-to-registered conversion (staff creates guest → admin invites → customer registers)
- E2E: Payment tracking (record payment → veresiye reminder → admin report)
- E2E: Audit log archival (90-day cleanup → JSONL file → hash chain verification)

### 5. Update CURSOR.md

Run update script:

```bash
.specify/scripts/bash/update-agent-context.sh cursor
```

Output to `/home/nazif/proje/yildiz-bayan-kuaforu/CURSOR.md` with:

- Tech stack summary (NestJS, Next.js 15, Prisma, Shadcn/UI)
- Architecture principles (layered, repository isolation)
- Key constraints (offline payments, invitation-only, WCAG AA)
- Recent changes (this feature plan)

**Output**:

- `data-model.md` (12 entities with relationships)
- `contracts/api/*.openapi.yaml` (8 modules, ~35 endpoints)
- `contracts/events/notifications.yaml` (Socket.io events)
- `test/contract/*.spec.ts` (failing contract tests)
- `test/e2e/*.spec.ts` (7 integration test scenarios)
- `quickstart.md` (setup instructions + test run commands)
- `CURSOR.md` (updated agent context)

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

### Task Generation Strategy

Load `.specify/templates/tasks-template.md` and generate tasks from Phase 1 artifacts:

**From contracts/ (API endpoints)**:

- Each OpenAPI endpoint → 1 contract test task [P]
- Group by module (auth, appointments, customers, payments, reports, notifications, working-hours, audit)

**From data-model.md (entities)**:

- Each entity → 1 Prisma schema task [P]
- Each entity → 1 repository implementation task (after schema)
- Each entity → 1 repository test task [P] (can run before implementation, TDD)

**From user scenarios (integration tests)**:

- Each acceptance scenario → 1 integration test task
- Each edge case → 1 edge case test task

**Implementation tasks** (to make tests pass):

- Each service → 1 service implementation + unit test task
- Each usecase → 1 usecase implementation task
- Each controller → 1 controller implementation task
- Each frontend page → 1 page implementation task
- Each background job → 1 job implementation task

**Infrastructure tasks**:

- Docker setup (PostgreSQL, Redis)
- CI/CD pipeline (GitHub Actions: test, lint, build)
- Audit log archival job setup (BullMQ + cron)
- Socket.io gateway setup
- Email/SMS provider integration

### Ordering Strategy

**TDD Order**: Tests before implementation

- Contract tests → Repositories → Services → Usecases → Controllers

**Dependency Order**:

- Prisma schema → Migrations → Repositories
- Repositories → Services → Usecases → Controllers
- Backend API → Frontend pages (contract-driven development)

**Parallelizable Tasks** [P]:

- All contract test tasks (independent files)
- All Prisma entity definitions (separate models)
- All repository tests (isolated DB transactions)
- All frontend pages (independent components)

**Milestones** (from FR grouping):

1. **M1: Foundation** (auth, invitations, base entities) → ~10 tasks
2. **M2: Appointments** (booking, tracking, approval, override) → ~15 tasks
3. **M3: Customers & Reviews** (customer mgmt, guest conversion, reviews) → ~8 tasks
4. **M4: Payments** (tracking, veresiye, reminders) → ~6 tasks
5. **M5: Notifications** (multi-channel, Socket.io, retry) → ~7 tasks
6. **M6: Reports** (dashboard, filters, export) → ~5 tasks
7. **M7: Working Hours** (normal, special days, slot calculation) → ~4 tasks
8. **M8: Audit & Archival** (logging, JSONL archival, hash chain) → ~6 tasks
9. **M9: Polish** (WCAG AA, SEO, Lighthouse optimization) → ~5 tasks

**Estimated Output**: ~65-70 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md with detailed milestones + task breakdown)  
**Phase 4**: Implementation (execute tasks.md following TDD + constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation, Lighthouse audit)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                      | Why Needed                                                 | Simpler Alternative Rejected Because                                                       |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Secret Management (production) | Constitution requires vault/parameter store for production | Development `.env` is acceptable; production deployment will use Docker secrets or AWS SSM |
| None                           | N/A                                                        | N/A                                                                                        |

**Note**: The only deviation is deferring production secret management to deployment phase. All other constitutional requirements are met.

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) → ✅ research.md created with 8 research topics
- [x] Phase 1: Design complete (/plan command) → ✅ data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning approach described (/plan command) → ✅ Described above (see Phase 2 section)
- [x] Phase 3: Tasks generated (/tasks command) → ✅ tasks.md created with 108 tasks across 8 milestones
- [ ] Phase 4: Implementation complete → READY - Begin with T001
- [ ] Phase 5: Validation passed → Pending Phase 4

**Gate Status**:

- [x] Initial Constitution Check: PASS (secret management deferred to production)
- [x] Post-Design Constitution Check: PASS (layered architecture, data model compliant)
- [x] All NEEDS CLARIFICATION resolved (spec has no NEEDS CLARIFICATION markers)
- [x] Complexity deviations documented (secret management note added)

**Artifacts Generated**:

- [x] plan.md (this file)
- [x] research.md (8 research topics with implementation patterns)
- [x] data-model.md (12 entities with Prisma schema)
- [x] quickstart.md (15-min setup guide + test workflows)
- [x] contracts/README.md (contract structure + examples)
- [x] tasks.md (108 tasks across 8 milestones)
- [ ] contracts/api/\*.openapi.yaml → Phase 4 (during implementation)
- [ ] contracts/events/\*.yaml → Phase 4 (during implementation)
- [ ] CURSOR.md → Phase 4 (via update-agent-context.sh)

---

_Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`_
