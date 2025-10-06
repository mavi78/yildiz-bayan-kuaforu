/**
 * UserRepository Unit Tests
 *
 * UserRepository servisinin unit testleri.
 * Prisma Client mock'lanarak repository davranışları test edilir.
 *
 * @module test/unit/repositories
 */

import { Test, TestingModule } from "@nestjs/testing";
import { UserRepository } from "../../../src/repositories/user.repository";
import { PrismaService } from "../../../src/common/prisma.service";
import { Role } from "@prisma/client";

describe("UserRepository", () => {
  let repository: UserRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const createData = {
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hashedPassword123",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
      };

      const expectedUser = {
        id: "cuid123",
        ...createData,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });

  describe("findById", () => {
    it("should find user by id", async () => {
      const userId = "cuid123";
      const expectedUser = {
        id: userId,
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await repository.findById(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it("should return null if user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should find user by email (case-insensitive)", async () => {
      const email = "TEST@EXAMPLE.COM";
      const expectedUser = {
        id: "cuid123",
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await repository.findByEmail(email);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });
  });

  describe("findByPhone", () => {
    it("should find user by phone number", async () => {
      const phone = "+905551234567";
      const expectedUser = {
        id: "cuid123",
        email: "test@example.com",
        phone,
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await repository.findByPhone(phone);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phone },
      });
    });
  });

  describe("findByEmailOrPhone", () => {
    it("should find user by email when input contains @", async () => {
      const email = "test@example.com";
      const expectedUser = {
        id: "cuid123",
        email,
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await repository.findByEmailOrPhone(email);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });

    it("should find user by phone when input does not contain @", async () => {
      const phone = "+905551234567";
      const expectedUser = {
        id: "cuid123",
        email: "test@example.com",
        phone,
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await repository.findByEmailOrPhone(phone);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phone },
      });
    });
  });

  describe("findMany", () => {
    it("should find users with filters", async () => {
      const expectedUsers = [
        {
          id: "cuid123",
          email: "test@example.com",
          phone: "+905551234567",
          passwordHash: "hash",
          firstName: "Ahmet",
          lastName: "Yılmaz",
          role: Role.STAFF,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expectedUsers);

      const result = await repository.findMany({
        role: Role.STAFF,
        isActive: true,
        skip: 0,
        take: 10,
      });

      expect(result).toEqual(expectedUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          role: Role.STAFF,
          isActive: true,
        },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  });

  describe("update", () => {
    it("should update user", async () => {
      const userId = "cuid123";
      const updateData = {
        firstName: "Mehmet",
        lastName: "Kaya",
      };

      const expectedUser = {
        id: userId,
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Mehmet",
        lastName: "Kaya",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const result = await repository.update(userId, updateData);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          email: undefined,
          phone: undefined,
          passwordHash: undefined,
          firstName: "Mehmet",
          lastName: "Kaya",
          isActive: undefined,
          lastLoginAt: undefined,
        },
      });
    });
  });

  describe("updateLastLogin", () => {
    it("should update last login timestamp", async () => {
      const userId = "cuid123";
      const now = new Date();

      const expectedUser = {
        id: userId,
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: now,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const result = await repository.updateLastLogin(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          lastLoginAt: expect.any(Date),
        },
      });
    });
  });

  describe("softDelete", () => {
    it("should soft delete user by setting isActive to false", async () => {
      const userId = "cuid123";

      const expectedUser = {
        id: userId,
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const result = await repository.softDelete(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isActive: false,
        },
      });
    });
  });

  describe("activate", () => {
    it("should activate user by setting isActive to true", async () => {
      const userId = "cuid123";

      const expectedUser = {
        id: userId,
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const result = await repository.activate(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isActive: true,
        },
      });
    });
  });

  describe("count", () => {
    it("should count users with filters", async () => {
      mockPrismaService.user.count.mockResolvedValue(5);

      const result = await repository.count({
        role: Role.STAFF,
        isActive: true,
      });

      expect(result).toBe(5);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          role: Role.STAFF,
          isActive: true,
        },
      });
    });
  });

  describe("exists", () => {
    it("should return true if user exists", async () => {
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await repository.exists("cuid123");

      expect(result).toBe(true);
    });

    it("should return false if user does not exist", async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await repository.exists("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("isEmailTaken", () => {
    it("should return true if email is taken", async () => {
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await repository.isEmailTaken("test@example.com");

      expect(result).toBe(true);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          id: undefined,
        },
      });
    });

    it("should return false if email is not taken", async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await repository.isEmailTaken("new@example.com");

      expect(result).toBe(false);
    });

    it("should exclude specific user when checking email", async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await repository.isEmailTaken("test@example.com", "exclude123");

      expect(result).toBe(false);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          id: { not: "exclude123" },
        },
      });
    });
  });

  describe("isPhoneTaken", () => {
    it("should return true if phone is taken", async () => {
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await repository.isPhoneTaken("+905551234567");

      expect(result).toBe(true);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          phone: "+905551234567",
          id: undefined,
        },
      });
    });

    it("should return false if phone is not taken", async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await repository.isPhoneTaken("+905559999999");

      expect(result).toBe(false);
    });

    it("should exclude specific user when checking phone", async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await repository.isPhoneTaken("+905551234567", "exclude123");

      expect(result).toBe(false);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          phone: "+905551234567",
          id: { not: "exclude123" },
        },
      });
    });
  });

  describe("findByIdWithRelations", () => {
    it("should find user with relations", async () => {
      const userId = "cuid123";
      const expectedUser = {
        id: userId,
        email: "test@example.com",
        phone: "+905551234567",
        passwordHash: "hash",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: "customer123",
          firstName: "Ahmet",
          lastName: "Yılmaz",
        },
        sentInvitations: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const result = await repository.findByIdWithRelations(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          customer: true,
          sentInvitations: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
    });
  });
});
