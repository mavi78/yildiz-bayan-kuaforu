/**
 * Token Value Object
 *
 * Davet token'ı için değer nesnesi. UUID v4 formatında token üretir ve doğrular.
 * Immutable ve kendi doğrulama mantığını içerir.
 *
 * @module domains/invitations/value-objects
 */

import { v4 as uuidv4, validate as uuidValidate } from "uuid";

/**
 * Token Value Object
 *
 * Davet token'ını temsil eden, UUID v4 formatında doğrulama yapan immutable değer nesnesi.
 * Token'lar benzersiz, tahmin edilemez ve güvenli olmalıdır.
 */
export class Token {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Yeni bir rastgele Token value object oluşturur
   *
   * UUID v4 algoritması kullanarak kriptografik olarak güvenli
   * bir token üretir.
   *
   * @returns Token value object
   */
  public static generate(): Token {
    const token = uuidv4();
    return new Token(token);
  }

  /**
   * Mevcut token string'inden Token value object oluşturur
   *
   * Token'ı doğrular ve geçerliyse value object oluşturur.
   * Veritabanından gelen tokenlar için kullanılır.
   *
   * @param token - UUID v4 formatında token
   * @returns Token value object
   * @throws Error - Geçersiz token formatı durumunda
   */
  public static fromString(token: string): Token {
    if (!token) {
      throw new Error("Token is required");
    }

    if (!this.isValid(token)) {
      throw new Error(`Invalid token format: ${token}`);
    }

    return new Token(token);
  }

  /**
   * Token formatını doğrular
   *
   * UUID v4 formatını kontrol eder:
   * - 8-4-4-4-12 hexadecimal karakter formatı
   * - Version biti 4 olmalı
   * - Variant biti standart UUID variant olmalı
   *
   * @param token - Doğrulanacak token
   * @returns Token geçerliyse true
   */
  private static isValid(token: string): boolean {
    // UUID validate fonksiyonu ile format kontrolü
    if (!uuidValidate(token)) {
      return false;
    }

    // UUID v4 kontrolü (version biti)
    // UUID v4 formatı: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // 4: version 4
    // y: variant (8, 9, a, veya b)
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return uuidV4Regex.test(token);
  }

  /**
   * Token'ın kısa versiyonunu döndürür
   *
   * Loglama ve kullanıcı arayüzü için kısaltılmış format.
   * Sadece ilk 8 karakteri gösterir.
   *
   * @returns Kısaltılmış token (ilk 8 karakter)
   */
  public getShort(): string {
    return this._value.substring(0, 8);
  }

  /**
   * Token'ı maskelenmiş formatta döndürür
   *
   * Güvenlik nedeniyle token'ın sadece ilk ve son kısımlarını gösterir.
   * Format: xxxxxxxx-****-****-****-xxxxxxxxxxxx
   *
   * @returns Maskelenmiş token
   */
  public getMasked(): string {
    const parts = this._value.split("-");
    if (parts.length !== 5) {
      return this._value;
    }

    return `${parts[0]}-****-****-****-${parts[4]}`;
  }

  /**
   * Token'ın timestamp kısmını çıkarır
   *
   * UUID v4 rastgele üretildiği için gerçek bir timestamp içermez,
   * ancak oluşturulma zamanı yaklaşık olarak tahmin edilebilir.
   *
   * Not: UUID v4'te timestamp yoktur, bu method bilgilendirme amaçlıdır.
   *
   * @returns null (UUID v4'te timestamp yok)
   */
  public getTimestamp(): null {
    // UUID v4 rastgele üretilir, timestamp içermez
    // UUID v1'de timestamp vardır
    return null;
  }

  /**
   * Token'ın benzersizlik seviyesini hesaplar
   *
   * UUID v4 için teorik çakışma olasılığı hesaplaması.
   * 2^122 (yaklaşık 5.3 x 10^36) farklı değer üretilebilir.
   *
   * @returns Benzersizlik bilgisi
   */
  public static getUniquenessInfo(): {
    possibleValues: string;
    collisionProbability: string;
  } {
    return {
      possibleValues: "5.3 x 10^36",
      collisionProbability:
        "Negligible (1 in a billion chance after generating 103 trillion UUIDs)",
    };
  }

  /**
   * Value object eşitlik kontrolü
   *
   * İki Token value object'i değerlerine göre karşılaştırır
   *
   * @param other - Karşılaştırılacak Token
   * @returns Değerler eşitse true
   */
  public equals(other: Token): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Token değerini döndürür
   *
   * @returns UUID v4 formatında token
   */
  get value(): string {
    return this._value;
  }

  /**
   * String representation
   *
   * @returns Token değeri
   */
  public toString(): string {
    return this._value;
  }

  /**
   * JSON representation
   *
   * @returns Token değeri
   */
  public toJSON(): string {
    return this._value;
  }
}
