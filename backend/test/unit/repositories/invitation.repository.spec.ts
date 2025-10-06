/**
 * InvitationRepository Unit Tests
 *
 * InvitationRepository servisinin unit testleri.
 * Prisma Client mock'lanarak repository davranışları test edilir.
 *
 * @module test/unit/repositories
 */

import { Test, TestingModule } from "@nestjs/testing";
import { InvitationRepository } from "../../../src/repositories/invitation.repository";
import { PrismaService } from "../../../src/common/prisma.service";
import { Role } from "@prisma/client";

describe("InvitationRepository", () => {
  let repository: InvitationRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<InvitationRepository>(InvitationRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("create", () => {
    it("should create a new invitation", async () => {
      const createData = {
        token: "uuid-token-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      const expectedInvitation = {
        id: "cuid123",
        token: createData.token,
        email: createData.email.toLowerCase(),
        role: createData.role,
        inviterId: createData.inviterId,
        guestCustomerId: null,
        isUsed: false,
        expiresAt: createData.expiresAt,
        usedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.invitation.create.mockResolvedValue(expectedInvitation);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.create).toHaveBeenCalledWith({
        data: {
          token: createData.token,
          email: createData.email.toLowerCase(),
          role: createData.role,
          inviterId: createData.inviterId,
          guestCustomerId: undefined,
          expiresAt: createData.expiresAt,
        },
      });
    });

    it("should create invitation with guest customer", async () => {
      const createData = {
        token: "uuid-token-123",
        email: "guest@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: "guest123",
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      const expectedInvitation = {
        id: "cuid123",
        ...createData,
        email: createData.email.toLowerCase(),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.invitation.create.mockResolvedValue(expectedInvitation);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.create).toHaveBeenCalledWith({
        data: {
          token: createData.token,
          email: createData.email.toLowerCase(),
          role: createData.role,
          inviterId: createData.inviterId,
          guestCustomerId: createData.guestCustomerId,
          expiresAt: createData.expiresAt,
        },
      });
    });
  });

  describe("findByToken", () => {
    it("should find invitation by token", async () => {
      const token = "uuid-token-123";
      const expectedInvitation = {
        id: "cuid123",
        token,
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: null,
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.invitation.findUnique.mockResolvedValue(expectedInvitation);

      const result = await repository.findByToken(token);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.findUnique).toHaveBeenCalledWith({
        where: { token },
      });
    });

    it("should return null if invitation not found", async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue(null);

      const result = await repository.findByToken("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByTokenWithRelations", () => {
    it("should find invitation with relations", async () => {
      const token = "uuid-token-123";
      const expectedInvitation = {
        id: "cuid123",
        token,
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: null,
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
        inviter: {
          id: "inviter123",
          firstName: "Ahmet",
          lastName: "Yılmaz",
          email: "admin@example.com",
          role: Role.ADMIN,
        },
        guestCustomer: null,
      };

      mockPrismaService.invitation.findUnique.mockResolvedValue(expectedInvitation);

      const result = await repository.findByTokenWithRelations(token);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.findUnique).toHaveBeenCalledWith({
        where: { token },
        include: {
          inviter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          guestCustomer: true,
        },
      });
    });
  });

  describe("findActiveByEmail", () => {
    it("should find active invitation by email", async () => {
      const email = "test@example.com";
      const now = new Date();
      const futureDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      const expectedInvitation = {
        id: "cuid123",
        token: "uuid-token-123",
        email: email.toLowerCase(),
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: null,
        isUsed: false,
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.invitation.findFirst.mockResolvedValue(expectedInvitation);

      const result = await repository.findActiveByEmail(email);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.findFirst).toHaveBeenCalledWith({
        where: {
          email: email.toLowerCase(),
          isUsed: false,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });

    it("should return null if no active invitation exists", async () => {
      mockPrismaService.invitation.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveByEmail("test@example.com");

      expect(result).toBeNull();
    });
  });

  describe("markUsed", () => {
    it("should mark invitation as used", async () => {
      const token = "uuid-token-123";
      const expectedInvitation = {
        id: "cuid123",
        token,
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: null,
        isUsed: true,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        usedAt: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrismaService.invitation.update.mockResolvedValue(expectedInvitation);

      const result = await repository.markUsed(token);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith({
        where: { token },
        data: {
          isUsed: true,
          usedAt: expect.any(Date),
        },
      });
    });
  });

  describe("deleteExpired", () => {
    it("should delete expired invitations", async () => {
      mockPrismaService.invitation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repository.deleteExpired();

      expect(result).toBe(5);
      expect(mockPrismaService.invitation.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
          isUsed: false,
        },
      });
    });

    it("should return 0 if no expired invitations", async () => {
      mockPrismaService.invitation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.deleteExpired();

      expect(result).toBe(0);
    });
  });

  describe("findByInviter", () => {
    it("should find invitations by inviter", async () => {
      const inviterId = "inviter123";
      const expectedInvitations = [
        {
          id: "cuid123",
          token: "uuid-token-123",
          email: "test@example.com",
          role: Role.CUSTOMER,
          inviterId,
          guestCustomerId: null,
          isUsed: false,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          usedAt: null,
          createdAt: new Date(),
          guestCustomer: null,
        },
      ];

      mockPrismaService.invitation.findMany.mockResolvedValue(expectedInvitations);

      const result = await repository.findByInviter(inviterId, {
        isUsed: false,
        skip: 0,
        take: 10,
      });

      expect(result).toEqual(expectedInvitations);
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith({
        where: {
          inviterId,
          isUsed: false,
        },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          guestCustomer: true,
        },
      });
    });
  });

  describe("findAll", () => {
    it("should find all invitations with filters", async () => {
      const expectedInvitations = [
        {
          id: "cuid123",
          token: "uuid-token-123",
          email: "test@example.com",
          role: Role.STAFF,
          inviterId: "inviter123",
          guestCustomerId: null,
          isUsed: false,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          usedAt: null,
          createdAt: new Date(),
          inviter: {
            id: "inviter123",
            firstName: "Ahmet",
            lastName: "Yılmaz",
            email: "admin@example.com",
          },
          guestCustomer: null,
        },
      ];

      mockPrismaService.invitation.findMany.mockResolvedValue(expectedInvitations);

      const result = await repository.findAll({
        isUsed: false,
        role: Role.STAFF,
        skip: 0,
        take: 10,
      });

      expect(result).toEqual(expectedInvitations);
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith({
        where: {
          isUsed: false,
          role: Role.STAFF,
        },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          inviter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          guestCustomer: true,
        },
      });
    });
  });

  describe("count", () => {
    it("should count invitations with filters", async () => {
      mockPrismaService.invitation.count.mockResolvedValue(3);

      const result = await repository.count({
        isUsed: false,
        inviterId: "inviter123",
        role: Role.CUSTOMER,
      });

      expect(result).toBe(3);
      expect(mockPrismaService.invitation.count).toHaveBeenCalledWith({
        where: {
          isUsed: false,
          inviterId: "inviter123",
          role: Role.CUSTOMER,
        },
      });
    });
  });

  describe("exists", () => {
    it("should return true if invitation exists", async () => {
      mockPrismaService.invitation.count.mockResolvedValue(1);

      const result = await repository.exists("uuid-token-123");

      expect(result).toBe(true);
    });

    it("should return false if invitation does not exist", async () => {
      mockPrismaService.invitation.count.mockResolvedValue(0);

      const result = await repository.exists("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("isValid", () => {
    it("should return true if invitation is valid", async () => {
      mockPrismaService.invitation.count.mockResolvedValue(1);

      const result = await repository.isValid("uuid-token-123");

      expect(result).toBe(true);
      expect(mockPrismaService.invitation.count).toHaveBeenCalledWith({
        where: {
          token: "uuid-token-123",
          isUsed: false,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
      });
    });

    it("should return false if invitation is not valid", async () => {
      mockPrismaService.invitation.count.mockResolvedValue(0);

      const result = await repository.isValid("expired-token");

      expect(result).toBe(false);
    });
  });

  describe("findExpiringBefore", () => {
    it("should find invitations expiring within specified hours", async () => {
      const hoursBeforeExpiry = 24;
      const expectedInvitations = [
        {
          id: "cuid123",
          token: "uuid-token-123",
          email: "test@example.com",
          role: Role.CUSTOMER,
          inviterId: "inviter123",
          guestCustomerId: null,
          isUsed: false,
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
          usedAt: null,
          createdAt: new Date(),
          inviter: {
            firstName: "Ahmet",
            lastName: "Yılmaz",
          },
        },
      ];

      mockPrismaService.invitation.findMany.mockResolvedValue(expectedInvitations);

      const result = await repository.findExpiringBefore(hoursBeforeExpiry);

      expect(result).toEqual(expectedInvitations);
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith({
        where: {
          isUsed: false,
          expiresAt: {
            gt: expect.any(Date),
            lt: expect.any(Date),
          },
        },
        include: {
          inviter: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  });

  describe("findByGuestCustomer", () => {
    it("should find invitations by guest customer", async () => {
      const guestCustomerId = "guest123";
      const expectedInvitations = [
        {
          id: "cuid123",
          token: "uuid-token-123",
          email: "guest@example.com",
          role: Role.CUSTOMER,
          inviterId: "inviter123",
          guestCustomerId,
          isUsed: false,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          usedAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.invitation.findMany.mockResolvedValue(expectedInvitations);

      const result = await repository.findByGuestCustomer(guestCustomerId);

      expect(result).toEqual(expectedInvitations);
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith({
        where: {
          guestCustomerId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  });

  describe("delete", () => {
    it("should delete invitation", async () => {
      const token = "uuid-token-123";
      const expectedInvitation = {
        id: "cuid123",
        token,
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: null,
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.invitation.delete.mockResolvedValue(expectedInvitation);

      const result = await repository.delete(token);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.delete).toHaveBeenCalledWith({
        where: { token },
      });
    });
  });

  describe("regenerateToken", () => {
    it("should regenerate invitation token", async () => {
      const oldToken = "old-token-123";
      const newToken = "new-token-456";
      const newExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const expectedInvitation = {
        id: "cuid123",
        token: newToken,
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "inviter123",
        guestCustomerId: null,
        isUsed: false,
        expiresAt: newExpiresAt,
        usedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.invitation.update.mockResolvedValue(expectedInvitation);

      const result = await repository.regenerateToken(oldToken, newToken, newExpiresAt);

      expect(result).toEqual(expectedInvitation);
      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith({
        where: { token: oldToken },
        data: {
          token: newToken,
          expiresAt: newExpiresAt,
        },
      });
    });
  });
});
