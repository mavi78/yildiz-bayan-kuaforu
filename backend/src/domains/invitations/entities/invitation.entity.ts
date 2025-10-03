/**
 * Invitation Domain Entity
 *
 * Davet domain varlığı. Kullanıcı kayıt daveti sistemini temsil eder.
 * Sistem invitation-only yaklaşımı kullanır, yeni kullanıcılar sadece
 * davet ile kaydolabilir.
 *
 * @module domains/invitations/entities
 */

import { Token } from '../value-objects/token.vo';

/**
 * Davet edilebilecek roller
 *
 * Admin doğrudan oluşturulur, davet ile sadece Staff ve Customer
 * rolleri için kullanıcı eklenebilir.
 */
export enum InvitationRole {
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

/**
 * Invitation entity özellikleri
 */
export interface InvitationProps {
  id?: string;
  token: Token;
  email: string;
  role: InvitationRole;
  inviterId: string;
  guestCustomerId?: string;
  isUsed?: boolean;
  expiresAt: Date;
  usedAt?: Date;
  createdAt?: Date;
}

/**
 * Invitation Domain Entity
 *
 * Domain-Driven Design prensiplerine göre tasarlanmış davet varlığı.
 * İş kurallarını ve doğrulama mantığını içerir:
 * - 72 saat içinde kullanılmalı
 * - Tek kullanımlık (isUsed flag)
 * - Guest müşteri dönüşümü için guestCustomerId opsiyonel
 */
export class Invitation {
  private readonly _id?: string;
  private readonly _token: Token;
  private readonly _email: string;
  private readonly _role: InvitationRole;
  private readonly _inviterId: string;
  private readonly _guestCustomerId?: string;
  private _isUsed: boolean;
  private readonly _expiresAt: Date;
  private _usedAt?: Date;
  private readonly _createdAt: Date;

  private constructor(props: InvitationProps) {
    this._id = props.id;
    this._token = props.token;
    this._email = props.email;
    this._role = props.role;
    this._inviterId = props.inviterId;
    this._guestCustomerId = props.guestCustomerId;
    this._isUsed = props.isUsed ?? false;
    this._expiresAt = props.expiresAt;
    this._usedAt = props.usedAt;
    this._createdAt = props.createdAt ?? new Date();
  }

  /**
   * Yeni bir davet oluşturur
   *
   * Token otomatik üretilir ve 72 saat sonra expire olur.
   *
   * @param props - Davet özellikleri
   * @returns Invitation entity instance
   * @throws Error - Geçersiz özellikler durumunda
   */
  public static create(
    props: Omit<InvitationProps, 'token' | 'expiresAt'>,
  ): Invitation {
    // Token'ı otomatik oluştur
    const token = Token.generate();

    // 72 saat sonra expire olacak şekilde ayarla
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const fullProps: InvitationProps = {
      ...props,
      token,
      expiresAt,
    };

    this.validate(fullProps);

    return new Invitation(fullProps);
  }

  /**
   * Mevcut davet verilerinden entity yeniden oluşturur (örn: veritabanından)
   *
   * @param props - Davet özellikleri (token string olarak)
   * @returns Invitation entity instance
   */
  public static reconstitute(
    props: Omit<InvitationProps, 'token'> & { token: string },
  ): Invitation {
    const token = Token.fromString(props.token);

    return new Invitation({
      ...props,
      token,
    });
  }

  /**
   * Davet özelliklerini doğrular
   *
   * @param props - Doğrulanacak özellikler
   * @throws Error - Doğrulama başarısız olursa
   */
  private static validate(props: InvitationProps): void {
    if (!props.email || props.email.trim().length === 0) {
      throw new Error('Email is required');
    }

    // Email formatı basit kontrolü (detaylı kontrol Email VO'da)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email)) {
      throw new Error('Invalid email format');
    }

    if (!props.inviterId || props.inviterId.trim().length === 0) {
      throw new Error('Inviter ID is required');
    }

    if (!Object.values(InvitationRole).includes(props.role)) {
      throw new Error(`Invalid role: ${props.role}`);
    }

    if (props.expiresAt <= new Date()) {
      throw new Error('Expiration date must be in the future');
    }
  }

  /**
   * Davetin süresi dolmuş mu kontrol eder
   *
   * @returns Süresi dolmuşsa true
   */
  public isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /**
   * Davetin kullanılabilir olup olmadığını kontrol eder
   *
   * Kullanılabilir olmak için:
   * - Daha önce kullanılmamış olmalı
   * - Süresi dolmamış olmalı
   *
   * @returns Kullanılabilirse true
   */
  public isValid(): boolean {
    return !this._isUsed && !this.isExpired();
  }

  /**
   * Daveti kullanılmış olarak işaretler
   *
   * @throws Error - Davet zaten kullanılmışsa veya süresi dolmuşsa
   */
  public markAsUsed(): void {
    if (this._isUsed) {
      throw new Error('Invitation has already been used');
    }

    if (this.isExpired()) {
      throw new Error('Invitation has expired');
    }

    this._isUsed = true;
    this._usedAt = new Date();
  }

  /**
   * Davetin kalan süresini hesaplar
   *
   * @returns Kalan süre (milisaniye)
   */
  public getRemainingTime(): number {
    const now = new Date().getTime();
    const expiresAt = this._expiresAt.getTime();

    return Math.max(0, expiresAt - now);
  }

  /**
   * Davetin kalan süresini saat olarak döndürür
   *
   * @returns Kalan saat sayısı (decimal)
   */
  public getRemainingHours(): number {
    const remainingMs = this.getRemainingTime();
    return remainingMs / (1000 * 60 * 60);
  }

  /**
   * Davetin guest müşteri dönüşümü için olup olmadığını kontrol eder
   *
   * @returns Guest dönüşümü içinse true
   */
  public isGuestConversion(): boolean {
    return !!this._guestCustomerId;
  }

  /**
   * Davetin davet linkini oluşturur
   *
   * Frontend tarafında kullanılacak kayıt linkini oluşturur.
   *
   * @param baseUrl - Frontend base URL (örn: "https://yildiz-salon.com")
   * @returns Tam davet linki
   */
  public generateInvitationLink(baseUrl: string): string {
    return `${baseUrl}/register?token=${this._token.value}`;
  }

  /**
   * Davetin email gövdesini oluşturur
   *
   * @param senderName - Davet gönderen kişinin adı
   * @param salonName - Salon adı
   * @param invitationLink - Davet linki
   * @returns Email içeriği (HTML)
   */
  public static generateEmailBody(
    senderName: string,
    salonName: string,
    invitationLink: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Davetiye</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #4a5568;">Merhaba,</h2>

    <p>
      ${senderName}, sizi <strong>${salonName}</strong> sistemine davet etti.
    </p>

    <p>
      Kaydınızı tamamlamak için aşağıdaki bağlantıya tıklayın:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationLink}"
         style="background-color: #4299e1; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 5px; display: inline-block;">
        Kayıt Ol
      </a>
    </div>

    <p style="color: #718096; font-size: 14px;">
      Bu davet linki <strong>72 saat</strong> boyunca geçerlidir.
    </p>

    <p style="color: #718096; font-size: 14px;">
      Eğer bu daveti siz talep etmediyseniz, bu e-postayı görmezden gelebilirsiniz.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      ${salonName} - Randevu Yönetim Sistemi
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get token(): Token {
    return this._token;
  }

  get email(): string {
    return this._email;
  }

  get role(): InvitationRole {
    return this._role;
  }

  get inviterId(): string {
    return this._inviterId;
  }

  get guestCustomerId(): string | undefined {
    return this._guestCustomerId;
  }

  get isUsed(): boolean {
    return this._isUsed;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get usedAt(): Date | undefined {
    return this._usedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Entity'yi plain object'e dönüştürür
   *
   * @returns Plain object representation
   */
  public toObject(): {
    id?: string;
    token: string;
    email: string;
    role: InvitationRole;
    inviterId: string;
    guestCustomerId?: string;
    isUsed: boolean;
    expiresAt: Date;
    usedAt?: Date;
    createdAt: Date;
  } {
    return {
      id: this._id,
      token: this._token.value,
      email: this._email,
      role: this._role,
      inviterId: this._inviterId,
      guestCustomerId: this._guestCustomerId,
      isUsed: this._isUsed,
      expiresAt: this._expiresAt,
      usedAt: this._usedAt,
      createdAt: this._createdAt,
    };
  }
}
