/**
 * Test mock yardımcı fonksiyonları
 *
 * Bu dosya test sırasında kullanılacak mock'ları sağlar:
 * - Prisma mock'ları
 * - Service mock'ları
 * - External API mock'ları
 */

import { PrismaClient } from "@prisma/client";

/**
 * Prisma mock'u oluşturur
 * Test sırasında gerçek veritabanı yerine mock kullanır
 */
export function createPrismaMock() {
  return {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    workingHours: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    specialWorkingDay: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    serviceNote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  } as unknown as PrismaClient;
}

/**
 * JWT Service mock'u oluşturur
 */
export function createJwtServiceMock() {
  return {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
    verify: jest.fn().mockReturnValue({
      sub: "user-id",
      email: "test@example.com",
      role: "CUSTOMER",
      jti: "jwt-id",
    }),
    decode: jest.fn(),
  };
}

/**
 * Bcrypt Service mock'u oluşturur
 */
export function createBcryptServiceMock() {
  return {
    hash: jest.fn().mockResolvedValue("$2b$10$hashed.password"),
    compare: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Redis Service mock'u oluşturur
 */
export function createRedisServiceMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
  };
}

/**
 * Email Service mock'u oluşturur
 */
export function createEmailServiceMock() {
  return {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
    sendAppointmentConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendAppointmentReminder: jest.fn().mockResolvedValue({ success: true }),
  };
}

/**
 * SMS Service mock'u oluşturur
 */
export function createSmsServiceMock() {
  return {
    sendSms: jest.fn().mockResolvedValue({ success: true, messageId: "sms-123" }),
    sendAppointmentConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendTrackingCode: jest.fn().mockResolvedValue({ success: true }),
  };
}

/**
 * Socket.io Gateway mock'u oluşturur
 */
export function createSocketGatewayMock() {
  return {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    server: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    },
  };
}

/**
 * BullMQ Queue mock'u oluşturur
 */
export function createQueueMock() {
  return {
    add: jest.fn().mockResolvedValue({ id: "job-123" }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    clean: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Logger mock'u oluşturur
 */
export function createLoggerMock() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

/**
 * Config Service mock'u oluşturur
 */
export function createConfigServiceMock() {
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string | number> = {
        DATABASE_URL: "postgresql://test:test@localhost:5432/yildiz_salon_test",
        JWT_SECRET: "test-jwt-secret",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        GMAIL_USER: "test@gmail.com",
        GMAIL_APP_PASSWORD: "test-app-password",
        ILETI_MERKEZI_API_KEY: "test-api-key",
        NODE_ENV: "test",
        PORT: 3001,
      };
      return config[key];
    }),
  };
}

/**
 * Tüm mock'ları temizler
 */
export function clearAllMocks() {
  jest.clearAllMocks();
  jest.resetAllMocks();
}

/**
 * Mock'ları restore eder
 */
export function restoreAllMocks() {
  jest.restoreAllMocks();
}

/**
 * Test için mock data oluşturur
 */
export function createMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    phone: "+905551234567",
    passwordHash: "$2b$10$hashed.password",
    firstName: "Test",
    lastName: "User",
    role: "CUSTOMER",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCustomer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "customer-123",
    userId: "user-123",
    type: "REGISTERED",
    firstName: "Test",
    lastName: "Customer",
    email: "customer@example.com",
    phone: "+905551234567",
    birthDate: null,
    notes: null,
    totalAppointments: 0,
    totalSpent: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "appointment-123",
    customerId: "customer-123",
    staffId: "staff-123",
    serviceId: "service-123",
    date: new Date("2024-01-15"),
    time: "10:00",
    status: "PENDING",
    creationMethod: "ONLINE_GUEST",
    trackingCode: "TEST1234",
    notes: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
