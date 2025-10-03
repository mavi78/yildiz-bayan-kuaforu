/**
 * User Domain Entity
 *
 * Kullanıcı domain varlığı. Sistemdeki tüm kullanıcıları (Admin, Staff, Customer) temsil eder.
 * Bu entity, domain katmanında iş mantığını ve doğrulama kurallarını içerir.
 *
 * @module domains/auth/entities
 */

import { Email } from '../value-objects/email.vo';
import { Phone } from '../value-objects/phone.vo';
import { Password } from '../value-objects/password.vo';

/**
 * Kullanıcı rolleri
 */
export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

/**
 * User entity özellikleri
 */
export interface UserProps {
  id?: string;
  email: Email;
  phone: Phone;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Domain Entity
 *
 * Domain-Driven Design prensiplerine göre tasarlanmış kullanıcı varlığı.
 * İş kurallarını ve doğrulama mantığını içerir, veritabanı detaylarından bağımsızdır.
 */
export class User {
  private readonly _id?: string;
  private _email: Email;
  private _phone: Phone;
  private _passwordHash: string;
  private _firstName: string;
  private _lastName: string;
  private _role: Role;
  private _isActive: boolean;
  private _lastLoginAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._phone = props.phone;
    this._passwordHash = props.passwordHash;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._role = props.role;
    this._isActive = props.isActive ?? true;
    this._lastLoginAt = props.lastLoginAt;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  /**
   * Yeni bir kullanıcı oluşturur
   *
   * @param props - Kullanıcı özellikleri
   * @returns User entity instance
   * @throws Error - Geçersiz özellikler durumunda
   */
  public static create(props: UserProps): User {
    this.validate(props);
    return new User(props);
  }

  /**
   * Mevcut kullanıcı verilerinden entity yeniden oluşturur (örn: veritabanından)
   *
   * @param props - Kullanıcı özellikleri
   * @returns User entity instance
   */
  public static reconstitute(props: UserProps): User {
    return new User(props);
  }

  /**
   * Kullanıcı özelliklerini doğrular
   *
   * @param props - Doğrulanacak özellikler
   * @throws Error - Doğrulama başarısız olursa
   */
  private static validate(props: UserProps): void {
    if (!props.firstName || props.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!props.lastName || props.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    if (!props.passwordHash || props.passwordHash.length === 0) {
      throw new Error('Password hash is required');
    }

    if (!Object.values(Role).includes(props.role)) {
      throw new Error(`Invalid role: ${props.role}`);
    }
  }

  /**
   * Kullanıcının tam adını döndürür
   *
   * @returns Tam ad (ad + soyad)
   */
  public getFullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  /**
   * Kullanıcının aktif olup olmadığını kontrol eder
   *
   * @returns Kullanıcı aktifse true
   */
  public isUserActive(): boolean {
    return this._isActive;
  }

  /**
   * Kullanıcıyı deaktif eder (soft delete)
   */
  public deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Kullanıcıyı aktif eder
   */
  public activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /**
   * Son giriş zamanını günceller
   */
  public updateLastLogin(): void {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Kullanıcı bilgilerini günceller
   *
   * @param firstName - Yeni ad (opsiyonel)
   * @param lastName - Yeni soyad (opsiyonel)
   */
  public updateProfile(firstName?: string, lastName?: string): void {
    if (firstName && firstName.trim().length > 0) {
      this._firstName = firstName.trim();
    }
    if (lastName && lastName.trim().length > 0) {
      this._lastName = lastName.trim();
    }
    this._updatedAt = new Date();
  }

  /**
   * Email adresini günceller
   *
   * @param email - Yeni email
   */
  public updateEmail(email: Email): void {
    this._email = email;
    this._updatedAt = new Date();
  }

  /**
   * Telefon numarasını günceller
   *
   * @param phone - Yeni telefon
   */
  public updatePhone(phone: Phone): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Şifre hash'ini günceller
   *
   * @param passwordHash - Yeni şifre hash'i
   */
  public updatePasswordHash(passwordHash: string): void {
    if (!passwordHash || passwordHash.length === 0) {
      throw new Error('Password hash is required');
    }
    this._passwordHash = passwordHash;
    this._updatedAt = new Date();
  }

  /**
   * Kullanıcının belirli bir role sahip olup olmadığını kontrol eder
   *
   * @param role - Kontrol edilecek rol
   * @returns Kullanıcı role sahipse true
   */
  public hasRole(role: Role): boolean {
    return this._role === role;
  }

  /**
   * Kullanıcının admin olup olmadığını kontrol eder
   *
   * @returns Admin ise true
   */
  public isAdmin(): boolean {
    return this._role === Role.ADMIN;
  }

  /**
   * Kullanıcının staff olup olmadığını kontrol eder
   *
   * @returns Staff ise true
   */
  public isStaff(): boolean {
    return this._role === Role.STAFF;
  }

  /**
   * Kullanıcının customer olup olmadığını kontrol eder
   *
   * @returns Customer ise true
   */
  public isCustomer(): boolean {
    return this._role === Role.CUSTOMER;
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get phone(): Phone {
    return this._phone;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get role(): Role {
    return this._role;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Entity'yi plain object'e dönüştürür
   *
   * @returns Plain object representation
   */
  public toObject(): {
    id?: string;
    email: string;
    phone: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this._id,
      email: this._email.value,
      phone: this._phone.value,
      passwordHash: this._passwordHash,
      firstName: this._firstName,
      lastName: this._lastName,
      role: this._role,
      isActive: this._isActive,
      lastLoginAt: this._lastLoginAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
