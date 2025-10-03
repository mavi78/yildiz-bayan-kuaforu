/**
 * User Repository
 *
 * User entity için veri erişim katmanı.
 * Prisma Client kullanarak veritabanı işlemlerini yönetir.
 * Repository pattern ile domain layer'dan veritabanı detaylarını izole eder.
 *
 * @module repositories
 */

import { Injectable } from '@nestjs/common';
import { User as PrismaUser, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * User oluşturma için gerekli veriler
 */
export interface CreateUserData {
  email: string;
  phone: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
}

/**
 * User güncelleme için opsiyonel veriler
 */
export interface UpdateUserData {
  email?: string;
  phone?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

/**
 * User Repository
 *
 * SADECE bu repository Prisma User modelini kullanabilir.
 * Diğer katmanlar (service, usecase) bu repository üzerinden veri erişir.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni kullanıcı oluşturur
   *
   * @param data - Kullanıcı bilgileri
   * @returns Oluşturulan kullanıcı
   * @throws PrismaClientKnownRequestError - Email/phone unique constraint ihlali
   */
  async create(data: CreateUserData): Promise<PrismaUser> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });
  }

  /**
   * ID'ye göre kullanıcı bulur
   *
   * @param id - Kullanıcı ID
   * @returns Kullanıcı veya null
   */
  async findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Email'e göre kullanıcı bulur
   *
   * @param email - Email adresi
   * @returns Kullanıcı veya null
   */
  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Telefon numarasına göre kullanıcı bulur
   *
   * @param phone - Telefon numarası (E.164 formatı)
   * @returns Kullanıcı veya null
   */
  async findByPhone(phone: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Email veya telefona göre kullanıcı bulur
   *
   * Login işlemlerinde kullanılır (email veya phone ile giriş)
   *
   * @param emailOrPhone - Email veya telefon
   * @returns Kullanıcı veya null
   */
  async findByEmailOrPhone(emailOrPhone: string): Promise<PrismaUser | null> {
    // Email formatı kontrolü (basit)
    const isEmail = emailOrPhone.includes('@');

    if (isEmail) {
      return this.findByEmail(emailOrPhone);
    } else {
      return this.findByPhone(emailOrPhone);
    }
  }

  /**
   * Birden fazla kullanıcı getirir (filtreleme ile)
   *
   * @param options - Filtreleme seçenekleri
   * @returns Kullanıcı listesi
   */
  async findMany(options?: {
    role?: Role;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<PrismaUser[]> {
    return this.prisma.user.findMany({
      where: {
        role: options?.role,
        isActive: options?.isActive,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Kullanıcı bilgilerini günceller
   *
   * @param id - Kullanıcı ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş kullanıcı
   * @throws PrismaClientKnownRequestError - Kullanıcı bulunamazsa
   */
  async update(id: string, data: UpdateUserData): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        lastLoginAt: data.lastLoginAt,
      },
    });
  }

  /**
   * Son giriş zamanını günceller
   *
   * @param id - Kullanıcı ID
   * @returns Güncellenmiş kullanıcı
   */
  async updateLastLogin(id: string): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Kullanıcıyı soft delete yapar (isActive = false)
   *
   * Hard delete yerine soft delete kullanılır (veri kaybı önlenir)
   *
   * @param id - Kullanıcı ID
   * @returns Güncellenmiş kullanıcı
   */
  async softDelete(id: string): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Kullanıcıyı aktif hale getirir
   *
   * @param id - Kullanıcı ID
   * @returns Güncellenmiş kullanıcı
   */
  async activate(id: string): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Kullanıcı sayısını döndürür
   *
   * @param options - Filtreleme seçenekleri
   * @returns Kullanıcı sayısı
   */
  async count(options?: { role?: Role; isActive?: boolean }): Promise<number> {
    return this.prisma.user.count({
      where: {
        role: options?.role,
        isActive: options?.isActive,
      },
    });
  }

  /**
   * Kullanıcının var olup olmadığını kontrol eder
   *
   * @param id - Kullanıcı ID
   * @returns Kullanıcı varsa true
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Email'in kullanılıp kullanılmadığını kontrol eder
   *
   * @param email - Email adresi
   * @param excludeUserId - Kontrol dışında tutulacak kullanıcı ID (güncelleme için)
   * @returns Email kullanılıyorsa true
   */
  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        email: email.toLowerCase(),
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
    });
    return count > 0;
  }

  /**
   * Telefon numarasının kullanılıp kullanılmadığını kontrol eder
   *
   * @param phone - Telefon numarası
   * @param excludeUserId - Kontrol dışında tutulacak kullanıcı ID (güncelleme için)
   * @returns Telefon kullanılıyorsa true
   */
  async isPhoneTaken(phone: string, excludeUserId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        phone,
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
    });
    return count > 0;
  }

  /**
   * Kullanıcıyı ilişkili verilerle birlikte getirir
   *
   * @param id - Kullanıcı ID
   * @returns Kullanıcı ve ilişkili veriler
   */
  async findByIdWithRelations(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        customer: true,
        sentInvitations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }
}
