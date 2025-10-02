# Research: Appointment & Customer Management Suite

**Date**: 2025-10-02  
**Phase**: 0 (Outline & Research)  
**Status**: Complete

## Research Topics

### 1. NestJS Layered Architecture Patterns

**Decision**: Implement strict layered architecture with domain → repository → service → usecase → controller separation.

**Rationale**:

- Constitution (§II) mandates layer enforcement with Prisma isolation to repository layer
- Improves testability: each layer can be unit tested independently
- Reduces coupling: business logic (domain/service) decoupled from data access (repository) and presentation (controller)
- Facilitates bounded context separation (appointments, customers, payments, notifications)

**Implementation Pattern**:

```
domains/           # Pure business logic, no framework dependencies
├── appointments/
│   ├── entities/  # Domain entities (Appointment, AppointmentStatus)
│   ├── value-objects/  # Immutables (TrackingCode, PhoneNumber)
│   └── rules/     # Business rules (ConflictDetection, OverridePolicy)

repositories/      # Data access layer, Prisma ONLY
├── base.repository.ts  # Abstract base with common operations
└── appointments.repository.ts  # Prisma client usage

services/          # Orchestration + domain rule application
└── appointments.service.ts  # Calls repository, applies domain rules

usecases/          # Application-specific workflows
├── create-appointment.usecase.ts  # Guest/registered booking flow
└── approve-appointment.usecase.ts  # Staff approval with conflict check

modules/           # NestJS modules (controllers, DI setup)
└── appointments/
    ├── appointments.controller.ts  # HTTP endpoints
    └── appointments.module.ts  # DI container config
```

**Alternatives Considered**:

- **Vertical Slice Architecture**: Rejected because Constitution explicitly requires horizontal layering
- **Feature-based modules**: Considered but layered approach better enforces repository isolation

**Context7 References**:

- NestJS Modules: https://docs.nestjs.com/modules
- NestJS Custom Providers: https://docs.nestjs.com/fundamentals/custom-providers
- Prisma with NestJS: https://docs.nestjs.com/recipes/prisma

---

### 2. Next.js 15 App Router + Shadcn/UI Integration

**Decision**: Use Next.js 15 App Router with route groups for role-based layouts, Server Components for data fetching, Client Components for interactivity.

**Rationale**:

- App Router (stable in Next.js 13+, mature in 15) provides file-based routing with layouts
- Route groups `(admin)`, `(staff)`, `(customer)`, `(public)` isolate role-specific UI without affecting URL structure
- Server Components reduce client bundle size, improve SEO (FR-068/069)
- Shadcn/UI provides accessible (WCAG AA) components out-of-the-box with Tailwind v4 integration

**Implementation Pattern**:

```
app/
├── (auth)/
│   ├── login/page.tsx          # Server Component (initial render)
│   └── register/page.tsx
├── (admin)/
│   ├── layout.tsx              # Admin sidebar layout
│   └── appointments/page.tsx   # Server Component + Client filters
├── (staff)/
│   ├── layout.tsx              # Staff sidebar layout
│   └── appointments/page.tsx
├── (customer)/
│   ├── layout.tsx              # Customer navbar layout
│   └── appointments/page.tsx
├── (public)/
│   ├── book/page.tsx           # Guest booking (Client Component)
│   └── track/[code]/page.tsx   # Tracking query (Server Component)
└── layout.tsx                  # Root layout (metadata, theme)
```

**Server Component Strategy**:

- Use for pages that fetch data on server (appointments list, reports)
- Benefits: SEO, initial load performance, reduced JS bundle

**Client Component Strategy** (`"use client"`):

- Use for forms (React Hook Form), interactive tables, real-time notifications (Socket.io)
- Zustand stores only in Client Components

**Shadcn/UI + Tailwind v4**:

- Install via CLI: `npx shadcn-ui@latest init`
- Components: Button, Input, Table, Dialog, DropdownMenu, Calendar (for date picker)
- Tailwind v4 features: CSS-first configuration, improved performance

**Alternatives Considered**:

- **Pages Router**: Rejected, App Router is stable and provides better DX for layouts
- **Material-UI**: Rejected, Shadcn/UI is lighter and follows Tailwind conventions

**Context7 References**:

- Next.js 15 App Router: https://nextjs.org/docs/app
- Next.js Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- Shadcn/UI: https://ui.shadcn.com/docs
- Tailwind CSS v4: https://tailwindcss.com/docs

---

### 3. Multi-Channel Notification System

**Decision**: Implement notification service with strategy pattern (EmailChannel, SMSChannel, SocketChannel), admin-configurable via database flags.

**Rationale**:

- FR-043/044 require Gmail, İleti Merkezi SMS, Socket.io with admin toggle per event type
- Strategy pattern allows adding channels without modifying core notification service
- BullMQ job queue handles retry logic (FR-046: 3 retries)

**Implementation Pattern**:

```typescript
// Domain
interface NotificationChannel {
  send(notification: Notification): Promise<Result>;
}

// Implementations
class EmailChannel implements NotificationChannel {
  constructor(private nodemailer: Nodemailer) {}
  async send(notification: Notification) {
    // Gmail SMTP via Nodemailer
  }
}

class SMSChannel implements NotificationChannel {
  constructor(private iletiMerkeziClient: IletiMerkeziClient) {}
  async send(notification: Notification) {
    // İleti Merkezi API + DLR check
  }
}

class SocketChannel implements NotificationChannel {
  constructor(private socketGateway: NotificationsGateway) {}
  async send(notification: Notification) {
    // Socket.io emit to user room
  }
}

// Service
class NotificationService {
  async sendAppointmentCreated(appointment: Appointment) {
    const settings = await this.getChannelSettings("appointment.created");
    const channels = this.buildChannels(settings); // [email, sms, socket]

    for (const channel of channels) {
      await this.queue.add("send-notification", { channel, appointment });
    }
  }
}

// Job processor
@Processor("send-notification")
class NotificationProcessor {
  @Process()
  async handle(job: Job) {
    const { channel, appointment } = job.data;
    try {
      await channel.send(notification);
    } catch (error) {
      if (job.attemptsMade < 3) {
        throw error; // BullMQ auto-retry
      } else {
        await this.logFailure(notification); // FR-047
      }
    }
  }
}
```

**Gmail Setup** (Nodemailer):

- Use Gmail SMTP with App Password (not regular password)
- Configuration: `smtp.gmail.com:587`, TLS enabled
- Rate limit: 500 emails/day (sufficient for salon scale)

**İleti Merkezi Integration**:

- SDK: `@iletimerkezi/sdk` (unofficial, will need to verify or use REST API directly)
- DLR (Delivery Report) callback: webhook endpoint to receive delivery status
- Cost tracking: Store per-SMS cost in database for reporting (FR-048)

**Socket.io Setup**:

- NestJS Gateway with JWT authentication
- User rooms: `user:${userId}` for registered, `guest:${trackingCode}` for guests
- Events: `appointment.created`, `appointment.confirmed`, `appointment.cancelled`, `payment.reminder`

**Alternatives Considered**:

- **SendGrid/Mailgun**: Rejected, Constitution requires Gmail (likely existing account)
- **Twilio SMS**: Rejected, spec explicitly requires İleti Merkezi (Turkish SMS provider)
- **WebSockets**: Considered native WebSocket, but Socket.io provides auto-reconnect and room management

**Context7 References**:

- Nodemailer: https://nodemailer.com/about/
- NestJS WebSocket Gateways: https://docs.nestjs.com/websockets/gateways
- BullMQ: https://docs.bullmq.io/

---

### 4. Audit Log Archival & Hash Chain

**Decision**: Implement cron job (BullMQ) to archive 90-day-old audit logs to JSONL files with SHA-256 hash chain for tamper detection.

**Rationale**:

- FR-062/063/064 require 90-day DB retention, append-only JSONL archival, hash chain integrity
- JSONL (JSON Lines) format: one JSON object per line, easy to stream and append
- Hash chain: each log entry includes `previousHash` field, making tampering detectable
- WORM storage (FR-065): Use filesystem with immutable flag or S3 with Object Lock

**Implementation Pattern**:

```typescript
// Audit log entity (Prisma)
model AuditLog {
  id            String   @id @default(cuid())
  timestamp     DateTime @default(now())
  action        String   // "appointment.override", "review.delete", etc.
  actor         User     @relation(fields: [actorId], references: [id])
  actorId       String
  targetEntity  String   // "Appointment", "Review", etc.
  targetId      String
  details       Json     // Change details
  justification String?  // For override actions
  hash          String   // SHA-256 of this entry + previousHash
  previousHash  String?  // Points to previous entry's hash
  archived      Boolean  @default(false)
}

// Archive job (runs daily at 2 AM)
@Cron('0 2 * * *') // Every day at 2 AM
async archiveOldLogs() {
  const cutoffDate = subDays(new Date(), 90);
  const logsToArchive = await this.auditRepository.findOlderThan(cutoffDate);

  if (logsToArchive.length === 0) return;

  const archiveFile = `audit-logs-${format(cutoffDate, 'yyyy-MM')}.jsonl`;
  const filePath = `/var/audit-archives/${archiveFile}`;

  // Append to JSONL file
  const stream = createWriteStream(filePath, { flags: 'a' }); // append mode
  for (const log of logsToArchive) {
    stream.write(JSON.stringify(log) + '\n');
  }
  stream.end();

  // Verify hash chain before deletion
  const isValid = await this.verifyHashChain(logsToArchive);
  if (!isValid) {
    throw new Error('Hash chain integrity violation detected!');
  }

  // Mark as archived, then delete from DB
  await this.auditRepository.markArchived(logsToArchive.map(l => l.id));
  await this.auditRepository.deleteArchived();

  // Make file immutable (Linux)
  execSync(`chattr +i ${filePath}`);
}

// Hash chain verification
async verifyHashChain(logs: AuditLog[]): Promise<boolean> {
  let previousHash = logs[0].previousHash;

  for (const log of logs) {
    const expectedHash = this.computeHash(log, previousHash);
    if (log.hash !== expectedHash) {
      await this.alertAdmin(`Hash mismatch: log ${log.id}`);
      return false;
    }
    previousHash = log.hash;
  }

  return true;
}

// Hash computation
computeHash(log: AuditLog, previousHash: string | null): string {
  const data = JSON.stringify({
    timestamp: log.timestamp,
    action: log.action,
    actorId: log.actorId,
    targetEntity: log.targetEntity,
    targetId: log.targetId,
    details: log.details,
    previousHash: previousHash || 'genesis',
  });
  return createHash('sha256').update(data).digest('hex');
}
```

**WORM Storage Options**:

1. **Filesystem with `chattr +i`** (Linux immutable flag): Simple, suitable for VPS/dedicated server
2. **S3 with Object Lock**: Best for cloud deployments, enforces retention period
3. **Dedicated WORM media**: Overkill for salon scale

**Chosen**: Filesystem with `chattr +i` for MVP, document S3 migration path for production.

**Alternatives Considered**:

- **Blockchain**: Overkill for salon scale, high complexity
- **Database-only retention**: Violates FR-062 (must archive to files)

**Context7 References**:

- NestJS Scheduling: https://docs.nestjs.com/techniques/task-scheduling
- Node.js Crypto: https://nodejs.org/api/crypto.html
- JSONL format: http://jsonlines.org/

---

### 5. JWT + Role-Based Guards

**Decision**: Use `@nestjs/jwt` + `@nestjs/passport` with custom role guard, Redis for session blacklist.

**Rationale**:

- FR-008 requires JWT with role-based expiry (Admin 8h, Staff 12h, Customer 7d)
- FR-009 requires forced logout (session termination)
- Redis blacklist approach: store revoked JTI (JWT ID) in Redis with TTL matching token expiry

**Implementation Pattern**:

```typescript
// JWT payload
interface JwtPayload {
  sub: string;      // User ID
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  jti: string;      // JWT ID for revocation
  iat: number;
  exp: number;
}

// JWT module config
JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: '8h', // Override per role in service
  },
}),

// Auth service
class AuthService {
  async login(user: User) {
    const expiresIn = this.getExpiryForRole(user.role);
    const jti = uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn }),
      expires_in: expiresIn,
    };
  }

  getExpiryForRole(role: string): string {
    switch (role) {
      case 'ADMIN': return '8h';
      case 'STAFF': return '12h';
      case 'CUSTOMER': return '7d';
    }
  }

  async logout(jti: string, exp: number) {
    const ttl = exp - Math.floor(Date.now() / 1000); // seconds until expiry
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
  }
}

// JWT strategy (passport)
@Injectable()
class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload) {
    // Check blacklist
    const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revoked');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

// Role guard
@Injectable()
class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.includes(user.role);
  }
}

// Decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Controller usage
@Post('/admin/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async createInvitation(@Body() dto: CreateInvitationDto) {
  // Only admins can access
}
```

**Session Expiry Handling**:

- Frontend: Store `expires_at` in localStorage, auto-logout when expired
- Refresh token: Optional for Customer role (7d is already long), can add later if needed

**Alternatives Considered**:

- **Refresh Token**: Not required for FR-008, can be added in future if needed
- **Session-based auth**: Rejected, Constitution implies JWT (stateless)

**Context7 References**:

- NestJS JWT: https://docs.nestjs.com/security/authentication#jwt-functionality
- NestJS Guards: https://docs.nestjs.com/guards

---

### 6. Zustand + TanStack Query Integration

**Decision**: Use Zustand for client state (auth, UI modals), TanStack Query for server state (API data), with optimistic updates for appointments.

**Rationale**:

- Zustand: Minimal boilerplate, TypeScript-friendly, good for auth state and UI state
- TanStack Query: Built-in caching, automatic refetching, optimistic updates, SSR support (Next.js)
- Clear separation: Zustand for "client concerns", TanStack Query for "server concerns"

**Implementation Pattern**:

```typescript
// Zustand store: Auth state
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "auth-storage" }
  )
);

// TanStack Query: Appointments data
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: () => fetch("/api/appointments").then((res) => res.json()),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentDto) =>
      fetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((res) => res.json()),

    // Optimistic update
    onMutate: async (newAppointment) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      const previous = queryClient.getQueryData(["appointments"]);

      queryClient.setQueryData(["appointments"], (old: any[]) => [
        ...old,
        { ...newAppointment, id: "temp-id", status: "PENDING" },
      ]);

      return { previous };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(["appointments"], context?.previous);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
```

**TanStack Query SSR Setup** (Next.js App Router):

```typescript
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Alternatives Considered**:

- **Redux**: Overkill for salon app scale, more boilerplate than Zustand
- **SWR**: TanStack Query has better TypeScript support and more features (optimistic updates)

**Context7 References**:

- Zustand: https://docs.pmnd.rs/zustand/getting-started/introduction
- TanStack Query: https://tanstack.com/query/latest/docs/react/overview
- TanStack Query SSR: https://tanstack.com/query/latest/docs/react/guides/ssr

---

### 7. WCAG 2.1 AA Compliance

**Decision**: Implement ARIA live regions for form errors, keyboard navigation for modals/drawers, focus trap and visible focus indicators.

**Rationale**:

- FR-067a requires ARIA live regions for form errors (screen reader announcement)
- FR-067b requires visible focus indicators for all interactive elements
- Constitution (§V) requires WCAG 2.1 AA compliance

**Implementation Pattern**:

**ARIA Live Region for Form Errors**:

```typescript
// components/forms/AppointmentForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function AppointmentForm() {
  const {
    register,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(appointmentSchema),
  });

  return (
    <form>
      {/* ARIA live region for form-level errors */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only" // Screen reader only
      >
        {Object.values(errors)
          .map((err) => err?.message)
          .filter(Boolean)
          .join(", ")}
      </div>

      <label htmlFor="service">Hizmet</label>
      <select id="service" {...register("service")} aria-required="true">
        <option value="">Seçiniz</option>
      </select>
      {errors.service && (
        <span role="alert" className="text-red-500">
          {errors.service.message}
        </span>
      )}
    </form>
  );
}
```

**Keyboard Navigation & Focus Management** (Modal):

```typescript
// components/ui/Modal.tsx
"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "@headlessui/react"; // Or Shadcn Dialog

export function Modal({ isOpen, onClose, children }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus(); // Focus trap
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} initialFocus={closeButtonRef}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-white rounded p-6">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Kapat
          </button>
          {children}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

**Visible Focus Indicators** (Tailwind v4):

```css
/* globals.css */
*:focus-visible {
  outline: 2px solid theme("colors.blue.500");
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible {
  @apply ring-2 ring-blue-500 ring-offset-2;
}
```

**Keyboard Shortcuts**:

- `Esc`: Close modals/drawers
- `Tab`: Navigate through interactive elements
- `Enter`/`Space`: Activate buttons
- Arrow keys: Navigate in select/datepicker

**Testing**:

- Use `axe-core` (via `@axe-core/react`) to detect violations in development
- Manual testing with screen readers (NVDA on Windows, VoiceOver on macOS)

**Alternatives Considered**:

- **Radix UI Primitives**: Considered for accessible components, but Shadcn/UI already uses Radix under the hood
- **Manual ARIA**: Too error-prone, prefer library-based solutions (Shadcn/Headless UI)

**Context7 References**:

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Live Regions: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
- React Hook Form Accessibility: https://react-hook-form.com/advanced-usage#Accessibility

---

### 8. CSV/XLSX Export

**Decision**: Use `xlsx` library for server-side generation, stream large reports to avoid memory issues.

**Rationale**:

- FR-051 requires CSV and XLSX export for reports
- Server-side generation ensures data security (no client-side exposure of full dataset)
- Streaming approach handles large reports (e.g., 1-year payment history)

**Implementation Pattern**:

```typescript
// Backend: reports.service.ts
import * as XLSX from 'xlsx';
import { Response } from 'express';

class ReportsService {
  async exportAppointments(filters: ReportFilters, format: 'csv' | 'xlsx', res: Response) {
    const appointments = await this.appointmentsRepository.findWithFilters(filters);

    const data = appointments.map(a => ({
      'Tarih': format(a.date, 'dd/MM/yyyy'),
      'Saat': a.time,
      'Müşteri': `${a.customer.firstName} ${a.customer.lastName}`,
      'Hizmet': a.service.name,
      'Personel': `${a.staff.firstName} ${a.staff.lastName}`,
      'Durum': a.status,
      'Ödeme': a.payment?.amount || 'Beklemede',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Randevular');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=randevular.csv');
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=randevular.xlsx');
      res.send(buffer);
    }
  }
}

// Controller
@Get('/reports/export')
@Roles('ADMIN')
async exportReport(
  @Query() filters: ReportFiltersDto,
  @Query('format') format: 'csv' | 'xlsx',
  @Res() res: Response,
) {
  await this.reportsService.exportAppointments(filters, format, res);
}
```

**Frontend: Trigger Download**:

```typescript
// Frontend: use-reports.ts
export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      filters,
      format,
    }: {
      filters: ReportFilters;
      format: "csv" | "xlsx";
    }) => {
      const params = new URLSearchParams({ ...filters, format });
      const response = await fetch(`/api/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `randevular.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}
```

**Streaming for Large Reports** (optional optimization):

```typescript
import { Readable } from 'stream';

async exportLargeReport(res: Response) {
  const stream = this.appointmentsRepository.streamWithFilters(filters);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=large-report.csv');

  // Write CSV header
  res.write('Tarih,Saat,Müşteri,Hizmet\n');

  // Stream rows
  for await (const appointment of stream) {
    const row = `${appointment.date},${appointment.time},${appointment.customer.name},${appointment.service.name}\n`;
    res.write(row);
  }

  res.end();
}
```

**Alternatives Considered**:

- **json2csv**: Simpler but CSV-only, xlsx library handles both formats
- **Client-side export**: Rejected for security (exposes full dataset to client)

**Context7 References**:

- xlsx (SheetJS): https://docs.sheetjs.com/
- NestJS Streaming: https://docs.nestjs.com/techniques/streaming-files

---

## Summary

All 8 research topics resolved with concrete implementation patterns. Key decisions:

- **Backend**: Layered architecture (domain → repository → service → usecase → controller), Prisma isolated to repository layer
- **Frontend**: Next.js 15 App Router with route groups, Server + Client Components, Shadcn/UI
- **Notifications**: Strategy pattern with BullMQ retry queue, Gmail (Nodemailer), İleti Merkezi SMS, Socket.io
- **Audit**: JSONL archival with SHA-256 hash chain, cron job for 90-day cleanup, filesystem WORM (chattr +i)
- **Auth**: JWT with role-based expiry, Redis blacklist for forced logout
- **State Management**: Zustand (client state), TanStack Query (server state)
- **Accessibility**: ARIA live regions, focus trap, visible focus indicators, axe-core testing
- **Export**: xlsx library for server-side CSV/XLSX generation

**Status**: ✅ Phase 0 Complete - Ready for Phase 1 (Design & Contracts)

---

_Next: Phase 1 - data-model.md, contracts/, quickstart.md, CURSOR.md_
