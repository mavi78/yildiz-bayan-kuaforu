/**
 * Auth Token & Logout Mechanisms Unit Tests
 *
 * AuthService logout, blacklist ve force logout mekanizmalarının testleri.
 * FR-007, FR-008, FR-009 gereksinimlerini test eder.
 *
 * @module test/unit/services
 */

import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { AuthService } from "../../../src/services/auth.service";
import { UserRepository } from "../../../src/repositories/user.repository";
import { BcryptService } from "../../../src/services/bcrypt.service";
import { RedisService } from "../../../src/common/redis.service";
import { LogoutUsecase } from "../../../src/usecases/auth/logout.usecase";

describe("Auth Token & Logout Mechanisms", () => {
  let authService: AuthService;
  let logoutUsecase: LogoutUsecase;
  let jwtService: JwtService;
  let redisService: RedisService;
  let userRepository: UserRepository;
  let bcryptService: BcryptService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockRedisService = {
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    ping: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
  };

  const mockUserRepository = {
    findByEmailOrPhone: jest.fn(),
    updateLastLogin: jest.fn(),
    update: jest.fn(),
  };

  const mockBcryptService = {
    compare: jest.fn(),
    hash: jest.fn(),
    needsRehash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        LogoutUsecase,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: BcryptService,
          useValue: mockBcryptService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    logoutUsecase = module.get<LogoutUsecase>(LogoutUsecase);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
    userRepository = module.get<UserRepository>(UserRepository);
    bcryptService = module.get<BcryptService>(BcryptService);

    jest.clearAllMocks();
  });

  describe("AuthService - logout()", () => {
    it("should add JWT to blacklist with correct TTL", async () => {
      const jti = "jwt-123";
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 3600; // 1 hour from now
      const expectedTtl = 3600;

      await authService.logout(jti, exp);

      expect(redisService.addToBlacklist).toHaveBeenCalledWith(jti, expectedTtl);
    });

    it("should not add JWT to blacklist if already expired", async () => {
      const jti = "jwt-expired";
      const now = Math.floor(Date.now() / 1000);
      const exp = now - 1000; // Expired 1000 seconds ago

      await authService.logout(jti, exp);

      expect(redisService.addToBlacklist).not.toHaveBeenCalled();
    });

    it("should calculate TTL correctly for different expiry times", async () => {
      const jti = "jwt-456";
      const now = Math.floor(Date.now() / 1000);

      // Test 1: 1 day expiry
      const exp1Day = now + 24 * 60 * 60;
      await authService.logout(jti, exp1Day);
      expect(redisService.addToBlacklist).toHaveBeenCalledWith(jti, 24 * 60 * 60);

      // Test 2: 7 days expiry
      const exp7Days = now + 7 * 24 * 60 * 60;
      await authService.logout(jti, exp7Days);
      expect(redisService.addToBlacklist).toHaveBeenCalledWith(jti, 7 * 24 * 60 * 60);
    });
  });

  describe("AuthService - FR-009: Force Logout", () => {
    it("should set force logout flag in Redis with correct TTL", async () => {
      const userId = "user-123";

      await authService.forceLogout(userId);

      expect(redisService.set).toHaveBeenCalledWith(
        `user:force-logout:${userId}`,
        expect.any(String),
        7 * 24 * 60 * 60, // 7 days TTL
      );
    });

    it("should detect forced logout for tokens issued before logout time", async () => {
      const userId = "user-123";
      const logoutTime = Date.now();
      const tokenIssuedAt = Math.floor(logoutTime / 1000) - 100; // Issued 100 seconds before logout

      mockRedisService.get.mockResolvedValue(logoutTime.toString());

      const result = await authService.isUserForcedLogout(userId, tokenIssuedAt);

      expect(result).toBe(true);
    });

    it("should not detect forced logout for tokens issued after logout time", async () => {
      const userId = "user-123";
      const logoutTime = Date.now();
      const tokenIssuedAt = Math.floor(logoutTime / 1000) + 100; // Issued 100 seconds after logout

      mockRedisService.get.mockResolvedValue(logoutTime.toString());

      const result = await authService.isUserForcedLogout(userId, tokenIssuedAt);

      expect(result).toBe(false);
    });

    it("should return false when no force logout flag exists", async () => {
      const userId = "user-123";
      const tokenIssuedAt = Math.floor(Date.now() / 1000);

      mockRedisService.get.mockResolvedValue(null);

      const result = await authService.isUserForcedLogout(userId, tokenIssuedAt);

      expect(result).toBe(false);
    });

    it("should handle edge case: token issued exactly at logout time", async () => {
      const userId = "user-123";
      const logoutTime = Date.now();
      const tokenIssuedAt = Math.floor(logoutTime / 1000); // Issued at exact logout time

      mockRedisService.get.mockResolvedValue(logoutTime.toString());

      const result = await authService.isUserForcedLogout(userId, tokenIssuedAt);

      // Implementation uses < comparison, so token at exact time is considered before logout
      expect(result).toBe(true);
    });
  });

  describe("AuthService - FR-007: Login Throttling", () => {
    it("should record failed login attempt in Redis", async () => {
      const emailOrPhone = "test@example.com";
      const user = null; // User not found

      mockUserRepository.findByEmailOrPhone.mockResolvedValue(user);
      mockRedisService.get.mockResolvedValue(null); // No previous attempts

      try {
        await authService.validateUser(emailOrPhone, "wrong-password");
      } catch (error) {
        // Expected to throw
      }

      expect(redisService.set).toHaveBeenCalledWith(
        `login:failed:${emailOrPhone}`,
        "1",
        15 * 60, // 15 minutes TTL
      );
    });

    it("should lock account after 5 failed attempts", async () => {
      const emailOrPhone = "test@example.com";

      // First call to check lock status returns null (not locked)
      // Second call to get failed attempts returns "4" (4 previous attempts)
      mockRedisService.get
        .mockResolvedValueOnce(null) // isAccountLocked check
        .mockResolvedValueOnce("4"); // recordFailedLoginAttempt check

      mockUserRepository.findByEmailOrPhone.mockResolvedValue(null);

      try {
        await authService.validateUser(emailOrPhone, "wrong-password");
      } catch (error) {
        // Expected to throw
      }

      expect(redisService.set).toHaveBeenCalledWith(
        `login:locked:${emailOrPhone}`,
        "1",
        15 * 60,
      );
      expect(redisService.del).toHaveBeenCalledWith(`login:failed:${emailOrPhone}`);
    });

    it("should reject login when account is locked", async () => {
      const emailOrPhone = "locked@example.com";

      mockRedisService.get.mockResolvedValue("1"); // Account is locked

      await expect(authService.validateUser(emailOrPhone, "password")).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.validateUser(emailOrPhone, "password")).rejects.toThrow(
        "Hesap geçici olarak kilitlendi",
      );

      // Should not check user or password when locked
      expect(mockUserRepository.findByEmailOrPhone).not.toHaveBeenCalled();
    });

    it("should reset failed attempts after successful login", async () => {
      const emailOrPhone = "test@example.com";
      const user = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: Role.CUSTOMER,
        passwordHash: "hashed-password",
        isActive: true,
      };

      mockRedisService.get.mockResolvedValue(null); // No lock
      mockUserRepository.findByEmailOrPhone.mockResolvedValue(user);
      mockBcryptService.compare.mockResolvedValue(true);
      mockBcryptService.needsRehash.mockResolvedValue(false);

      await authService.validateUser(emailOrPhone, "correct-password");

      expect(redisService.del).toHaveBeenCalledWith(`login:failed:${emailOrPhone}`);
    });
  });

  describe("LogoutUsecase - execute()", () => {
    it("should successfully logout with valid token", async () => {
      const token = "valid.jwt.token";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jwt-id-123",
        exp: now + 3600, // Expires in 1 hour
      };

      mockJwtService.verify.mockReturnValue(payload);

      const result = await logoutUsecase.execute({ token });

      expect(result.success).toBe(true);
      expect(redisService.addToBlacklist).toHaveBeenCalledWith("jwt-id-123", 3600);
    });

    it("should throw error for invalid token", async () => {
      const token = "invalid.jwt.token";

      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(logoutUsecase.execute({ token })).rejects.toThrow(BadRequestException);
      await expect(logoutUsecase.execute({ token })).rejects.toThrow("Geçersiz token");
    });

    it("should throw error for expired token", async () => {
      const token = "expired.jwt.token";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jwt-id-123",
        exp: now - 1000, // Expired 1000 seconds ago
      };

      mockJwtService.verify.mockReturnValue(payload);

      await expect(logoutUsecase.execute({ token })).rejects.toThrow(BadRequestException);
      await expect(logoutUsecase.execute({ token })).rejects.toThrow("Token süresi dolmuş");

      expect(redisService.addToBlacklist).not.toHaveBeenCalled();
    });

    it("should throw error for token without JTI", async () => {
      const token = "token.without.jti";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        // jti is missing
        exp: now + 3600,
      };

      mockJwtService.verify.mockReturnValue(payload);

      await expect(logoutUsecase.execute({ token })).rejects.toThrow(BadRequestException);
      await expect(logoutUsecase.execute({ token })).rejects.toThrow("Token formatı geçersiz");
    });
  });

  describe("LogoutUsecase - isTokenBlacklisted()", () => {
    it("should return true for blacklisted token", async () => {
      const token = "blacklisted.jwt.token";
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "blacklisted-jti",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockRedisService.isBlacklisted.mockResolvedValue(true);

      const result = await logoutUsecase.isTokenBlacklisted(token);

      expect(result).toBe(true);
      expect(redisService.isBlacklisted).toHaveBeenCalledWith("blacklisted-jti");
    });

    it("should return false for non-blacklisted token", async () => {
      const token = "valid.jwt.token";
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "valid-jti",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockRedisService.isBlacklisted.mockResolvedValue(false);

      const result = await logoutUsecase.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });

    it("should return false for invalid token", async () => {
      const token = "invalid.jwt.token";

      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = await logoutUsecase.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });
  });

  describe("LogoutUsecase - getTokenRemainingTime()", () => {
    it("should return correct remaining time for valid token", async () => {
      const token = "valid.jwt.token";
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = 1800; // 30 minutes
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jwt-id",
        exp: now + remainingSeconds,
      };

      mockJwtService.verify.mockReturnValue(payload);

      const result = await logoutUsecase.getTokenRemainingTime(token);

      expect(result).toBeGreaterThan(1790); // Allow some time for execution
      expect(result).toBeLessThanOrEqual(remainingSeconds);
    });

    it("should return 0 for expired token", async () => {
      const token = "expired.jwt.token";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jwt-id",
        exp: now - 1000,
      };

      mockJwtService.verify.mockReturnValue(payload);

      const result = await logoutUsecase.getTokenRemainingTime(token);

      expect(result).toBe(0);
    });

    it("should return -1 for invalid token", async () => {
      const token = "invalid.jwt.token";

      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = await logoutUsecase.getTokenRemainingTime(token);

      expect(result).toBe(-1);
    });
  });

  describe("LogoutUsecase - extractUserInfo()", () => {
    it("should extract user info from valid token", async () => {
      const token = "valid.jwt.token";
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jwt-id",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(payload);

      const result = await logoutUsecase.extractUserInfo(token);

      expect(result).toEqual({
        userId: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
      });
    });

    it("should return null for invalid token", async () => {
      const token = "invalid.jwt.token";

      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = await logoutUsecase.extractUserInfo(token);

      expect(result).toBeNull();
    });
  });

  describe("LogoutUsecase - checkRedisHealth()", () => {
    it("should return true when Redis is healthy", async () => {
      mockRedisService.ping.mockResolvedValue(true);

      const result = await logoutUsecase.checkRedisHealth();

      expect(result).toBe(true);
      expect(redisService.ping).toHaveBeenCalled();
    });

    it("should return false when Redis is unhealthy", async () => {
      mockRedisService.ping.mockResolvedValue(false);

      const result = await logoutUsecase.checkRedisHealth();

      expect(result).toBe(false);
    });
  });
});
