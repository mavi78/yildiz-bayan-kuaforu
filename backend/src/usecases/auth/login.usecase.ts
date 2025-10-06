/**
 * Login Usecase
 *
 * Kullanıcı giriş (login) iş akışı.
 * Kimlik bilgileri doğrulama → JWT token üretimi → kullanıcı bilgilerini döndürme.
 *
 * @module usecases/auth
 */

import { Injectable } from "@nestjs/common";
import { AuthService, LoginResult } from "../../services/auth.service";

/**
 * Giriş için gerekli kimlik bilgileri
 */
export interface LoginInput {
  emailOrPhone: string; // Email veya telefon numarası
  password: string; // Ham şifre
}

/**
 * Login Usecase
 *
 * Kullanım akışı:
 * 1. Email veya telefon numarası ile kullanıcı doğrulama
 * 2. Şifre doğrulama
 * 3. Kullanıcı aktif durumda mı kontrolü
 * 4. JWT token üretimi
 * 5. Son giriş zamanını güncelleme
 * 6. Token ve kullanıcı bilgilerini döndürme
 *
 * İş kuralları:
 * - Email veya telefon numarası ile giriş yapılabilir
 * - Şifre hash ile karşılaştırılır (bcrypt)
 * - Sadece aktif kullanıcılar giriş yapabilir (isActive = true)
 * - Her başarılı girişte lastLoginAt güncellenir
 * - JWT token rolüne göre farklı expiry süresine sahiptir:
 *   - Admin: 8 saat
 *   - Staff: 12 saat
 *   - Customer: 7 gün
 * - Geçersiz kimlik bilgilerinde generic hata mesajı döner (güvenlik)
 */
@Injectable()
export class LoginUsecase {
  constructor(private readonly authService: AuthService) {}

  /**
   * Kullanıcı girişi yapar
   *
   * @param input - Giriş bilgileri (emailOrPhone, password)
   * @returns JWT token ve kullanıcı bilgileri
   * @throws UnauthorizedException - Kimlik bilgileri geçersizse veya hesap deaktifse
   */
  async execute(input: LoginInput): Promise<LoginResult> {
    // 1. Kimlik bilgileri doğrulama
    const user = await this.authService.validateUser(input.emailOrPhone, input.password);

    // 2. JWT token üretimi ve son giriş zamanını güncelleme
    const loginResult = await this.authService.login(user);

    return loginResult;
  }

  /**
   * Email formatı kontrolü yapar
   *
   * Frontend'de kullanıcının email mi telefon mu girdiğini anlamak için kullanılabilir.
   *
   * @param input - Kullanıcı girişi (email veya telefon)
   * @returns Email ise true, telefon ise false
   */
  isEmail(input: string): boolean {
    return input.includes("@");
  }

  /**
   * Telefon numarası formatını normalize eder
   *
   * Kullanıcı farklı formatlarda telefon girebilir, bu method hepsini +90XXXXXXXXXX formatına çevirir.
   *
   * Desteklenen formatlar:
   * - +90XXXXXXXXXX
   * - 90XXXXXXXXXX
   * - 0XXXXXXXXXX
   * - XXXXXXXXXX (5XX ile başlamalı)
   *
   * @param phone - Ham telefon numarası
   * @returns Normalize edilmiş telefon (+90XXXXXXXXXX) veya null (geçersizse)
   */
  normalizePhone(phone: string): string | null {
    // Boşlukları ve tire işaretlerini temizle
    const cleaned = phone.replace(/[\s\-()]/g, "");

    // +90XXXXXXXXXX formatı
    if (/^\+90[1-9][0-9]{9}$/.test(cleaned)) {
      return cleaned;
    }

    // 90XXXXXXXXXX formatı
    if (/^90[1-9][0-9]{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    // 0XXXXXXXXXX formatı
    if (/^0[1-9][0-9]{9}$/.test(cleaned)) {
      return `+9${cleaned}`;
    }

    // XXXXXXXXXX formatı (5XX ile başlamalı - mobil)
    if (/^5[0-9]{9}$/.test(cleaned)) {
      return `+90${cleaned}`;
    }

    // Geçersiz format
    return null;
  }

  /**
   * Giriş denemesi öncesi input validasyonu yapar
   *
   * Rate limiting'den önce çalıştırılarak gereksiz veritabanı sorguları engellenir.
   *
   * @param input - Giriş bilgileri
   * @returns Validation sonucu
   */
  validateInput(input: LoginInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Email veya telefon boş olamaz
    if (!input.emailOrPhone || input.emailOrPhone.trim().length === 0) {
      errors.push("Email veya telefon numarası gereklidir");
    }

    // Şifre boş olamaz
    if (!input.password || input.password.length === 0) {
      errors.push("Şifre gereklidir");
    }

    // Email/telefon format kontrolü
    if (input.emailOrPhone && input.emailOrPhone.trim().length > 0) {
      const isEmail = this.isEmail(input.emailOrPhone);

      if (isEmail) {
        // Email formatı basit kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.emailOrPhone)) {
          errors.push("Geçersiz email formatı");
        }
      } else {
        // Telefon formatı kontrolü
        const normalized = this.normalizePhone(input.emailOrPhone);
        if (!normalized) {
          errors.push("Geçersiz telefon formatı");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Giriş yapan kullanıcının rolünü döndürür
   *
   * Token içinden çıkarılabilir ama bu method kolaylık için eklenmiştir.
   * Frontend'de role-based routing için kullanılabilir.
   *
   * @param loginResult - Login sonucu
   * @returns Kullanıcı rolü (ADMIN, STAFF, CUSTOMER)
   */
  getUserRole(loginResult: LoginResult): string {
    return loginResult.user.role;
  }

  /**
   * Token expiry süresini saniye cinsinden döndürür
   *
   * Frontend'de token yenileme zamanını hesaplamak için kullanılabilir.
   *
   * @param expiresIn - Token expiry süresi (string format: "8h", "12h", "7d")
   * @returns Süre (saniye cinsinden)
   */
  getExpiryInSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([hd])$/);

    if (!match) {
      throw new Error(`Geçersiz expiry formatı: ${expiresIn}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    if (unit === "h") {
      return value * 60 * 60; // Saat → saniye
    } else if (unit === "d") {
      return value * 24 * 60 * 60; // Gün → saniye
    }

    throw new Error(`Desteklenmeyen expiry birimi: ${unit}`);
  }

  /**
   * Token yenileme zamanını hesaplar
   *
   * Token expire olmadan önce yenilenmeli.
   * Genellikle expiry süresinin %80'i geçtiğinde yenilenir.
   *
   * @param expiresIn - Token expiry süresi (string format)
   * @param refreshThreshold - Yenileme eşiği (0-1 arası, default 0.8 = %80)
   * @returns Yenileme zamanı (timestamp)
   */
  getRefreshTime(expiresIn: string, refreshThreshold: number = 0.8): number {
    const expirySeconds = this.getExpiryInSeconds(expiresIn);
    const refreshSeconds = expirySeconds * refreshThreshold;
    const now = Date.now();

    return now + refreshSeconds * 1000; // Milisaniye
  }
}
