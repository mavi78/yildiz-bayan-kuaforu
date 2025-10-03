/**
 * Phone Value Object
 *
 * Telefon numarası için değer nesnesi. E.164 formatında Türkiye telefon numaralarını
 * doğrular ve normalize eder. Immutable ve kendi doğrulama mantığını içerir.
 *
 * @module domains/auth/value-objects
 */

/**
 * Phone Value Object
 *
 * Telefon numarasını temsil eden, E.164 formatında doğrulama yapan immutable değer nesnesi.
 * Türkiye telefon numaraları için özelleştirilmiştir (+90XXXXXXXXXX formatı).
 */
export class Phone {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Yeni bir Phone value object oluşturur
   *
   * Girdi formatları:
   * - +905551234567 (E.164 formatı - tercih edilen)
   * - 905551234567
   * - 05551234567
   * - 5551234567
   *
   * Çıktı her zaman E.164 formatındadır: +90XXXXXXXXXX
   *
   * @param phone - Telefon numarası
   * @returns Phone value object
   * @throws Error - Geçersiz telefon formatı durumunda
   */
  public static create(phone: string): Phone {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    const normalizedPhone = this.normalize(phone);

    if (!this.isValid(normalizedPhone)) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }

    return new Phone(normalizedPhone);
  }

  /**
   * Telefon numarasını E.164 formatına normalize eder
   *
   * @param phone - Ham telefon numarası
   * @returns E.164 formatında telefon (+90XXXXXXXXXX)
   */
  private static normalize(phone: string): string {
    // Boşluk, tire ve parantez gibi karakterleri temizle
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

    // Başta + varsa koru, yoksa sonra ekle
    const hasPlus = cleaned.startsWith('+');
    if (hasPlus) {
      cleaned = cleaned.substring(1);
    }

    // Türkiye kodu (90) kontrolü ve eklenmesi
    if (cleaned.startsWith('90')) {
      // Zaten 90 ile başlıyor
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // 0 ile başlıyorsa, 0'ı kaldır ve 90 ekle
      return '+90' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      // 10 haneli numara, direkt 90 ekle
      return '+90' + cleaned;
    } else {
      // Diğer durumlar
      return '+' + cleaned;
    }
  }

  /**
   * E.164 formatında Türkiye telefon numarasını doğrular
   *
   * Format: +90XXXXXXXXXX (toplam 13 karakter)
   * - Başta + işareti
   * - 90 ülke kodu (Türkiye)
   * - 10 haneli numara
   *
   * @param phone - Doğrulanacak telefon (E.164 formatında olmalı)
   * @returns Geçerliyse true
   */
  private static isValid(phone: string): boolean {
    // E.164 formatı kontrolü: +90XXXXXXXXXX
    const e164Regex = /^\+90[1-9]\d{9}$/;

    if (!e164Regex.test(phone)) {
      return false;
    }

    // Alan kodu kontrolü (5XX mobil operatörler için)
    const areaCode = phone.substring(3, 6);
    const validAreaCodes = [
      '501', '505', '506', '507', '551', '552', '553', '554', '555', '556', '559', // Turkcell
      '530', '531', '532', '533', '534', '535', '536', '537', '538', '539', // Vodafone
      '541', '542', '543', '544', '545', '546', '547', '548', '549', // Türk Telekom
    ];

    // Sabit hat numaraları için (2XX, 3XX, 4XX başlangıçlı)
    const firstDigit = phone.charAt(3);
    if (['2', '3', '4'].includes(firstDigit)) {
      return true; // Sabit hat numarası
    }

    // Mobil operatör kontrolü
    return validAreaCodes.includes(areaCode);
  }

  /**
   * Telefon numarasının mobil numara olup olmadığını kontrol eder
   *
   * @returns Mobil numaraysa true
   */
  public isMobile(): boolean {
    const firstDigit = this._value.charAt(3);
    return firstDigit === '5';
  }

  /**
   * Telefon numarasının sabit hat olup olmadığını kontrol eder
   *
   * @returns Sabit hatsa true
   */
  public isLandline(): boolean {
    const firstDigit = this._value.charAt(3);
    return ['2', '3', '4'].includes(firstDigit);
  }

  /**
   * Telefon numarasının ülke kodunu döndürür
   *
   * @returns Ülke kodu (örn: "90")
   */
  public getCountryCode(): string {
    return this._value.substring(1, 3);
  }

  /**
   * Telefon numarasının ulusal formatını döndürür
   *
   * @returns Ulusal format (0XXXXXXXXXX)
   */
  public getNationalFormat(): string {
    // +90XXXXXXXXXX -> 0XXXXXXXXXX
    return '0' + this._value.substring(3);
  }

  /**
   * Telefon numarasının alan kodunu döndürür
   *
   * @returns Alan kodu (mobil için 3 hane, sabit hat için değişken)
   */
  public getAreaCode(): string {
    if (this.isMobile()) {
      return this._value.substring(3, 6); // 5XX
    } else {
      return this._value.substring(3, 6); // 2XX, 3XX, 4XX
    }
  }

  /**
   * Telefon numarasını maskelenmiş formatta döndürür
   *
   * Format: +90 5XX *** XX XX
   *
   * @returns Maskelenmiş telefon numarası
   */
  public getMasked(): string {
    if (this._value.length !== 13) {
      return this._value;
    }

    const countryCode = this._value.substring(0, 3); // +90
    const areaCode = this._value.substring(3, 6); // 5XX
    const lastFour = this._value.substring(9); // XXXX

    return `${countryCode} ${areaCode} *** ${lastFour.substring(0, 2)} ${lastFour.substring(2)}`;
  }

  /**
   * Formatlanmış telefon numarasını döndürür
   *
   * Format: +90 5XX XXX XX XX
   *
   * @returns Formatlanmış telefon numarası
   */
  public getFormatted(): string {
    if (this._value.length !== 13) {
      return this._value;
    }

    const countryCode = this._value.substring(0, 3); // +90
    const areaCode = this._value.substring(3, 6); // 5XX
    const part1 = this._value.substring(6, 9); // XXX
    const part2 = this._value.substring(9, 11); // XX
    const part3 = this._value.substring(11); // XX

    return `${countryCode} ${areaCode} ${part1} ${part2} ${part3}`;
  }

  /**
   * Value object eşitlik kontrolü
   *
   * @param other - Karşılaştırılacak Phone
   * @returns Değerler eşitse true
   */
  public equals(other: Phone): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Telefon numarasının değerini döndürür (E.164 formatı)
   *
   * @returns Telefon numarası (+90XXXXXXXXXX)
   */
  get value(): string {
    return this._value;
  }

  /**
   * String representation
   *
   * @returns Telefon numarası (E.164 formatı)
   */
  public toString(): string {
    return this._value;
  }

  /**
   * JSON representation
   *
   * @returns Telefon numarası (E.164 formatı)
   */
  public toJSON(): string {
    return this._value;
  }
}
