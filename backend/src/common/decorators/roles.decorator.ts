/**
 * Roles Decorator
 *
 * Endpoint için gerekli rolleri belirleyen decorator.
 * RolesGuard ile birlikte çalışır.
 *
 * @module common/decorators
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Roles decorator metadata key
 *
 * RolesGuard bu key ile metadata'yı okur
 */
export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 *
 * Controller method veya class için gerekli rolleri belirler.
 * Metadata olarak saklanır ve RolesGuard tarafından okunur.
 *
 * Kullanım:
 * ```typescript
 * // Sadece Admin erişebilir
 * @Roles(Role.ADMIN)
 * async deleteUser() { }
 *
 * // Admin veya Staff erişebilir
 * @Roles(Role.ADMIN, Role.STAFF)
 * async updateAppointment() { }
 *
 * // Tüm kayıtlı kullanıcılar erişebilir
 * @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
 * async getProfile() { }
 * ```
 *
 * Önemli:
 * - @UseGuards(AuthGuard('jwt'), RolesGuard) ile birlikte kullanılmalı
 * - Decorator olmayan endpoint'ler public'tir (herkes erişebilir)
 * - Class ve method level'da kullanılabilir (method önceliklidir)
 *
 * @param roles - Gerekli roller (Role enum'dan)
 * @returns Metadata decorator
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
