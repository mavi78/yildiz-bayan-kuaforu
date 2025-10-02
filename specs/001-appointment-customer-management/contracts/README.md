# API Contracts: Appointment & Customer Management Suite

**Date**: 2025-10-02  
**Phase**: 1 (Design & Contracts)  
**Status**: Structure ready for Phase 2 (Task generation)

## Overview

This directory contains API contracts (OpenAPI specs) and Socket.io event schemas for the appointment management system. Contracts serve as:

- **Design Specification**: Defines request/response formats before implementation
- **Contract Tests**: Each endpoint has a corresponding test validating schema
- **Documentation**: Auto-generates Swagger UI docs
- **Client SDK**: Can generate TypeScript client for frontend

## Directory Structure

```
contracts/
├── api/                  # REST API OpenAPI 3.0 specs
│   ├── auth.openapi.yaml         # Authentication endpoints
│   ├── appointments.openapi.yaml # Appointment CRUD + approval
│   ├── customers.openapi.yaml    # Customer management
│   ├── payments.openapi.yaml     # Payment tracking
│   ├── reports.openapi.yaml      # Reports + export
│   ├── notifications.openapi.yaml # Notification settings
│   ├── working-hours.openapi.yaml # Salon hours management
│   └── audit.openapi.yaml        # Audit log queries
├── events/               # Socket.io event schemas
│   └── notifications.yaml        # Real-time notification events
└── README.md             # This file
```

## Contract-Driven Development Workflow

### 1. Design Phase (Current)

- Define OpenAPI spec for each module
- Document request/response schemas
- Specify error responses
- Add examples

### 2. Contract Test Phase (Next: /tasks command)

- Generate contract tests from specs
- Tests FAIL (no implementation yet)
- Validates: schema, auth guards, role-based access

### 3. Implementation Phase

- Implement controllers, services, repositories
- Run contract tests
- Tests PASS when implementation matches contract

### 4. Integration Phase

- Frontend consumes API via generated TypeScript client
- E2E tests validate full user flows

## OpenAPI Spec Format

Each `*.openapi.yaml` file follows OpenAPI 3.0 structure:

```yaml
openapi: 3.0.0
info:
  title: Module Name API
  version: 1.0.0
servers:
  - url: http://localhost:3001/api
paths:
  /resource:
    get:
      summary: List resources
      security:
        - bearerAuth: []
      parameters: [...]
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ResourceListResponse"
        401:
          $ref: "#/components/responses/Unauthorized"
components:
  schemas:
    ResourceDTO: { ... }
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Socket.io Event Format

`events/notifications.yaml`:

```yaml
events:
  # Server → Client
  appointment:created:
    description: Appointment created notification
    payload:
      appointmentId: string
      customerId: string
      date: string (ISO 8601)
      time: string (HH:mm)
      status: PENDING | CONFIRMED

  # Client → Server
  subscribe:appointment:
    description: Subscribe to appointment updates
    payload:
      appointmentId: string
```

## Contract Test Example

```typescript
// test/contract/appointments.contract.spec.ts
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { OpenAPIValidator } from "express-openapi-validator";

describe("Appointments API Contract", () => {
  let app;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Attach OpenAPI validator
    app.use(
      OpenAPIValidator.middleware({
        apiSpec:
          "./specs/001-appointment-customer-management/contracts/api/appointments.openapi.yaml",
        validateRequests: true,
        validateResponses: true,
      })
    );

    await app.init();
  });

  it("GET /appointments returns 200 with valid schema", async () => {
    const token = getAdminToken(); // Helper

    const response = await request(app.getHttpServer())
      .get("/api/appointments")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Validator automatically checks response schema
    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("POST /appointments with invalid DTO returns 400", async () => {
    await request(app.getHttpServer())
      .post("/api/appointments")
      .send({ invalidField: "test" }) // Missing required fields
      .expect(400);
  });
});
```

## API Module Summaries

### auth.openapi.yaml

- POST /auth/register (with invitation token)
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh (optional)
- POST /admin/invitations (Admin only)
- GET /admin/invitations

### appointments.openapi.yaml

- POST /appointments (guest or registered)
- GET /appointments (role-based filtering)
- GET /appointments/:id
- PATCH /appointments/:id/approve (Staff/Admin)
- PATCH /appointments/:id/override (Admin, requires justification)
- PATCH /appointments/:id/cancel
- PATCH /appointments/:id/complete
- POST /appointments/:id/notes (ServiceNote, Staff/Admin)
- GET /appointments/track/:trackingCode (public)

### customers.openapi.yaml

- POST /customers (manual guest creation, Staff/Admin)
- GET /customers
- GET /customers/:id
- PATCH /customers/:id
- POST /customers/:id/invite (convert guest → registered)
- POST /customers/:id/reviews (registered only)
- GET /customers/:id/reviews

### payments.openapi.yaml

- POST /payments
- GET /payments (role-based)
- GET /payments/veresiye (veresiye tracking)
- PATCH /payments/:id

### reports.openapi.yaml

- GET /reports/appointments?filters
- GET /reports/payments (Admin only)
- GET /reports/export?format=csv|xlsx

### working-hours.openapi.yaml

- GET /working-hours
- PUT /admin/working-hours (Admin)
- GET /special-working-days
- POST /admin/special-working-days (Admin)
- DELETE /admin/special-working-days/:id

### audit.openapi.yaml

- GET /admin/audit-logs (Admin only, with filters)

### notifications.yaml (Socket.io)

- appointment:created
- appointment:confirmed
- appointment:cancelled
- payment:reminder
- subscribe:appointment
- unsubscribe:appointment

## Generating TypeScript Client

```bash
# Install OpenAPI generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i specs/001-appointment-customer-management/contracts/api/appointments.openapi.yaml \
  -g typescript-axios \
  -o frontend/src/lib/api-client

# Use in frontend
import { AppointmentsApi } from '@/lib/api-client';

const api = new AppointmentsApi();
const appointments = await api.listAppointments();
```

## Next Steps (Phase 2: /tasks command)

1. Complete OpenAPI spec files for all 8 modules
2. Generate contract tests from specs
3. Document expected test coverage (>80% for contracts)
4. Create tasks for implementing each endpoint

---

**Contract Files**: 8 API modules + 1 Socket.io events  
**Estimated Endpoints**: ~35 REST endpoints  
**Test Coverage Target**: 100% contract coverage (all endpoints)

**Status**: ✅ Structure ready - OpenAPI specs to be written during task generation phase
