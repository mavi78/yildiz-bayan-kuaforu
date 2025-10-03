/**
 * CurrentUser Decorator
 *
 * Request'ten kullanıcı bilgisini çıkaran parameter decorator.
 * JWT Strategy tarafından eklenen request.user'ı döndürür.
 *
 * @module common/decorators
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../guards/jwt.strategy';

/**
 * CurrentUser Decorator
 *
 * Controller method parametresi olarak mevcut kullanıcı bilgisini inject eder.
 * JWT Strategy tarafından request.user'a eklenen bilgiyi döndürür.
 *
 * Kullanım:
 * ```typescript
 * @Get('profile')
 * @UseGuards(AuthGuard('jwt'))
 * async getProfile(@CurrentUser() user: JwtUser) {
 *   // user = { userId: '...', email: '...', role: '...' }
 *   return this.userService.findById(user.userId);
 * }
 *
 * @Post('appointments')
 * @UseGuards(AuthGuard('jwt'), RolesGuard)
 * @Roles(Role.CUSTOMER)
 * async createAppointment(
 *   @CurrentUser() user: JwtUser,
 *   @Body() dto: CreateAppointmentDto,
 * ) {
 *   // Sadece kendi randevusunu oluşturabilir
 *   return this.appointmentService.create(user.userId, dto);
 * }
 * ```
 *
 * Özellikler:
 * - AuthGuard('jwt') ile birlikte kullanılmalı (user yoksa undefined döner)
 * - Type-safe: JwtUser interface ile tip kontrolü
 * - Temiz kod: request.user.userId yerine user.userId
 * - Okunabilirlik: Hangi endpoint'in user bilgisine ihtiyacı olduğu açık
 *
 * Specific field access:
 * ```typescript
 * @Get('my-appointments')
 * async getMyAppointments(@CurrentUser('userId') userId: string) {
 *   // Sadece userId'yi al
 *   return this.appointmentService.findByCustomer(userId);
 * }
 * ```
 *
 * @param data - İsteğe bağlı: user objesinin specific field'ı (örn: 'userId')
 * @returns Kullanıcı bilgisi veya specific field
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    // Specific field istenmişse onu döndür
    if (data) {
      return user?.[data];
    }

    // Tüm user objesini döndür
    return user;
  },
);
