/**
 * Logout Usecase
 *
 * Kullanıcı çıkış (logout) iş akışı.
 * JWT token'ı blacklist'e ekleme → token'ı geçersiz kılma.
 *
 * @module usecases/auth
 */

import { Injectable, BadRequestException } from "@nestjs/common";
import { RedisService } from "../../common/redis.service";
import { AuthService } from "../../services/auth.service";

/**
 * Logout için gerekli bilgiler
 */
export interface LogoutInput {
  token: string; // JWT access token
}

/**
 * Logout sonucu
 */
export interface LogoutResult {
  success: boolean;
  message: string;
}

/**
 * Logout Usecase
 *
 * Kullanım akışı:
 * 1. Token'ı verify et (geçerli mi, expire olmamış mı)
 * 2. Token payload'dan JTI (JWT ID) ve expiry çıkar
 * 3. JTI'yi Redis blacklist'e ekle (TTL = token expiry zamanı)
 * 4. Başarı mesajı döndür
 *
 * İş kuralları:
 * - Sadece geçerli token'lar logout yapabilir
 * - Token blacklist'e eklendikten sonra tekrar kullanılamaz
 * - Blacklist TTL, token'ın expiry zamanına ayarlanır (gereksiz storage önlenir)
 * - Zaten blacklist'te olan token tekrar eklenebilir (idempotent)
 * - Expire olmuş token'lar logout yapamaz (zaten geçersiz)
 *
 * Güvenlik:
 * - JWT Strategy, her istek öncesi blacklist kontrolü yapar
 * - Blacklist'teki token'lar UnauthorizedException döner
 * - Redis bağlantı hatası durumunda logout başarısız sayılır (güvenlik)
 */
@Injectable()
export class LogoutUsecase {
  constructor(
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Kullanıcı çıkışı yapar
   *
   * @param input - Logout bilgileri (token)
   * @returns Başarı durumu
   * @throws BadRequestException - Token geçersizse veya expire olmuşsa
   */
  async execute(input: LogoutInput): Promise<LogoutResult> {
    // 1. Token'ı verify et ve payload çıkar
    let payload;

    try {
      payload = await this.authService.verifyToken(input.token);
    } catch (error) {
      throw new BadRequestException("Geçersiz token. Lütfen tekrar giriş yapın.");
    }

    // 2. JTI ve expiry çıkar
    const jti = payload.jti;
    const exp = payload.exp;

    if (!jti || !exp) {
      throw new BadRequestException("Token formatı geçersiz. JTI veya expiry eksik.");
    }

    // 3. TTL hesapla (token expire olana kadar)
    const now = Math.floor(Date.now() / 1000); // Unix timestamp (saniye)
    const ttl = exp - now;

    if (ttl <= 0) {
      throw new BadRequestException("Token süresi dolmuş. Zaten geçersiz durumda.");
    }

    // 4. JTI'yi blacklist'e ekle
    await this.redisService.addToBlacklist(jti, ttl);

    return {
      success: true,
      message: "Başarıyla çıkış yapıldı",
    };
  }

  /**
   * Token'ın blacklist'te olup olmadığını kontrol eder
   *
   * Debug veya admin panel için kullanılabilir.
   *
   * @param token - JWT access token
   * @returns Blacklist'te ise true
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const payload = await this.authService.verifyToken(token);
      return this.redisService.isBlacklisted(payload.jti);
    } catch {
      return false;
    }
  }

  /**
   * Token'ın kalan geçerlilik süresini döndürür
   *
   * Kullanıcıya "token X dakika sonra expire olacak" uyarısı göstermek için kullanılabilir.
   *
   * @param token - JWT access token
   * @returns Kalan süre (saniye cinsinden), -1 (expire olmuş veya geçersiz)
   */
  async getTokenRemainingTime(token: string): Promise<number> {
    try {
      const payload = await this.authService.verifyToken(token);
      const now = Math.floor(Date.now() / 1000);
      const remaining = payload.exp! - now;

      return Math.max(0, remaining);
    } catch {
      return -1;
    }
  }

  /**
   * Kullanıcının tüm session'larını sonlandırır
   *
   * "Tüm cihazlardan çıkış yap" özelliği için kullanılabilir.
   * Not: Bu özellik için JTI pattern'i user ID ile ilişkilendirilmeli (örn: blacklist:user:{userId}:*)
   *
   * ⚠️ Şu anda implementasyonu yoktur - gelecekte eklenebilir
   *
   * @param userId - Kullanıcı ID
   */
  async logoutAllSessions(_userId: string): Promise<LogoutResult> {
    // TODO: Bu özellik için JTI'leri user ID ile ilişkilendirmek gerekir
    // Örnek pattern: blacklist:user:123:jti:abc-def-ghi
    // Şimdilik sadece placeholder

    throw new Error(
      "Tüm session logout özelliği henüz implementasyonu yapılmadı (T027 scope dışı)",
    );
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkarır
   *
   * Logout sonrası audit log için kullanılabilir.
   *
   * @param token - JWT access token
   * @returns Kullanıcı bilgileri (id, email, role)
   */
  async extractUserInfo(token: string): Promise<{
    userId: string;
    email: string;
    role: string;
  } | null> {
    try {
      const payload = await this.authService.verifyToken(token);

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  /**
   * Blacklist'ten eski JTI'leri temizler
   *
   * Redis'te expire olmuş key'ler otomatik silinir, bu method ek temizlik içindir.
   * Cron job ile çalıştırılabilir (opsiyonel).
   *
   * @returns Temizlenen JTI sayısı
   */
  async cleanupExpiredBlacklist(): Promise<number> {
    // Redis'te TTL bitmiş key'ler otomatik silinir
    // Bu method ek kontrol için kullanılabilir
    const pattern = "blacklist:*";
    const keys = await this.redisService.keys(pattern);

    let cleanedCount = 0;

    for (const key of keys) {
      const ttl = await this.redisService.ttl(key);

      // TTL -2 ise key yok, -1 ise expire yok (olmamalı)
      if (ttl === -2) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Redis bağlantısını kontrol eder
   *
   * Health check endpoint'i için kullanılabilir.
   *
   * @returns Bağlantı sağlıklı ise true
   */
  async checkRedisHealth(): Promise<boolean> {
    return this.redisService.ping();
  }
}
