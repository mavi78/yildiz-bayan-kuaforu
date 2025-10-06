/**
 * RolesGuard Unit Tests
 *
 * RolesGuard ve CurrentUser decorator'unun unit testleri.
 * FR-005 gereksinimini test eder (rol bazlı yetkilendirme).
 *
 * @module test/unit/common
 */

import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { RolesGuard } from "../../../src/common/guards/roles.guard";
import { ROLES_KEY } from "../../../src/common/decorators/roles.decorator";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  describe("FR-005: Role-Based Authorization", () => {
    it("should allow access when no roles are required (public endpoint)", () => {
      const context = createMockContext({ userId: "user-1", role: Role.CUSTOMER });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should allow access when user has required role (ADMIN)", () => {
      const context = createMockContext({ userId: "admin-1", role: Role.ADMIN });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should allow access when user has one of multiple required roles", () => {
      const context = createMockContext({ userId: "staff-1", role: Role.STAFF });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN, Role.STAFF]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should deny access when user does not have required role", () => {
      const context = createMockContext({ userId: "customer-1", role: Role.CUSTOMER });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should deny access when user object is missing (AuthGuard not applied)", () => {
      const context = createMockContext(null);

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should deny access when user.role is missing", () => {
      const context = createMockContext({ userId: "user-1" });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe("Role Hierarchy Scenarios", () => {
    it("should allow ADMIN to access ADMIN-only endpoint", () => {
      const context = createMockContext({ userId: "admin-1", role: Role.ADMIN });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should allow STAFF to access STAFF-only endpoint", () => {
      const context = createMockContext({ userId: "staff-1", role: Role.STAFF });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.STAFF]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should allow CUSTOMER to access CUSTOMER-only endpoint", () => {
      const context = createMockContext({ userId: "customer-1", role: Role.CUSTOMER });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.CUSTOMER]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should deny CUSTOMER access to ADMIN-only endpoint", () => {
      const context = createMockContext({ userId: "customer-1", role: Role.CUSTOMER });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it("should deny STAFF access to ADMIN-only endpoint", () => {
      const context = createMockContext({ userId: "staff-1", role: Role.STAFF });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it("should allow all roles to access endpoint requiring any authenticated user", () => {
      const adminContext = createMockContext({ userId: "admin-1", role: Role.ADMIN });
      const staffContext = createMockContext({ userId: "staff-1", role: Role.STAFF });
      const customerContext = createMockContext({ userId: "customer-1", role: Role.CUSTOMER });

      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([Role.ADMIN, Role.STAFF, Role.CUSTOMER]);

      expect(guard.canActivate(adminContext)).toBe(true);
      expect(guard.canActivate(staffContext)).toBe(true);
      expect(guard.canActivate(customerContext)).toBe(true);
    });
  });

  describe("Reflector Metadata Extraction", () => {
    it("should use getAllAndOverride to get metadata from handler and class", () => {
      const context = createMockContext({ userId: "user-1", role: Role.ADMIN });
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([Role.ADMIN]);

      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it("should prioritize method-level metadata over class-level", () => {
      const context = createMockContext({ userId: "staff-1", role: Role.STAFF });

      // getAllAndOverride otomatik olarak method > class önceliği uygular
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.STAFF]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty roles array as public endpoint", () => {
      const context = createMockContext({ userId: "user-1", role: Role.CUSTOMER });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should deny access when user role is null", () => {
      const context = createMockContext({ userId: "user-1", role: null });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should deny access when user role is undefined", () => {
      const context = createMockContext({ userId: "user-1", role: undefined });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
