/**
 * Invitation Repository
 *
 * Invitation entity için veri erişim katmanı.
 * Prisma Client kullanarak davet işlemlerini yönetir.
 * Repository pattern ile domain layer'dan veritabanı detaylarını izole eder.
 *
 * @module repositories
 */

import { Injectable } from "@nestjs/common";
import { Invitation as PrismaInvitation, Role } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * Invitation oluşturma için gerekli veriler
 */
export interface CreateInvitationData {
  token: string;
  email: string;
  role: Role;
  inviterId: string;
  guestCustomerId?: string;
  expiresAt: Date;
}

/**
 * Invitation Repository
 *
 * SADECE bu repository Prisma Invitation modelini kullanabilir.
 * Diğer katmanlar (service, usecase) bu repository üzerinden veri erişir.
 */
@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni davet oluşturur
   *
   * @param data - Davet bilgileri
   * @returns Oluşturulan davet
   * @throws PrismaClientKnownRequestError - Token unique constraint ihlali
   */
  async create(data: CreateInvitationData): Promise<PrismaInvitation> {
    return this.prisma.invitation.create({
      data: {
        token: data.token,
        email: data.email.toLowerCase(),
        role: data.role,
        inviterId: data.inviterId,
        guestCustomerId: data.guestCustomerId,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Token'a göre davet bulur
   *
   * @param token - Davet token'ı (UUID v4)
   * @returns Davet veya null
   */
  async findByToken(token: string): Promise<PrismaInvitation | null> {
    return this.prisma.invitation.findUnique({
      where: { token },
    });
  }

  /**
   * Token'a göre davet bulur ve ilişkili verileri getirir
   *
   * @param token - Davet token'ı
   * @returns Davet ve ilişkili veriler
   */
  async findByTokenWithRelations(token: string): Promise<PrismaInvitation | null> {
    return this.prisma.invitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        guestCustomer: true,
      },
    });
  }

  /**
   * Email'e göre aktif (kullanılmamış ve süresi dolmamış) davet bulur
   *
   * Yeni davet oluşturmadan önce mevcut aktif davet kontrolü için kullanılır
   *
   * @param email - Email adresi
   * @returns Aktif davet veya null
   */
  async findActiveByEmail(email: string): Promise<PrismaInvitation | null> {
    const now = new Date();

    return this.prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        isUsed: false,
        expiresAt: {
          gt: now, // Henüz süres dolmamış
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Daveti kullanılmış olarak işaretler
   *
   * @param token - Davet token'ı
   * @returns Güncellenmiş davet
   * @throws PrismaClientKnownRequestError - Davet bulunamazsa
   */
  async markUsed(token: string): Promise<PrismaInvitation> {
    return this.prisma.invitation.update({
      where: { token },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Süresi dolmuş davetleri siler
   *
   * Cleanup job'ı tarafından çağrılır
   *
   * @returns Silinen davet sayısı
   */
  async deleteExpired(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.invitation.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
        isUsed: false,
      },
    });

    return result.count;
  }

  /**
   * Davet gönderen kullanıcının tüm davetlerini getirir
   *
   * Admin dashboard'da kullanılır
   *
   * @param inviterId - Davet gönderen kullanıcı ID
   * @param options - Filtreleme ve pagination
   * @returns Davet listesi
   */
  async findByInviter(
    inviterId: string,
    options?: {
      isUsed?: boolean;
      skip?: number;
      take?: number;
    },
  ): Promise<PrismaInvitation[]> {
    return this.prisma.invitation.findMany({
      where: {
        inviterId,
        isUsed: options?.isUsed,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        guestCustomer: true,
      },
    });
  }

  /**
   * Tüm davetleri getirir (pagination ile)
   *
   * Admin davet yönetimi için
   *
   * @param options - Filtreleme ve pagination
   * @returns Davet listesi
   */
  async findAll(options?: {
    isUsed?: boolean;
    role?: Role;
    skip?: number;
    take?: number;
  }): Promise<PrismaInvitation[]> {
    return this.prisma.invitation.findMany({
      where: {
        isUsed: options?.isUsed,
        role: options?.role,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        guestCustomer: true,
      },
    });
  }

  /**
   * Davet sayısını döndürür
   *
   * @param options - Filtreleme seçenekleri
   * @returns Davet sayısı
   */
  async count(options?: { isUsed?: boolean; inviterId?: string; role?: Role }): Promise<number> {
    return this.prisma.invitation.count({
      where: {
        isUsed: options?.isUsed,
        inviterId: options?.inviterId,
        role: options?.role,
      },
    });
  }

  /**
   * Davetin var olup olmadığını kontrol eder
   *
   * @param token - Davet token'ı
   * @returns Davet varsa true
   */
  async exists(token: string): Promise<boolean> {
    const count = await this.prisma.invitation.count({
      where: { token },
    });
    return count > 0;
  }

  /**
   * Davetin kullanılabilir olup olmadığını kontrol eder
   *
   * Kullanılabilir olmak için:
   * - Daha önce kullanılmamış olmalı
   * - Süresi dolmamış olmalı
   *
   * @param token - Davet token'ı
   * @returns Kullanılabilirse true
   */
  async isValid(token: string): Promise<boolean> {
    const now = new Date();

    const count = await this.prisma.invitation.count({
      where: {
        token,
        isUsed: false,
        expiresAt: {
          gt: now,
        },
      },
    });

    return count > 0;
  }

  /**
   * Süresi yakında dolacak davetleri getirir
   *
   * Hatırlatma email'leri göndermek için kullanılabilir
   *
   * @param hoursBeforeExpiry - Kaç saat kala uyarı gönderileceği
   * @returns Davet listesi
   */
  async findExpiringBefore(hoursBeforeExpiry: number): Promise<PrismaInvitation[]> {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + hoursBeforeExpiry * 60 * 60 * 1000);

    return this.prisma.invitation.findMany({
      where: {
        isUsed: false,
        expiresAt: {
          gt: now,
          lt: expiryThreshold,
        },
      },
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Guest customer'a ait davetleri bulur
   *
   * Guest-to-registered dönüşüm takibi için
   *
   * @param guestCustomerId - Guest customer ID
   * @returns Davet listesi
   */
  async findByGuestCustomer(guestCustomerId: string): Promise<PrismaInvitation[]> {
    return this.prisma.invitation.findMany({
      where: {
        guestCustomerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Daveti siler
   *
   * Genellikle kullanılmaz, soft delete (markUsed) tercih edilir
   * Sadece test ortamları veya admin müdahalesi için
   *
   * @param token - Davet token'ı
   * @returns Silinen davet
   */
  async delete(token: string): Promise<PrismaInvitation> {
    return this.prisma.invitation.delete({
      where: { token },
    });
  }

  /**
   * Davet token'ını yeniler (yeni token, yeni expiry)
   *
   * Süresi dolmuş bir davet için yeni token oluşturur
   *
   * @param oldToken - Eski token
   * @param newToken - Yeni token
   * @param newExpiresAt - Yeni expiry tarihi
   * @returns Güncellenmiş davet
   */
  async regenerateToken(
    oldToken: string,
    newToken: string,
    newExpiresAt: Date,
  ): Promise<PrismaInvitation> {
    return this.prisma.invitation.update({
      where: { token: oldToken },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });
  }
}
