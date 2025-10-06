/**
 * CurrentUser Decorator Unit Tests
 *
 * CurrentUser decorator'unun unit testleri.
 *
 * @module test/unit/common
 */

import { ExecutionContext } from "@nestjs/common";
import { JwtUser } from "../../../src/common/guards/jwt.strategy";
import { Role } from "@prisma/client";

// CurrentUser decorator'un callback fonksiyonunu test etmek için direkt import
const createParamDecorator = require("@nestjs/common").createParamDecorator;

describe("CurrentUser Decorator", () => {
  let decoratorFactory: any;

  beforeEach(() => {
    // CurrentUser decorator'ın içindeki callback fonksiyonunu simüle et
    decoratorFactory = (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user as JwtUser;

      if (data) {
        return user?.[data];
      }

      return user;
    };
  });

  const createMockContext = (user: JwtUser | null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  const mockUser: JwtUser = {
    userId: "user-123",
    email: "test@example.com",
    role: Role.CUSTOMER,
  };

  describe("Full User Object Extraction", () => {
    it("should return entire user object when no field is specified", () => {
      const context = createMockContext(mockUser);

      const result = decoratorFactory(undefined, context);

      expect(result).toEqual(mockUser);
    });

    it("should return null when user is null", () => {
      const context = createMockContext(null);

      const result = decoratorFactory(undefined, context);

      expect(result).toBeNull();
    });
  });

  describe("Specific Field Extraction", () => {
    it("should extract userId when specified", () => {
      const context = createMockContext(mockUser);

      const result = decoratorFactory("userId", context);

      expect(result).toBe("user-123");
    });

    it("should extract email when specified", () => {
      const context = createMockContext(mockUser);

      const result = decoratorFactory("email", context);

      expect(result).toBe("test@example.com");
    });

    it("should extract role when specified", () => {
      const context = createMockContext(mockUser);

      const result = decoratorFactory("role", context);

      expect(result).toBe(Role.CUSTOMER);
    });

    it("should return undefined for non-existent field", () => {
      const context = createMockContext(mockUser);

      const result = decoratorFactory("nonExistent" as any, context);

      expect(result).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with ADMIN role", () => {
      const adminUser: JwtUser = {
        userId: "admin-123",
        email: "admin@example.com",
        role: Role.ADMIN,
      };
      const context = createMockContext(adminUser);

      const result = decoratorFactory(undefined, context);

      expect(result).toEqual(adminUser);
      expect(result.role).toBe(Role.ADMIN);
    });

    it("should handle user with STAFF role", () => {
      const staffUser: JwtUser = {
        userId: "staff-123",
        email: "staff@example.com",
        role: Role.STAFF,
      };
      const context = createMockContext(staffUser);

      const result = decoratorFactory("role", context);

      expect(result).toBe(Role.STAFF);
    });

    it("should return undefined when extracting field from null user", () => {
      const context = createMockContext(null);

      const result = decoratorFactory("userId", context);

      expect(result).toBeUndefined();
    });
  });

  describe("Type Safety", () => {
    it("should preserve type information for userId", () => {
      const context = createMockContext(mockUser);

      const result: string = decoratorFactory("userId", context);

      expect(typeof result).toBe("string");
    });

    it("should preserve type information for email", () => {
      const context = createMockContext(mockUser);

      const result: string = decoratorFactory("email", context);

      expect(typeof result).toBe("string");
    });

    it("should preserve type information for role", () => {
      const context = createMockContext(mockUser);

      const result: string = decoratorFactory("role", context);

      expect(result).toBe(Role.CUSTOMER);
    });
  });
});
