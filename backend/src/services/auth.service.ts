/**
 * Auth Service
 *
 * Kimlik doğrulama (authentication) servis katmanı.
 * Kullanıcı doğrulama, şifre yönetimi ve JWT token üretimi işlemlerini yönetir.
 *
 * @module services
 */

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { UserRepository } from "../repositories/user.repository";
import { BcryptService } from "./bcrypt.service";
import { RedisService } from "../common/redis.service";

/**
 * JWT Payload yapısı
 *
 * Token içinde taşınacak kullanıcı bilgileri
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  jti: string; // JWT ID (logout için blacklist'te kullanılır)
  iat?: number; // Issued at (otomatik)
  exp?: number; // Expires at (otomatik)
}

/**
 * Login sonucu
 */
export interface LoginResult {
  access_token: string;
  expires_in: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
}

/**
 * Auth Service
 *
 * Kimlik doğrulama iş mantığını içerir:
 * - Kullanıcı doğrulama
 * - Şifre hash'leme ve doğrulama
 * - JWT token üretimi ve yönetimi
 * - Role-based token expiry
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Kullanıcı kimlik bilgilerini doğrular
   *
   * Email veya telefon ile giriş yapılabilir.
   *
   * @param emailOrPhone - Email veya telefon numarası
   * @param password - Ham şifre
   * @returns Doğrulanmış kullanıcı
   * @throws UnauthorizedException - Kimlik bilgileri geçersizse
   */
  async validateUser(
    emailOrPhone: string,
    password: string,
  ): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }> {
    // Kullanıcıyı bul
    const user = await this.userRepository.findByEmailOrPhone(emailOrPhone);

    if (!user) {
      throw new UnauthorizedException("Geçersiz kimlik bilgileri");
    }

    // Kullanıcı aktif mi kontrol et
    if (!user.isActive) {
      throw new UnauthorizedException("Hesap deaktif durumda");
    }

    // Şifre doğrulama
    const isPasswordValid = await this.bcryptService.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Geçersiz kimlik bilgileri");
    }

    // Şifre hash'inin güncellenm esi gerekip gerekmediğini kontrol et
    const needsRehash = await this.bcryptService.needsRehash(user.passwordHash);
    if (needsRehash) {
      // Arka planda hash'i güncelle (isteğe bağlı iyileştirme)
      const newHash = await this.bcryptService.hash(password);
      await this.userRepository.update(user.id, {
        passwordHash: newHash,
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  /**
   * Kullanıcı için JWT token üretir
   *
   * Token expiry süresi kullanıcı rolüne göre değişir:
   * - Admin: 8 saat
   * - Staff: 12 saat
   * - Customer: 7 gün
   *
   * @param user - Kullanıcı bilgileri
   * @returns Access token ve kullanıcı bilgileri
   */
  async login(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }): Promise<LoginResult> {
    // JWT ID (token'ı blacklist'e eklemek için kullanılır)
    const jti = this.generateJti();

    // Role-based expiry
    const expiresIn = this.getExpiryForRole(user.role);

    // JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    // Token üret
    const access_token = this.jwtService.sign(payload, {
      expiresIn,
    });

    // Son giriş zamanını güncelle
    await this.userRepository.updateLastLogin(user.id);

    return {
      access_token,
      expires_in: expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Kullanıcıyı logout yapar
   *
   * Token'ı Redis blacklist'e ekler.
   * Gerçek logout işlemi JwtStrategy'de Redis kontrolü ile yapılır.
   *
   * @param jti - JWT ID
   * @param exp - Token expiry timestamp
   * @returns void
   */
  async logout(jti: string, exp: number): Promise<void> {
    // TTL hesapla (token expire olana kadar)
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    // TTL pozitif ise blacklist'e ekle
    if (ttl > 0) {
      await this.redisService.addToBlacklist(jti, ttl);
    }
  }

  /**
   * Ham şifreyi hash'ler
   *
   * Kullanıcı kayıt veya şifre değiştirme işlemlerinde kullanılır.
   *
   * @param plainPassword - Ham şifre
   * @returns Hash'lenmiş şifre
   */
  async hashPassword(plainPassword: string): Promise<string> {
    return this.bcryptService.hash(plainPassword);
  }

  /**
   * Şifre doğrulama yapar
   *
   * @param plainPassword - Ham şifre
   * @param hashedPassword - Hash'lenmiş şifre
   * @returns Şifre eşleşirse true
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return this.bcryptService.compare(plainPassword, hashedPassword);
  }

  /**
   * Kullanıcı rolüne göre token expiry süresini döndürür
   *
   * - Admin: 8h (güvenlik için kısa)
   * - Staff: 12h (çalışma saati)
   * - Customer: 7d (kullanıcı rahatlığı)
   *
   * @param role - Kullanıcı rolü
   * @returns Expiry süresi (string format: "8h", "12h", "7d")
   */
  private getExpiryForRole(role: Role): string {
    switch (role) {
      case Role.ADMIN:
        return "8h";
      case Role.STAFF:
        return "12h";
      case Role.CUSTOMER:
        return "7d";
      default:
        return "8h";
    }
  }

  /**
   * Benzersiz JWT ID üretir
   *
   * UUID v4 benzeri format (basitleştirilmiş)
   *
   * @returns JWT ID
   */
  private generateJti(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * JWT payload'dan kullanıcı bilgilerini çıkarır
   *
   * @param token - JWT token
   * @returns Decoded payload
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new UnauthorizedException("Geçersiz token");
    }
  }

  /**
   * Token'dan kullanıcı ID'sini çıkarır
   *
   * @param token - JWT token
   * @returns User ID
   */
  async getUserIdFromToken(token: string): Promise<string> {
    const payload = await this.verifyToken(token);
    return payload.sub;
  }
}
