/**
 * Roles Guard
 *
 * Rol bazlı yetkilendirme (authorization) guard.
 * @Roles decorator ile belirlenen rolleri kontrol eder.
 *
 * @module common/guards
 */

import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Roles Guard
 *
 * NestJS CanActivate interface implementasyonu.
 *
 * Akış:
 * 1. Handler'dan (controller method) @Roles metadata'sını çıkar
 * 2. Metadata yoksa erişime izin ver (public endpoint)
 * 3. Request'ten kullanıcı bilgisini al (JWT Strategy tarafından eklenir)
 * 4. Kullanıcının rolü required roles içinde mi kontrol et
 * 5. Eşleşme varsa true (izin ver), yoksa false (reddet)
 *
 * Kullanım:
 * ```typescript
 * @UseGuards(AuthGuard('jwt'), RolesGuard)
 * @Roles(Role.ADMIN, Role.STAFF)
 * async someMethod() {
 *   // Sadece ADMIN ve STAFF erişebilir
 * }
 * ```
 *
 * Önemli:
 * - AuthGuard('jwt') ile birlikte kullanılmalı
 * - AuthGuard önce çalışmalı (JWT doğrulama + user ekleme)
 * - RolesGuard sonra çalışmalı (role kontrolü)
 *
 * Guard sırası:
 * 1. AuthGuard('jwt') → JWT doğrula, request.user ekle
 * 2. RolesGuard → request.user.role kontrol et
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Endpoint erişim kontrolü
   *
   * @param context - Execution context (HTTP request bilgileri)
   * @returns Erişim izni varsa true, yoksa false
   */
  canActivate(context: ExecutionContext): boolean {
    // 1. Handler'dan required roles metadata'sını al
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Metadata yoksa public endpoint (herkes erişebilir)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Request'ten kullanıcı bilgisini al
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 4. Kullanıcı yoksa erişim reddet (AuthGuard atlanmış olabilir)
    if (!user || !user.role) {
      return false;
    }

    // 5. Kullanıcının rolü required roles içinde mi kontrol et
    return requiredRoles.includes(user.role);
  }
}
