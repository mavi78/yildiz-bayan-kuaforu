/**
 * Email Value Object
 *
 * Email adresi için değer nesnesi. Immutable ve kendi doğrulama mantığını içerir.
 * Domain-Driven Design'da value object'ler değişmez (immutable) ve değerlerine göre
 * eşitlik kontrolü yapılır.
 *
 * @module domains/auth/value-objects
 */

/**
 * Email Value Object
 *
 * Email adresini temsil eden, doğrulama mantığı içeren immutable değer nesnesi.
 * RFC 5322 standardına göre email formatını doğrular.
 */
export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Yeni bir Email value object oluşturur
   *
   * @param email - Email adresi
   * @returns Email value object
   * @throws Error - Geçersiz email formatı durumunda
   */
  public static create(email: string): Email {
    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!this.isValid(normalizedEmail)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    return new Email(normalizedEmail);
  }

  /**
   * Email formatını doğrular
   *
   * RFC 5322 standardına yakın bir regex kullanır.
   * Basit ve yaygın email formatlarını doğrular.
   *
   * @param email - Doğrulanacak email
   * @returns Email geçerliyse true
   */
  private static isValid(email: string): boolean {
    // RFC 5322 Official Standard regex (basitleştirilmiş versiyon)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return false;
    }

    // Ek doğrulamalar
    const parts = email.split("@");
    if (parts.length !== 2) {
      return false;
    }

    const [localPart, domainPart] = parts;

    // Local part kontrolleri
    if (localPart.length === 0 || localPart.length > 64) {
      return false;
    }

    // Domain part kontrolleri
    if (domainPart.length === 0 || domainPart.length > 255) {
      return false;
    }

    // Domain'de en az bir nokta olmalı
    if (!domainPart.includes(".")) {
      return false;
    }

    // Domain parçaları kontrolü
    const domainParts = domainPart.split(".");
    for (const part of domainParts) {
      if (part.length === 0 || part.length > 63) {
        return false;
      }
    }

    return true;
  }

  /**
   * Email adresinin domain kısmını döndürür
   *
   * @returns Domain (örn: "gmail.com")
   */
  public getDomain(): string {
    return this._value.split("@")[1];
  }

  /**
   * Email adresinin local kısmını döndürür
   *
   * @returns Local part (@ işaretinden önceki kısım)
   */
  public getLocalPart(): string {
    return this._value.split("@")[0];
  }

  /**
   * Email'in belirli bir domain'e ait olup olmadığını kontrol eder
   *
   * @param domain - Kontrol edilecek domain (örn: "gmail.com")
   * @returns Domain eşleşirse true
   */
  public isDomain(domain: string): boolean {
    return this.getDomain() === domain.toLowerCase();
  }

  /**
   * Value object eşitlik kontrolü
   *
   * İki Email value object'i değerlerine göre karşılaştırır
   *
   * @param other - Karşılaştırılacak Email
   * @returns Değerler eşitse true
   */
  public equals(other: Email): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Email değerini döndürür
   *
   * @returns Email adresi (lowercase)
   */
  get value(): string {
    return this._value;
  }

  /**
   * String representation
   *
   * @returns Email adresi
   */
  public toString(): string {
    return this._value;
  }

  /**
   * JSON representation
   *
   * @returns Email adresi
   */
  public toJSON(): string {
    return this._value;
  }
}
