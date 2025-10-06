/**
 * AuditLogRepository Unit Tests (T019)
 *
 * AuditLogRepository'nin temel CRUD operasyonlarını ve
 * audit log özelliklerini (hash chain, archival) test eder.
 *
 * @module test/unit/repositories
 */

import { Test, TestingModule } from "@nestjs/testing";
import { AuditLog, Prisma } from "@prisma/client";
import { AuditLogRepository } from "../../../src/repositories/audit-log.repository";
import { PrismaService } from "../../../src/common/prisma.service";

describe("AuditLogRepository (T019)", () => {
  let repository: AuditLogRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    // Mock PrismaService
    mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    repository = module.get<AuditLogRepository>(AuditLogRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create audit log entry with actor details", async () => {
      const timestamp = new Date();
      const createInput: Prisma.AuditLogCreateInput = {
        timestamp,
        action: "auth.login_failed",
        actor: { connect: { id: "user-123" } },
        targetEntity: "User",
        targetId: "user-123",
        details: { reason: "Invalid password", attempts: 3 },
        hash: "abc123hash",
        previousHash: null,
      };

      const expectedAuditLog: AuditLog = {
        id: "audit-log-1",
        timestamp,
        action: "auth.login_failed",
        actorId: "user-123",
        targetEntity: "User",
        targetId: "user-123",
        details: { reason: "Invalid password", attempts: 3 },
        justification: null,
        hash: "abc123hash",
        previousHash: null,
        archived: false,
        createdAt: timestamp,
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        ...expectedAuditLog,
        actor: {
          id: "user-123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        },
      } as any);

      const result = await repository.create(createInput);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: createInput,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result.action).toBe("auth.login_failed");
      expect(result.actorId).toBe("user-123");
    });

    it("should create audit log for invitation creation", async () => {
      const timestamp = new Date();
      const createInput: Prisma.AuditLogCreateInput = {
        timestamp,
        action: "auth.invitation_created",
        actor: { connect: { id: "admin-123" } },
        targetEntity: "Invitation",
        targetId: "invite-abc",
        details: { email: "newuser@example.com", role: "STAFF" },
        hash: "def456hash",
        previousHash: "abc123hash",
      };

      const expectedAuditLog: AuditLog = {
        id: "audit-log-2",
        timestamp,
        action: "auth.invitation_created",
        actorId: "admin-123",
        targetEntity: "Invitation",
        targetId: "invite-abc",
        details: { email: "newuser@example.com", role: "STAFF" },
        justification: null,
        hash: "def456hash",
        previousHash: "abc123hash",
        archived: false,
        createdAt: timestamp,
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        ...expectedAuditLog,
        actor: {
          id: "admin-123",
          firstName: "Admin",
          lastName: "User",
          email: "admin@example.com",
        },
      } as any);

      const result = await repository.create(createInput);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: createInput,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      expect(result.action).toBe("auth.invitation_created");
      expect(result.previousHash).toBe("abc123hash");
    });
  });

  describe("findToArchive - FR-062", () => {
    it("should return entries older than 90 days that are not archived", async () => {
      const now = new Date();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const oldEntry: AuditLog = {
        id: "audit-old-1",
        timestamp: new Date("2024-01-01"),
        action: "auth.login_failed",
        actorId: "user-123",
        targetEntity: "User",
        targetId: "user-123",
        details: { reason: "Invalid password" },
        justification: null,
        hash: "oldHash123",
        previousHash: null,
        archived: false,
        createdAt: new Date("2024-01-01"),
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([oldEntry]);

      const result = await repository.findToArchive(90);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date),
          },
          archived: false,
        },
        orderBy: { timestamp: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("audit-old-1");
    });

    it("should support custom days for archival", async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await repository.findToArchive(180);

      const call = mockPrismaService.auditLog.findMany.mock.calls[0][0];
      const cutoffDate = call?.where?.timestamp?.lt as Date;

      // 180 gün önceki tarihi kontrol et
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 180);

      expect(cutoffDate.getTime()).toBeCloseTo(expectedCutoff.getTime(), -4); // 10 saniye tolerans
    });
  });

  describe("markArchived - FR-062", () => {
    it("should mark multiple entries as archived", async () => {
      const ids = ["audit-1", "audit-2", "audit-3"];

      mockPrismaService.auditLog.updateMany.mockResolvedValue({ count: 3 });

      const result = await repository.markArchived(ids);

      expect(mockPrismaService.auditLog.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          archived: true,
        },
      });
      expect(result).toBe(3);
    });

    it("should return 0 if no entries were marked", async () => {
      mockPrismaService.auditLog.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.markArchived(["non-existent-id"]);

      expect(result).toBe(0);
    });
  });

  describe("deleteArchived - FR-062", () => {
    it("should delete all archived entries", async () => {
      mockPrismaService.auditLog.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repository.deleteArchived();

      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          archived: true,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe("findLatest - Hash Chain", () => {
    it("should return the latest audit log entry", async () => {
      const latestEntry: AuditLog = {
        id: "audit-latest",
        timestamp: new Date(),
        action: "auth.invitation_created",
        actorId: "admin-123",
        targetEntity: "Invitation",
        targetId: "invite-abc",
        details: {},
        justification: null,
        hash: "latestHash",
        previousHash: "previousHash",
        archived: false,
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.findFirst.mockResolvedValue(latestEntry);

      const result = await repository.findLatest();

      expect(mockPrismaService.auditLog.findFirst).toHaveBeenCalledWith({
        orderBy: { timestamp: "desc" },
      });
      expect(result).toEqual(latestEntry);
      expect(result?.previousHash).toBe("previousHash");
    });

    it("should return null if no entries exist", async () => {
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      const result = await repository.findLatest();

      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return audit log entry with actor details", async () => {
      const entry: AuditLog = {
        id: "audit-123",
        timestamp: new Date(),
        action: "auth.login_failed",
        actorId: "user-123",
        targetEntity: "User",
        targetId: "user-123",
        details: { reason: "Invalid password" },
        justification: null,
        hash: "hash123",
        previousHash: null,
        archived: false,
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.findUnique.mockResolvedValue({
        ...entry,
        actor: {
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        },
      } as any);

      const result = await repository.findById("audit-123");

      expect(mockPrismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: "audit-123" },
        include: {
          actor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      expect(result?.id).toBe("audit-123");
    });
  });

  describe("findMany", () => {
    it("should return audit logs with filters", async () => {
      const entries: AuditLog[] = [
        {
          id: "audit-1",
          timestamp: new Date(),
          action: "auth.login_failed",
          actorId: "user-123",
          targetEntity: "User",
          targetId: "user-123",
          details: {},
          justification: null,
          hash: "hash1",
          previousHash: null,
          archived: false,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(entries as any);

      const result = await repository.findMany({
        where: { action: "auth.login_failed" },
        skip: 0,
        take: 10,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { action: "auth.login_failed" },
        orderBy: undefined,
        include: {
          actor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("count", () => {
    it("should return total count of audit logs", async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(42);

      const result = await repository.count();

      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({ where: undefined });
      expect(result).toBe(42);
    });

    it("should return count with filters", async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(5);

      const result = await repository.count({ action: "auth.login_failed" });

      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { action: "auth.login_failed" },
      });
      expect(result).toBe(5);
    });
  });

  describe("findByActor", () => {
    it("should return audit logs for a specific actor", async () => {
      const entries: AuditLog[] = [
        {
          id: "audit-1",
          timestamp: new Date(),
          action: "auth.invitation_created",
          actorId: "admin-123",
          targetEntity: "Invitation",
          targetId: "invite-abc",
          details: {},
          justification: null,
          hash: "hash1",
          previousHash: null,
          archived: false,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(entries);

      const result = await repository.findByActor("admin-123", 50);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorId: "admin-123" },
        orderBy: { timestamp: "desc" },
        take: 50,
      });
      expect(result).toHaveLength(1);
      expect(result[0].actorId).toBe("admin-123");
    });
  });

  describe("findByTarget", () => {
    it("should return audit logs for a specific target entity", async () => {
      const entries: AuditLog[] = [
        {
          id: "audit-1",
          timestamp: new Date(),
          action: "user.role_change",
          actorId: "admin-123",
          targetEntity: "User",
          targetId: "user-456",
          details: { oldRole: "CUSTOMER", newRole: "STAFF" },
          justification: null,
          hash: "hash1",
          previousHash: null,
          archived: false,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(entries as any);

      const result = await repository.findByTarget("User", "user-456");

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          targetEntity: "User",
          targetId: "user-456",
        },
        include: {
          actor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { timestamp: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].targetId).toBe("user-456");
    });
  });

  describe("findByAction", () => {
    it("should return audit logs for a specific action type", async () => {
      const entries: AuditLog[] = [
        {
          id: "audit-1",
          timestamp: new Date("2025-01-01"),
          action: "auth.login_failed",
          actorId: "user-123",
          targetEntity: "User",
          targetId: "user-123",
          details: { reason: "Invalid password", attempts: 1 },
          justification: null,
          hash: "hash1",
          previousHash: null,
          archived: false,
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "audit-2",
          timestamp: new Date("2025-01-02"),
          action: "auth.login_failed",
          actorId: "user-123",
          targetEntity: "User",
          targetId: "user-123",
          details: { reason: "Invalid password", attempts: 2 },
          justification: null,
          hash: "hash2",
          previousHash: "hash1",
          archived: false,
          createdAt: new Date("2025-01-02"),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(entries as any);

      const result = await repository.findByAction("auth.login_failed", 100);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: "auth.login_failed" },
        include: {
          actor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        take: 100,
      });
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe("auth.login_failed");
    });
  });

  describe("findByDateRange", () => {
    it("should return audit logs within date range", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const entries: AuditLog[] = [
        {
          id: "audit-1",
          timestamp: new Date("2025-01-15"),
          action: "auth.invitation_created",
          actorId: "admin-123",
          targetEntity: "Invitation",
          targetId: "invite-abc",
          details: {},
          justification: null,
          hash: "hash1",
          previousHash: null,
          archived: false,
          createdAt: new Date("2025-01-15"),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(entries as any);

      const result = await repository.findByDateRange(startDate, endDate);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          actor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { timestamp: "asc" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findChain - Hash Chain Verification", () => {
    it("should return entries for hash chain verification", async () => {
      const startEntry: AuditLog = {
        id: "audit-start",
        timestamp: new Date("2025-01-01"),
        action: "auth.login_failed",
        actorId: "user-123",
        targetEntity: "User",
        targetId: "user-123",
        details: {},
        justification: null,
        hash: "hash1",
        previousHash: null,
        archived: false,
        createdAt: new Date("2025-01-01"),
      };

      const chainEntries: AuditLog[] = [
        startEntry,
        {
          ...startEntry,
          id: "audit-2",
          timestamp: new Date("2025-01-02"),
          hash: "hash2",
          previousHash: "hash1",
        },
      ];

      mockPrismaService.auditLog.findUnique.mockResolvedValue({
        timestamp: new Date("2025-01-01"),
      } as any);
      mockPrismaService.auditLog.findMany.mockResolvedValue(chainEntries);

      const result = await repository.findChain("audit-start", 10);

      expect(mockPrismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: "audit-start" },
        select: { timestamp: true },
      });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: new Date("2025-01-01"),
          },
        },
        orderBy: { timestamp: "asc" },
        take: 10,
      });
      expect(result).toHaveLength(2);
      expect(result[1].previousHash).toBe("hash1");
    });
  });

  describe("Auth-specific audit logging scenarios (T019)", () => {
    it("should handle login failure audit log", async () => {
      const loginFailureLog: Prisma.AuditLogCreateInput = {
        timestamp: new Date(),
        action: "auth.login_failed",
        actor: { connect: { id: "user-123" } },
        targetEntity: "User",
        targetId: "user-123",
        details: {
          emailOrPhone: "user@example.com",
          reason: "Invalid password",
          attemptCount: 3,
          lockedUntil: null,
        },
        hash: "failureHash123",
        previousHash: "prevHash",
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: "audit-fail-1",
        ...loginFailureLog,
        actorId: "user-123",
        justification: null,
        archived: false,
        createdAt: new Date(),
        actor: {
          id: "user-123",
          firstName: "Failed",
          lastName: "User",
          email: "user@example.com",
        },
      } as any);

      const result = await repository.create(loginFailureLog);

      expect(result.action).toBe("auth.login_failed");
      expect(result.details).toHaveProperty("attemptCount", 3);
    });

    it("should handle invitation creation audit log", async () => {
      const invitationLog: Prisma.AuditLogCreateInput = {
        timestamp: new Date(),
        action: "auth.invitation_created",
        actor: { connect: { id: "admin-123" } },
        targetEntity: "Invitation",
        targetId: "invite-xyz",
        details: {
          email: "newstaff@example.com",
          role: "STAFF",
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        },
        hash: "inviteHash456",
        previousHash: "prevHash",
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: "audit-invite-1",
        ...invitationLog,
        actorId: "admin-123",
        justification: null,
        archived: false,
        createdAt: new Date(),
        actor: {
          id: "admin-123",
          firstName: "Admin",
          lastName: "User",
          email: "admin@example.com",
        },
      } as any);

      const result = await repository.create(invitationLog);

      expect(result.action).toBe("auth.invitation_created");
      expect(result.details).toHaveProperty("role", "STAFF");
    });

    it("should handle account lock audit log after failed login attempts", async () => {
      const lockLog: Prisma.AuditLogCreateInput = {
        timestamp: new Date(),
        action: "auth.account_locked",
        actor: { connect: { id: "user-123" } },
        targetEntity: "User",
        targetId: "user-123",
        details: {
          reason: "Too many failed login attempts",
          attemptCount: 5,
          lockDuration: "15 minutes",
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
        hash: "lockHash789",
        previousHash: "prevHash",
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: "audit-lock-1",
        ...lockLog,
        actorId: "user-123",
        justification: null,
        archived: false,
        createdAt: new Date(),
        actor: {
          id: "user-123",
          firstName: "Locked",
          lastName: "User",
          email: "locked@example.com",
        },
      } as any);

      const result = await repository.create(lockLog);

      expect(result.action).toBe("auth.account_locked");
      expect(result.details).toHaveProperty("attemptCount", 5);
      expect(result.details).toHaveProperty("lockDuration", "15 minutes");
    });
  });
});
