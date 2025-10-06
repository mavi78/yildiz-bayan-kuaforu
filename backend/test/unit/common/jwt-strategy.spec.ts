/**
 * JWT Strategy Unit Tests
 *
 * JWT Strategy ve token validation testleri.
 * FR-006, FR-008, FR-009 gereksinimlerini test eder.
 *
 * @module test/unit/common
 */

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "../../../src/common/guards/jwt.strategy";
import { RedisService } from "../../../src/common/redis.service";
import { AuthService, JwtPayload } from "../../../src/services/auth.service";
import { Role } from "@prisma/client";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let redisService: RedisService;
  let authService: AuthService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue("test-secret"),
    } as any;

    redisService = {
      isBlacklisted: jest.fn(),
    } as any;

    authService = {
      isUserForcedLogout: jest.fn(),
    } as any;

    strategy = new JwtStrategy(configService, redisService, authService);
  });

  const createMockPayload = (overrides?: Partial<JwtPayload>): JwtPayload => ({
    sub: "user-123",
    email: "test@example.com",
    role: Role.CUSTOMER,
    jti: "jwt-id-123",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  });

  describe("validate - FR-008: JWT Token Validation", () => {
    it("should return user data when token is valid", async () => {
      const payload = createMockPayload();

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: "user-123",
        email: "test@example.com",
        role: Role.CUSTOMER,
      });
    });

    it("should check token against blacklist", async () => {
      const payload = createMockPayload();

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      await strategy.validate(payload);

      expect(redisService.isBlacklisted).toHaveBeenCalledWith("jwt-id-123");
    });

    it("should throw UnauthorizedException when token is blacklisted", async () => {
      const payload = createMockPayload();

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(true);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        "Token iptal edilmiş. Lütfen tekrar giriş yapın.",
      );
    });
  });

  describe("validate - FR-009: Force Logout", () => {
    it("should check if user is forced logout", async () => {
      const payload = createMockPayload({ iat: 1234567890 });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      await strategy.validate(payload);

      expect(authService.isUserForcedLogout).toHaveBeenCalledWith("user-123", 1234567890);
    });

    it("should throw UnauthorizedException when user is forced logout", async () => {
      const payload = createMockPayload();

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(true);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        "Oturumunuz sistem yöneticisi tarafından sonlandırıldı. Lütfen tekrar giriş yapın.",
      );
    });

    it("should handle missing iat in payload", async () => {
      const payload = createMockPayload({ iat: undefined });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      await strategy.validate(payload);

      expect(authService.isUserForcedLogout).toHaveBeenCalledWith("user-123", 0);
    });
  });

  describe("validate - Role Extraction", () => {
    it("should extract ADMIN role from payload", async () => {
      const payload = createMockPayload({ role: Role.ADMIN });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.role).toBe(Role.ADMIN);
    });

    it("should extract STAFF role from payload", async () => {
      const payload = createMockPayload({ role: Role.STAFF });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.role).toBe(Role.STAFF);
    });

    it("should extract CUSTOMER role from payload", async () => {
      const payload = createMockPayload({ role: Role.CUSTOMER });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.role).toBe(Role.CUSTOMER);
    });
  });

  describe("validate - User Data Extraction", () => {
    it("should map sub to userId", async () => {
      const payload = createMockPayload({ sub: "custom-user-id" });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.userId).toBe("custom-user-id");
    });

    it("should preserve email from payload", async () => {
      const payload = createMockPayload({ email: "custom@example.com" });

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.email).toBe("custom@example.com");
    });
  });

  describe("validate - Execution Order", () => {
    it("should check blacklist before force logout", async () => {
      const payload = createMockPayload();

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(true);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);

      // Force logout should not be called if blacklist check fails
      expect(authService.isUserForcedLogout).not.toHaveBeenCalled();
    });

    it("should return user data only after all checks pass", async () => {
      const payload = createMockPayload();

      (redisService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (authService.isUserForcedLogout as jest.Mock).mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(redisService.isBlacklisted).toHaveBeenCalled();
      expect(authService.isUserForcedLogout).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
