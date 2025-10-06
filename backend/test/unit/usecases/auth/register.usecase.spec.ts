/**
 * RegisterUsecase Unit Tests
 *
 * Register usecase'inin unit testleri.
 * FR-001 ile FR-004 gereksinimlerini test eder.
 *
 * @module test/unit/usecases/auth
 */

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { RegisterUsecase } from "../../../../src/usecases/auth/register.usecase";
import { InvitationService } from "../../../../src/services/invitation.service";
import { UserRepository } from "../../../../src/repositories/user.repository";
import { AuthService } from "../../../../src/services/auth.service";
import { CustomerService } from "../../../../src/services/customer.service";

describe("RegisterUsecase", () => {
  let usecase: RegisterUsecase;
  let invitationService: InvitationService;
  let userRepository: UserRepository;
  let authService: AuthService;
  let customerService: CustomerService;

  const mockInvitationService = {
    validateNotExpired: jest.fn(),
    markUsed: jest.fn(),
    getRemainingHours: jest.fn(),
  };

  const mockUserRepository = {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn(),
    login: jest.fn(),
  };

  const mockCustomerService = {
    convertGuestToRegistered: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUsecase,
        {
          provide: InvitationService,
          useValue: mockInvitationService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
      ],
    }).compile();

    usecase = module.get<RegisterUsecase>(RegisterUsecase);
    invitationService = module.get<InvitationService>(InvitationService);
    userRepository = module.get<UserRepository>(UserRepository);
    authService = module.get<AuthService>(AuthService);
    customerService = module.get<CustomerService>(CustomerService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(usecase).toBeDefined();
  });

  describe("execute - FR-001: Invitation-Only Registration", () => {
    it("should reject registration without valid invitation token", async () => {
      const input = {
        token: "invalid-token",
        firstName: "Ahmet",
        lastName: "Yılmaz",
        phone: "+905551234567",
        password: "Password123",
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: false,
        reason: "Davet bulunamadı",
      });

      await expect(usecase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(usecase.execute(input)).rejects.toThrow("Davet bulunamadı");
    });

    it("should reject registration with expired invitation token (FR-002)", async () => {
      const input = {
        token: "expired-token",
        firstName: "Mehmet",
        lastName: "Kaya",
        phone: "+905559876543",
        password: "Password123",
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: false,
        reason: "Davet süresi dolmuş",
      });

      await expect(usecase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(usecase.execute(input)).rejects.toThrow("Davet süresi dolmuş");
    });

    it("should allow registration with valid invitation token", async () => {
      const input = {
        token: "valid-token-123",
        firstName: "Ayşe",
        lastName: "Demir",
        phone: "+905551112233",
        password: "Password123",
      };

      const invitation = {
        id: "inv-123",
        token: "valid-token-123",
        email: "ayse@example.com",
        role: Role.CUSTOMER,
        inviterId: "admin-123",
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockAuthService.hashPassword.mockResolvedValue("hashed-password");

      const createdUser = {
        id: "user-123",
        email: "ayse@example.com",
        phone: "+905551112233",
        passwordHash: "hashed-password",
        firstName: "Ayşe",
        lastName: "Demir",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.create.mockResolvedValue(createdUser);

      mockAuthService.login.mockResolvedValue({
        access_token: "jwt-token",
        expires_in: "7d",
        user: {
          id: "user-123",
          email: "ayse@example.com",
          firstName: "Ayşe",
          lastName: "Demir",
          role: Role.CUSTOMER,
        },
      });

      const result = await usecase.execute(input);

      expect(result.access_token).toBe("jwt-token");
      expect(result.user.email).toBe("ayse@example.com");
      expect(mockInvitationService.markUsed).toHaveBeenCalledWith("valid-token-123");
    });
  });

  describe("execute - FR-004: Email and Phone Uniqueness", () => {
    const validInvitation = {
      id: "inv-123",
      token: "valid-token",
      email: "test@example.com",
      role: Role.CUSTOMER,
      inviterId: "admin-123",
      isUsed: false,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation: validInvitation,
      });
    });

    it("should reject registration with duplicate email", async () => {
      const input = {
        token: "valid-token",
        firstName: "Test",
        lastName: "User",
        phone: "+905551234567",
        password: "Password123",
      };

      mockUserRepository.findByEmail.mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      await expect(usecase.execute(input)).rejects.toThrow(ConflictException);
      await expect(usecase.execute(input)).rejects.toThrow("test@example.com email adresi zaten kullanılıyor");
    });

    it("should reject registration with duplicate phone", async () => {
      const input = {
        token: "valid-token",
        firstName: "Test",
        lastName: "User",
        phone: "+905551234567",
        password: "Password123",
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue({
        id: "existing-user",
        phone: "+905551234567",
      });

      await expect(usecase.execute(input)).rejects.toThrow(ConflictException);
      await expect(usecase.execute(input)).rejects.toThrow("+905551234567 telefon numarası zaten kullanılıyor");
    });
  });

  describe("execute - FR-005: Role Assignment from Invitation", () => {
    const baseInput = {
      token: "valid-token",
      firstName: "Test",
      lastName: "User",
      phone: "+905551234567",
      password: "Password123",
    };

    beforeEach(() => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockAuthService.hashPassword.mockResolvedValue("hashed-password");
    });

    it("should assign ADMIN role from invitation", async () => {
      const invitation = {
        id: "inv-admin",
        token: "valid-token",
        email: "admin@example.com",
        role: Role.ADMIN,
        inviterId: "super-admin",
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.create.mockResolvedValue({
        id: "admin-user",
        email: "admin@example.com",
        role: Role.ADMIN,
        firstName: "Test",
        lastName: "User",
      });

      mockAuthService.login.mockResolvedValue({
        access_token: "admin-jwt",
        expires_in: "8h",
        user: { id: "admin-user", email: "admin@example.com", role: Role.ADMIN, firstName: "Test", lastName: "User" },
      });

      const result = await usecase.execute(baseInput);

      expect(result.user.role).toBe(Role.ADMIN);
      expect(result.expires_in).toBe("8h"); // Admin token expiry
    });

    it("should assign STAFF role from invitation", async () => {
      const invitation = {
        id: "inv-staff",
        token: "valid-token",
        email: "staff@example.com",
        role: Role.STAFF,
        inviterId: "admin-123",
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.create.mockResolvedValue({
        id: "staff-user",
        email: "staff@example.com",
        role: Role.STAFF,
        firstName: "Test",
        lastName: "User",
      });

      mockAuthService.login.mockResolvedValue({
        access_token: "staff-jwt",
        expires_in: "12h",
        user: { id: "staff-user", email: "staff@example.com", role: Role.STAFF, firstName: "Test", lastName: "User" },
      });

      const result = await usecase.execute(baseInput);

      expect(result.user.role).toBe(Role.STAFF);
      expect(result.expires_in).toBe("12h"); // Staff token expiry
    });

    it("should assign CUSTOMER role from invitation", async () => {
      const invitation = {
        id: "inv-customer",
        token: "valid-token",
        email: "customer@example.com",
        role: Role.CUSTOMER,
        inviterId: "admin-123",
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.create.mockResolvedValue({
        id: "customer-user",
        email: "customer@example.com",
        role: Role.CUSTOMER,
        firstName: "Test",
        lastName: "User",
      });

      mockAuthService.login.mockResolvedValue({
        access_token: "customer-jwt",
        expires_in: "7d",
        user: {
          id: "customer-user",
          email: "customer@example.com",
          role: Role.CUSTOMER,
          firstName: "Test",
          lastName: "User",
        },
      });

      const result = await usecase.execute(baseInput);

      expect(result.user.role).toBe(Role.CUSTOMER);
      expect(result.expires_in).toBe("7d"); // Customer token expiry
    });
  });

  describe("execute - FR-006: Password Hashing", () => {
    it("should hash password before storing", async () => {
      const input = {
        token: "valid-token",
        firstName: "Test",
        lastName: "User",
        phone: "+905551234567",
        password: "PlainPassword123",
      };

      const invitation = {
        id: "inv-123",
        token: "valid-token",
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "admin-123",
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockAuthService.hashPassword.mockResolvedValue("$2b$10$hashedPasswordValue");

      mockUserRepository.create.mockResolvedValue({
        id: "user-123",
        passwordHash: "$2b$10$hashedPasswordValue",
      });

      mockAuthService.login.mockResolvedValue({
        access_token: "jwt",
        expires_in: "7d",
        user: { id: "user-123", email: "test@example.com", role: Role.CUSTOMER, firstName: "Test", lastName: "User" },
      });

      await usecase.execute(input);

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith("PlainPassword123");
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: "$2b$10$hashedPasswordValue",
        }),
      );
    });
  });

  describe("getInvitationDetails", () => {
    it("should return invitation details for valid token", async () => {
      const token = "valid-token";
      const invitation = {
        id: "inv-123",
        token,
        email: "test@example.com",
        role: Role.CUSTOMER,
        inviterId: "admin-123",
        isUsed: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockInvitationService.getRemainingHours.mockReturnValue(24);

      const result = await usecase.getInvitationDetails(token);

      expect(result.email).toBe("test@example.com");
      expect(result.role).toBe(Role.CUSTOMER);
      expect(result.remainingHours).toBe(24);
    });

    it("should throw error for invalid invitation token", async () => {
      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: false,
        reason: "Token geçersiz",
      });

      await expect(usecase.getInvitationDetails("invalid-token")).rejects.toThrow(BadRequestException);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should accept strong password", () => {
      const result = usecase.validatePasswordStrength("Password123");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = usecase.validatePasswordStrength("Pass123");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Şifre en az 8 karakter olmalıdır");
    });

    it("should reject password without uppercase letter", () => {
      const result = usecase.validatePasswordStrength("password123");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Şifre en az 1 büyük harf içermelidir");
    });

    it("should reject password without lowercase letter", () => {
      const result = usecase.validatePasswordStrength("PASSWORD123");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Şifre en az 1 küçük harf içermelidir");
    });

    it("should reject password without number", () => {
      const result = usecase.validatePasswordStrength("PasswordABC");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Şifre en az 1 rakam içermelidir");
    });
  });

  describe("validatePhoneFormat", () => {
    it("should accept valid Turkish mobile number", () => {
      const result = usecase.validatePhoneFormat("+905551234567");

      expect(result.isValid).toBe(true);
    });

    it("should reject invalid phone format", () => {
      const result = usecase.validatePhoneFormat("5551234567");

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject non-mobile (landline) numbers", () => {
      const result = usecase.validatePhoneFormat("+902121234567");

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Sadece mobil telefon numaraları kabul edilir");
    });
  });

  describe("execute - FR-021/FR-022: Guest to Registered Conversion", () => {
    it("should convert guest customer to registered when invitation has guestCustomerId", async () => {
      const guestCustomerId = "guest-customer-123";
      const input = {
        token: "valid-token-with-guest",
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "+905551234567",
        password: "Password123",
      };

      const invitation = {
        id: "inv-123",
        token: "valid-token-with-guest",
        email: "ayse@example.com",
        role: Role.CUSTOMER,
        inviterId: "admin-123",
        guestCustomerId,
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockAuthService.hashPassword.mockResolvedValue("hashed-password");

      const createdUser = {
        id: "user-123",
        email: "ayse@example.com",
        phone: "+905551234567",
        passwordHash: "hashed-password",
        firstName: "Ayşe",
        lastName: "Yılmaz",
        role: Role.CUSTOMER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.create.mockResolvedValue(createdUser);
      mockCustomerService.convertGuestToRegistered.mockResolvedValue({
        id: guestCustomerId,
        userId: createdUser.id,
        type: "REGISTERED",
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "+905551234567",
        email: "ayse@example.com",
      });

      mockAuthService.login.mockResolvedValue({
        access_token: "jwt-token",
        expires_in: "7d",
        user: {
          id: "user-123",
          email: "ayse@example.com",
          firstName: "Ayşe",
          lastName: "Yılmaz",
          role: Role.CUSTOMER,
        },
      });

      const result = await usecase.execute(input);

      expect(mockCustomerService.convertGuestToRegistered).toHaveBeenCalledWith(
        guestCustomerId,
        createdUser.id,
      );
      expect(result.access_token).toBe("jwt-token");
      expect(mockInvitationService.markUsed).toHaveBeenCalledWith("valid-token-with-guest");
    });

    it("should NOT convert customer when invitation has no guestCustomerId", async () => {
      const input = {
        token: "valid-token-no-guest",
        firstName: "Mehmet",
        lastName: "Demir",
        phone: "+905559876543",
        password: "Password123",
      };

      const invitation = {
        id: "inv-456",
        token: "valid-token-no-guest",
        email: "mehmet@example.com",
        role: Role.STAFF,
        inviterId: "admin-123",
        guestCustomerId: null,
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockInvitationService.validateNotExpired.mockResolvedValue({
        isValid: true,
        invitation,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockAuthService.hashPassword.mockResolvedValue("hashed-password");

      const createdUser = {
        id: "user-456",
        email: "mehmet@example.com",
        phone: "+905559876543",
        passwordHash: "hashed-password",
        firstName: "Mehmet",
        lastName: "Demir",
        role: Role.STAFF,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.create.mockResolvedValue(createdUser);

      mockAuthService.login.mockResolvedValue({
        access_token: "jwt-token-staff",
        expires_in: "12h",
        user: {
          id: "user-456",
          email: "mehmet@example.com",
          firstName: "Mehmet",
          lastName: "Demir",
          role: Role.STAFF,
        },
      });

      const result = await usecase.execute(input);

      expect(mockCustomerService.convertGuestToRegistered).not.toHaveBeenCalled();
      expect(result.access_token).toBe("jwt-token-staff");
    });
  });
});
