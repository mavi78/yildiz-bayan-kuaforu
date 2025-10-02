# Quickstart: Appointment & Customer Management Suite

**Date**: 2025-10-02  
**Phase**: 1 (Design & Contracts)  
**For**: Development team onboarding

## Prerequisites

- **Node.js**: 20 LTS
- **PostgreSQL**: 15+
- **Redis**: 7+
- **pnpm**: 8+ (or npm/yarn)
- **Docker** (optional, for local PostgreSQL/Redis)

## Repository Structure

```
yildiz-bayan-kuaforu/
├── backend/          # NestJS API
├── frontend/         # Next.js 15 App Router
├── shared/           # Shared TypeScript types (optional)
├── specs/            # Feature specifications
├── .specify/         # Project constitution & templates
└── docker-compose.yml # Local development services
```

## Quick Setup (15 minutes)

### 1. Clone & Install

```bash
# Clone repository
git clone <repo-url>
cd yildiz-bayan-kuaforu

# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

### 2. Start Infrastructure (Docker)

```bash
# From repository root
docker-compose up -d

# Verify services
docker ps  # Should see postgres and redis running
```

Or manually:

```bash
# PostgreSQL
createdb yildiz_salon_dev

# Redis (default port 6379)
redis-server
```

### 3. Configure Environment

**Backend** (`backend/.env`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yildiz_salon_dev"
REDIS_HOST="localhost"
REDIS_PORT=6379

JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRES_ADMIN="8h"
JWT_EXPIRES_STAFF="12h"
JWT_EXPIRES_CUSTOMER="7d"

GMAIL_USER="your-gmail@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"

ILETI_MERKEZI_API_KEY="your-ileti-merkezi-key"
ILETI_MERKEZI_API_SECRET="your-secret"

NODE_ENV="development"
PORT=3001
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

### 4. Initialize Database

```bash
cd backend

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev --name init

# Seed data (admin user + services)
pnpm prisma db seed
```

**Seed creates**:

- Admin user: `admin@yildiz.com` / `Admin123!`
- Staff user: `staff@yildiz.com` / `Staff123!`
- 5 sample services (Haircut, Coloring, etc.)
- Working hours (Mon-Sat 09:00-19:00)

### 5. Start Development Servers

**Terminal 1 - Backend**:

```bash
cd backend
pnpm run start:dev  # Runs on http://localhost:3001
```

**Terminal 2 - Frontend**:

```bash
cd frontend
pnpm run dev  # Runs on http://localhost:3000
```

### 6. Verify Setup

Open browser:

- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/health
- API docs (Swagger): http://localhost:3001/api-docs

**Test login**:

1. Go to http://localhost:3000/login
2. Login as admin: `admin@yildiz.com` / `Admin123!`
3. Should redirect to admin dashboard

## Project Commands

### Backend

```bash
# Development
pnpm run start:dev              # Start with hot-reload

# Testing
pnpm run test                   # Unit tests
pnpm run test:e2e               # E2E tests
pnpm run test:cov               # Coverage report

# Database
pnpm prisma studio              # Visual DB editor
pnpm prisma migrate dev         # Create migration
pnpm prisma db push             # Sync schema (dev only)

# Linting
pnpm run lint                   # ESLint
pnpm run format                 # Prettier
```

### Frontend

```bash
# Development
pnpm run dev                    # Start dev server
pnpm run build                  # Production build
pnpm run start                  # Start production server

# Testing
pnpm run test                   # Vitest unit tests
pnpm run test:ui                # Vitest UI
pnpm run lint                   # Next.js lint

# Shadcn/UI
pnpm dlx shadcn-ui@latest add button  # Add component
```

## Key Workflows

### Test Flow 1: Guest Booking → Staff Approval

**Scenario**: Guest customer books appointment online, staff approves with conflict check.

1. **Guest books** (no login):

   - Go to http://localhost:3000/book
   - Fill: Name, Phone, Service, Date/Time
   - Submit → Get tracking code (e.g., `AB12CD34`)

2. **Track appointment**:

   - Go to http://localhost:3000/track
   - Enter tracking code
   - See status: PENDING

3. **Staff approves**:

   - Login as staff
   - Go to Appointments → Pending tab
   - Click "Approve" on appointment
   - System checks conflict → If OK, status → CONFIRMED
   - Guest receives SMS notification

4. **Verify**:
   - Guest tracks again → Status: CONFIRMED

### Test Flow 2: Registered Customer Booking → Review

**Scenario**: Registered customer books, completes appointment, leaves review.

1. **Admin invites**:

   - Login as admin
   - Go to Settings → Invitations
   - Create invitation for customer: `customer@example.com`
   - Copy invitation link

2. **Customer registers**:

   - Open invitation link
   - Fill registration form
   - Login with new credentials

3. **Customer books**:

   - Go to Appointments → New Appointment
   - Select service, date, time
   - Submit → Status: PENDING

4. **Staff confirms** (same as Test Flow 1)

5. **Staff completes appointment**:

   - After appointment time passes
   - Mark appointment as COMPLETED
   - Optionally add service note (staff-only)

6. **Customer reviews**:

   - Customer goes to Appointments → History
   - Click "Leave Review" on completed appointment
   - Rate 1-5, write comment
   - Submit → Status: PENDING (awaiting admin approval)

7. **Admin approves review**:
   - Go to Reviews → Pending
   - Approve or delete review

### Test Flow 3: Manual Appointment (Walk-in)

**Scenario**: Customer walks into salon, staff creates appointment manually.

1. **Staff creates appointment**:

   - Login as staff
   - Go to Appointments → New Appointment (Manual)
   - Search customer by phone: `+905551234567`
   - If found: Customer info auto-fills
   - If not found: Enter name, phone (creates guest record)
   - Select service, date, time
   - Submit → Status: CONFIRMED (manual appointments auto-confirmed)

2. **Record payment**:

   - After service completion
   - Mark appointment as COMPLETED
   - Go to Payments → Record Payment
   - Select method (Cash/Card/Transfer/Veresiye)
   - If Veresiye: Fill due date, collateral, responsible person
   - Submit

3. **Verify audit log**:
   - Admin goes to Audit Logs
   - Should see payment recorded with staff ID

## Architecture Overview

### Backend Layers

```
HTTP Request
    ↓
Controller (validation, auth guards)
    ↓
Usecase (orchestration)
    ↓
Service (business rules)
    ↓
Repository (Prisma, DB access)
    ↓
PostgreSQL
```

**Example**: Create Appointment

- `AppointmentsController.create()` → validates DTO, checks JWT
- `CreateAppointmentUsecase.execute()` → orchestrates flow
- `AppointmentsService.create()` → applies business rules (working hours check)
- `AppointmentsRepository.create()` → Prisma insert
- `NotificationsService.send()` → queues notification job

### Frontend Patterns

**Server Components** (data fetching):

```tsx
// app/(admin)/appointments/page.tsx
export default async function AppointmentsPage() {
  const appointments = await getAppointments(); // Server-side fetch
  return <AppointmentsList data={appointments} />;
}
```

**Client Components** (interactivity):

```tsx
"use client";

export function AppointmentForm() {
  const { mutate } = useCreateAppointment(); // TanStack Query
  const { user } = useAuthStore(); // Zustand

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Troubleshooting

### Database Connection Error

```
Error: P1001: Can't reach database server
```

**Fix**: Ensure PostgreSQL is running, check DATABASE_URL.

### Redis Connection Error

```
Error: ECONNREFUSED localhost:6379
```

**Fix**: Start Redis (`redis-server` or `docker-compose up redis`).

### Prisma Client Not Generated

```
Error: Cannot find module '@prisma/client'
```

**Fix**: Run `pnpm prisma generate`.

### Next.js Port Already in Use

```
Error: Port 3000 is already in use
```

**Fix**: Kill process on port 3000 or use different port (`pnpm run dev -- -p 3001`).

### JWT Token Expired (401)

**Fix**: Re-login. Frontend should auto-logout on 401.

## Next Steps

1. **Read Spec**: `specs/001-appointment-customer-management/spec.md` (business requirements)
2. **Review Data Model**: `specs/001-appointment-customer-management/data-model.md` (database schema)
3. **Check Constitution**: `.specify/memory/constitution.md` (project rules)
4. **API Contracts**: `specs/001-appointment-customer-management/contracts/` (OpenAPI specs) - _To be created_
5. **Tasks**: `specs/001-appointment-customer-management/tasks.md` - _Generated by /tasks command_

## Development Guidelines

### Before Starting a Task

1. Read the task description in `tasks.md`
2. Check acceptance criteria
3. Review related contract tests (if any)
4. Write test first (TDD)

### Code Review Checklist

- [ ] Turkish JSDoc for all functions/classes
- [ ] Layer boundaries respected (no Prisma outside repository)
- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] No console.logs (use logger)
- [ ] Error handling with proper status codes
- [ ] Input validation with DTOs + class-validator

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/appointments-conflict-detection

# Commit with conventional commits
git commit -m "feat(appointments): add conflict detection service"

# Push and create PR
git push origin feature/appointments-conflict-detection
```

**Commit Prefixes**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`

## Support

- **Spec Questions**: Review `spec.md` Clarifications section
- **Technical Decisions**: Check `research.md`
- **Architecture**: Read constitution `.specify/memory/constitution.md`
- **Bug Reports**: Create GitHub issue with reproduction steps

---

**Setup Time**: ~15 min (with Docker) | ~30 min (manual PostgreSQL/Redis)  
**First Feature**: Guest booking flow (see Test Flow 1)  
**Documentation**: All `.md` files in `specs/001-appointment-customer-management/`
