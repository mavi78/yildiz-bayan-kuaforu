/**
 * Password Value Object
 *
 * Şifre için değer nesnesi. Bcrypt ile hash'leme ve doğrulama işlemlerini içerir.
 * Şifre güvenlik kurallarını (minimum uzunluk, karmaşıklık) uygular.
 *
 * @module domains/auth/value-objects
 */

import * as bcrypt from "bcrypt";

/**
 * Şifre gereksinimleri
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Varsayılan şifre gereksinimleri
 */
const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Opsiyonel tutuldu, kullanıcı deneyimi için
};

/**
 * Password Value Object
 *
 * Şifre hash'leme ve doğrulama mantığını içeren immutable değer nesnesi.
 * Bcrypt algoritması kullanır (salt rounds: 10).
 */
export class Password {
  private readonly _hash: string;

  private constructor(hash: string) {
    this._hash = hash;
  }

  /**
   * Plain text şifreden yeni bir Password value object oluşturur
   *
   * Şifreyi bcrypt ile hash'ler (salt rounds: 10).
   * Şifre gereksinimlerini kontrol eder.
   *
   * @param plainPassword - Ham şifre
   * @param requirements - Şifre gereksinimleri (opsiyonel)
   * @returns Password value object
   * @throws Error - Geçersiz şifre durumunda
   */
  public static async create(
    plainPassword: string,
    requirements: PasswordRequirements = DEFAULT_REQUIREMENTS,
  ): Promise<Password> {
    if (!plainPassword) {
      throw new Error("Password is required");
    }

    // Şifre gereksinimlerini kontrol et
    this.validate(plainPassword, requirements);

    // Bcrypt ile hash'le (salt rounds: 10)
    const hash = await bcrypt.hash(plainPassword, 10);

    return new Password(hash);
  }

  /**
   * Mevcut hash'den Password value object oluşturur
   *
   * Veritabanından gelen hash'lenmiş şifreler için kullanılır.
   *
   * @param hash - Bcrypt hash'i
   * @returns Password value object
   * @throws Error - Geçersiz hash durumunda
   */
  public static fromHash(hash: string): Password {
    if (!hash) {
      throw new Error("Password hash is required");
    }

    // Bcrypt hash formatını kontrol et ($2a$, $2b$ veya $2y$ ile başlamalı)
    if (!this.isValidBcryptHash(hash)) {
      throw new Error("Invalid bcrypt hash format");
    }

    return new Password(hash);
  }

  /**
   * Bcrypt hash formatını doğrular
   *
   * @param hash - Kontrol edilecek hash
   * @returns Geçerli bcrypt hash'i ise true
   */
  private static isValidBcryptHash(hash: string): boolean {
    // Bcrypt hash formatı: $2a$10$... veya $2b$10$... (60 karakter)
    const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
    return bcryptRegex.test(hash);
  }

  /**
   * Şifre gereksinimlerini doğrular
   *
   * @param password - Doğrulanacak şifre
   * @param requirements - Gereksinimler
   * @throws Error - Gereksinimler karşılanmazsa
   */
  private static validate(password: string, requirements: PasswordRequirements): void {
    const errors: string[] = [];

    // Minimum uzunluk kontrolü
    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }

    // Büyük harf kontrolü
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Küçük harf kontrolü
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Rakam kontrolü
    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    // Özel karakter kontrolü
    if (
      requirements.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    // Yaygın zayıf şifreler kontrolü
    const weakPasswords = ["password", "12345678", "qwerty123", "admin123", "letmein"];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push("Password is too weak. Please choose a stronger password");
    }

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  }

  /**
   * Plain text şifreyi mevcut hash ile karşılaştırır
   *
   * @param plainPassword - Kontrol edilecek ham şifre
   * @returns Şifre eşleşirse true
   */
  public async compare(plainPassword: string): Promise<boolean> {
    if (!plainPassword) {
      return false;
    }

    return bcrypt.compare(plainPassword, this._hash);
  }

  /**
   * Şifrenin güçlü olup olmadığını hesaplar
   *
   * Puan sistemi:
   * - Uzunluk: Her karakter için +4 puan
   * - Büyük harf: +6 puan
   * - Küçük harf: +6 puan
   * - Rakam: +8 puan
   * - Özel karakter: +10 puan
   * - Karışık karakter kullanımı bonusu: +15 puan
   *
   * @param plainPassword - Değerlendirilecek şifre
   * @returns Güç skoru (0-100 arası)
   */
  public static calculateStrength(plainPassword: string): number {
    if (!plainPassword) {
      return 0;
    }

    let score = 0;

    // Uzunluk puanı
    score += plainPassword.length * 4;

    // Büyük harf
    if (/[A-Z]/.test(plainPassword)) {
      score += 6;
    }

    // Küçük harf
    if (/[a-z]/.test(plainPassword)) {
      score += 6;
    }

    // Rakam
    if (/\d/.test(plainPassword)) {
      score += 8;
    }

    // Özel karakter
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(plainPassword)) {
      score += 10;
    }

    // Karışık kullanım bonusu
    const hasUpperLower = /[A-Z]/.test(plainPassword) && /[a-z]/.test(plainPassword);
    const hasLettersNumbers = /[a-zA-Z]/.test(plainPassword) && /\d/.test(plainPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(plainPassword);

    if (hasUpperLower && hasLettersNumbers && hasSpecial) {
      score += 15;
    }

    // Maksimum 100 puan
    return Math.min(score, 100);
  }

  /**
   * Şifrenin yeniden hash'lenmesi gerekip gerekmediğini kontrol eder
   *
   * Bcrypt cost factor değişmişse veya hash eski algoritma ile oluşturulmuşsa true döner.
   *
   * @param currentCost - Mevcut cost factor (varsayılan: 10)
   * @returns Yeniden hash'lenmesi gerekiyorsa true
   */
  public needsRehash(currentCost: number = 10): boolean {
    // Hash'in cost factor'ünü çıkar
    const matches = this._hash.match(/^\$2[aby]\$(\d{2})\$/);
    if (!matches) {
      return true; // Geçersiz hash, yeniden hash'lenmeli
    }

    const hashCost = parseInt(matches[1], 10);
    return hashCost < currentCost;
  }

  /**
   * Password hash değerini döndürür
   *
   * @returns Bcrypt hash'i
   */
  get hash(): string {
    return this._hash;
  }

  /**
   * Value object eşitlik kontrolü
   *
   * @param other - Karşılaştırılacak Password
   * @returns Hash'ler eşitse true
   */
  public equals(other: Password): boolean {
    if (!other) {
      return false;
    }
    return this._hash === other._hash;
  }

  /**
   * String representation
   *
   * Güvenlik nedeniyle hash'i direkt döndürmez, maskelenmiş versiyon döner
   *
   * @returns Maskelenmiş hash
   */
  public toString(): string {
    return "[PROTECTED]";
  }

  /**
   * JSON representation
   *
   * Güvenlik nedeniyle hash'i JSON'a dahil etmez
   *
   * @returns Güvenli representation
   */
  public toJSON(): string {
    return "[PROTECTED]";
  }
}
