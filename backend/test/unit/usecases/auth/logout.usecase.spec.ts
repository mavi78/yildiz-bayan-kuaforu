/**
 * LogoutUsecase Unit Tests
 *
 * Logout usecase'inin unit testleri.
 * Token blacklist yönetimini test eder.
 *
 * @module test/unit/usecases/auth
 */

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { LogoutUsecase } from "../../../../src/usecases/auth/logout.usecase";
import { RedisService } from "../../../../src/common/redis.service";
import { AuthService } from "../../../../src/services/auth.service";

describe("LogoutUsecase", () => {
  let usecase: LogoutUsecase;
  let redisService: RedisService;
  let authService: AuthService;

  const mockRedisService = {
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
    ping: jest.fn(),
  };

  const mockAuthService = {
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUsecase,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    usecase = module.get<LogoutUsecase>(LogoutUsecase);
    redisService = module.get<RedisService>(RedisService);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(usecase).toBeDefined();
  });

  describe("execute - Basic Logout Flow", () => {
    it("should logout user with valid token", async () => {
      const input = {
        token: "valid-jwt-token",
      };

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-123",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);
      mockRedisService.addToBlacklist.mockResolvedValue(undefined);

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Başarıyla çıkış yapıldı");
      expect(mockRedisService.addToBlacklist).toHaveBeenCalledWith("jti-123", expect.any(Number));
    });

    it("should calculate correct TTL for token", async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = now + 7200; // 2 hours from now

      const input = {
        token: "valid-jwt-token",
      };

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.ADMIN,
        jti: "jti-456",
        iat: now,
        exp: expiry,
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);
      mockRedisService.addToBlacklist.mockResolvedValue(undefined);

      await usecase.execute(input);

      // TTL should be approximately 7200 seconds (allow 5 second margin for test execution time)
      expect(mockRedisService.addToBlacklist).toHaveBeenCalledWith("jti-456", expect.any(Number));

      const ttl = mockRedisService.addToBlacklist.mock.calls[0][1];
      expect(ttl).toBeGreaterThan(7190);
      expect(ttl).toBeLessThanOrEqual(7200);
    });
  });

  describe("execute - Error Handling", () => {
    it("should reject invalid token", async () => {
      const input = {
        token: "invalid-token",
      };

      mockAuthService.verifyToken.mockRejectedValue(new Error("Invalid token"));

      await expect(usecase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(usecase.execute(input)).rejects.toThrow("Geçersiz token. Lütfen tekrar giriş yapın.");
    });

    it("should reject token without JTI", async () => {
      const input = {
        token: "token-without-jti",
      };

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        // jti missing
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);

      await expect(usecase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(usecase.execute(input)).rejects.toThrow("Token formatı geçersiz. JTI veya expiry eksik.");
    });

    it("should reject token without expiry", async () => {
      const input = {
        token: "token-without-exp",
      };

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-123",
        iat: Math.floor(Date.now() / 1000),
        // exp missing
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);

      await expect(usecase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(usecase.execute(input)).rejects.toThrow("Token formatı geçersiz. JTI veya expiry eksik.");
    });

    it("should reject expired token", async () => {
      const input = {
        token: "expired-token",
      };

      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-789",
        iat: now - 7200, // 2 hours ago
        exp: now - 600, // Expired 10 minutes ago
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);

      await expect(usecase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(usecase.execute(input)).rejects.toThrow("Token süresi dolmuş. Zaten geçersiz durumda.");
    });
  });

  describe("isTokenBlacklisted", () => {
    it("should return true if token is blacklisted", async () => {
      const token = "blacklisted-token";

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-blacklisted",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);
      mockRedisService.isBlacklisted.mockResolvedValue(true);

      const result = await usecase.isTokenBlacklisted(token);

      expect(result).toBe(true);
      expect(mockRedisService.isBlacklisted).toHaveBeenCalledWith("jti-blacklisted");
    });

    it("should return false if token is not blacklisted", async () => {
      const token = "valid-token";

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-valid",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);
      mockRedisService.isBlacklisted.mockResolvedValue(false);

      const result = await usecase.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });

    it("should return false for invalid token", async () => {
      const token = "invalid-token";

      mockAuthService.verifyToken.mockRejectedValue(new Error("Invalid token"));

      const result = await usecase.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });
  });

  describe("getTokenRemainingTime", () => {
    it("should return remaining time for valid token", async () => {
      const token = "valid-token";
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = 3600; // 1 hour

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-123",
        iat: now,
        exp: now + remainingSeconds,
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);

      const result = await usecase.getTokenRemainingTime(token);

      expect(result).toBeGreaterThan(remainingSeconds - 5); // Allow 5 second margin
      expect(result).toBeLessThanOrEqual(remainingSeconds);
    });

    it("should return 0 for expired token", async () => {
      const token = "expired-token";
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
        jti: "jti-expired",
        iat: now - 7200,
        exp: now - 600, // Expired 10 minutes ago
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);

      const result = await usecase.getTokenRemainingTime(token);

      expect(result).toBe(0);
    });

    it("should return -1 for invalid token", async () => {
      const token = "invalid-token";

      mockAuthService.verifyToken.mockRejectedValue(new Error("Invalid token"));

      const result = await usecase.getTokenRemainingTime(token);

      expect(result).toBe(-1);
    });
  });

  describe("extractUserInfo", () => {
    it("should extract user info from valid token", async () => {
      const token = "valid-token";

      const payload = {
        sub: "user-456",
        email: "admin@example.com",
        role: Role.ADMIN,
        jti: "jti-admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockAuthService.verifyToken.mockResolvedValue(payload);

      const result = await usecase.extractUserInfo(token);

      expect(result).toEqual({
        userId: "user-456",
        email: "admin@example.com",
        role: Role.ADMIN,
      });
    });

    it("should return null for invalid token", async () => {
      const token = "invalid-token";

      mockAuthService.verifyToken.mockRejectedValue(new Error("Invalid token"));

      const result = await usecase.extractUserInfo(token);

      expect(result).toBeNull();
    });
  });

  describe("cleanupExpiredBlacklist", () => {
    it("should count expired blacklist entries", async () => {
      mockRedisService.keys.mockResolvedValue(["blacklist:jti1", "blacklist:jti2", "blacklist:jti3"]);

      mockRedisService.ttl.mockImplementation((key: string) => {
        if (key === "blacklist:jti1") return Promise.resolve(3600); // Active
        if (key === "blacklist:jti2") return Promise.resolve(-2); // Expired/deleted
        if (key === "blacklist:jti3") return Promise.resolve(-2); // Expired/deleted
        return Promise.resolve(-1);
      });

      const result = await usecase.cleanupExpiredBlacklist();

      expect(result).toBe(2); // 2 expired entries
    });

    it("should return 0 when no expired entries", async () => {
      mockRedisService.keys.mockResolvedValue(["blacklist:jti1"]);
      mockRedisService.ttl.mockResolvedValue(3600); // Active

      const result = await usecase.cleanupExpiredBlacklist();

      expect(result).toBe(0);
    });
  });

  describe("checkRedisHealth", () => {
    it("should return true when Redis is healthy", async () => {
      mockRedisService.ping.mockResolvedValue(true);

      const result = await usecase.checkRedisHealth();

      expect(result).toBe(true);
    });

    it("should return false when Redis is unhealthy", async () => {
      mockRedisService.ping.mockResolvedValue(false);

      const result = await usecase.checkRedisHealth();

      expect(result).toBe(false);
    });
  });

  describe("logoutAllSessions", () => {
    it("should throw error (not implemented)", async () => {
      await expect(usecase.logoutAllSessions("user-123")).rejects.toThrow(
        "Tüm session logout özelliği henüz implementasyonu yapılmadı",
      );
    });
  });
});
