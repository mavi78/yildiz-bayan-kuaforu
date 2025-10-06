/**
 * JWT Strategy
 *
 * Passport JWT stratejisi - JWT token doğrulama ve kullanıcı bilgisi yükleme.
 * Her korumalı endpoint isteğinde çalışır.
 *
 * @module common/guards
 */

import { forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { RedisService } from "../redis.service";
import { AuthService, JwtPayload } from "../../services/auth.service";

/**
 * Request'e eklenen kullanıcı bilgisi
 *
 * JWT payload'dan çıkarılır ve request.user'a atanır
 */
export interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * JWT Strategy
 *
 * Passport.js JWT stratejisi implementasyonu.
 *
 * Akış:
 * 1. Request header'dan Bearer token çıkar
 * 2. JWT'yi secret ile doğrula
 * 3. Payload'dan JTI çıkar ve Redis blacklist'i kontrol et
 * 4. Blacklist'te değilse kullanıcı bilgilerini döndür
 * 5. Dönen obje request.user'a atanır
 *
 * Kullanım:
 * - @UseGuards(AuthGuard('jwt')) decorator ile kullanılır
 * - Otomatik olarak JWT doğrulaması yapar
 * - Geçersiz token → 401 Unauthorized
 * - Blacklist'teki token → 401 Unauthorized (Token revoked)
 *
 * Güvenlik:
 * - Her istekte Redis blacklist kontrolü yapılır
 * - Logout yapılmış token'lar otomatik reddedilir
 * - Token expiry passport-jwt tarafından kontrol edilir
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  /**
   * JWT payload doğrulama ve kullanıcı yükleme
   *
   * Passport tarafından otomatik çağrılır.
   * JWT doğrulandıktan sonra bu method çalışır.
   *
   * FR-009: Admin force logout kontrolü eklendi
   *
   * @param payload - JWT payload (sub, email, role, jti, iat, exp)
   * @returns Kullanıcı bilgisi (userId, email, role) - request.user'a atanır
   * @throws UnauthorizedException - Token blacklist'te veya force logout edilmişse
   */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    // 1. JTI kontrolü (blacklist)
    const isBlacklisted = await this.redisService.isBlacklisted(payload.jti);

    if (isBlacklisted) {
      throw new UnauthorizedException("Token iptal edilmiş. Lütfen tekrar giriş yapın.");
    }

    // 2. FR-009: Admin force logout kontrolü
    const isForcedLogout = await this.authService.isUserForcedLogout(payload.sub, payload.iat || 0);

    if (isForcedLogout) {
      throw new UnauthorizedException(
        "Oturumunuz sistem yöneticisi tarafından sonlandırıldı. Lütfen tekrar giriş yapın.",
      );
    }

    // 3. Kullanıcı bilgilerini döndür
    // Bu obje request.user olarak kullanılabilir
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
