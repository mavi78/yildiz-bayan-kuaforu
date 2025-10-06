/**
 * Invitation Service
 *
 * Davet yönetimi servis katmanı.
 * Davet oluşturma, doğrulama ve kullanım işlemlerini yönetir.
 *
 * @module services
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Invitation, Role } from "@prisma/client";
import { InvitationRepository } from "../repositories/invitation.repository";
import { AuditService } from "./audit.service";

/**
 * Davet oluşturma için gerekli veriler
 */
export interface CreateInvitationInput {
  email: string;
  role: Role;
  inviterId: string;
  guestCustomerId?: string;
}

/**
 * Davet doğrulama sonucu
 */
export interface InvitationValidationResult {
  isValid: boolean;
  invitation?: Invitation;
  reason?: string;
}

/**
 * Invitation Service
 *
 * Davet iş mantığını içerir:
 * - Davet oluşturma (token üretimi, 72h expiry)
 * - Davet doğrulama
 * - Davet kullanımı (markUsed)
 * - Süresi dolmuş davet temizliği
 */
@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Yeni davet oluşturur
   *
   * İş kuralları:
   * - Aynı email için aktif davet varsa hata döner
   * - Token otomatik üretilir (UUID v4)
   * - Expiry: 72 saat sonra
   * - Admin doğrudan oluşturulur, sadece Staff ve Customer davet edilir
   *
   * @param data - Davet bilgileri
   * @returns Oluşturulan davet
   * @throws ConflictException - Aktif davet zaten varsa
   * @throws BadRequestException - Admin rolü için davet oluşturulamaz
   */
  async create(data: CreateInvitationInput): Promise<Invitation> {
    // Admin için davet oluşturulamaz
    if (data.role === Role.ADMIN) {
      throw new BadRequestException("Admin kullanıcılar davet ile oluşturulamaz");
    }

    // Aynı email için aktif davet var mı kontrol et
    const existingInvitation = await this.invitationRepository.findActiveByEmail(data.email);

    if (existingInvitation) {
      throw new ConflictException(`${data.email} için zaten aktif bir davet mevcut`);
    }

    // Token üret (UUID v4)
    const token = this.generateToken();

    // 72 saat sonra expire olacak
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // Daveti oluştur
    const invitation = await this.invitationRepository.create({
      token,
      email: data.email,
      role: data.role,
      inviterId: data.inviterId,
      guestCustomerId: data.guestCustomerId,
      expiresAt,
    });

    // Audit log'a kaydet
    await this.auditService.logInvitationCreated(
      invitation.id,
      data.inviterId,
      data.email,
      data.role,
      expiresAt,
      data.guestCustomerId,
    );

    return invitation;
  }

  /**
   * Token'a göre davet bulur
   *
   * @param token - Davet token'ı
   * @returns Davet
   * @throws NotFoundException - Davet bulunamazsa
   */
  async findByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundException("Davet bulunamadı");
    }

    return invitation;
  }

  /**
   * Token'a göre davet bulur ve ilişkili verileri getirir
   *
   * @param token - Davet token'ı
   * @returns Davet ve ilişkili veriler
   * @throws NotFoundException - Davet bulunamazsa
   */
  async findByTokenWithRelations(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findByTokenWithRelations(token);

    if (!invitation) {
      throw new NotFoundException("Davet bulunamadı");
    }

    return invitation;
  }

  /**
   * Davetin geçerli olup olmadığını kontrol eder
   *
   * Geçerlilik kriterleri:
   * - Davet bulunmalı
   * - Kullanılmamış olmalı
   * - Süresi dolmamış olmalı
   *
   * @param token - Davet token'ı
   * @returns Doğrulama sonucu
   */
  async validateNotExpired(token: string): Promise<InvitationValidationResult> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      return {
        isValid: false,
        reason: "Davet bulunamadı",
      };
    }

    if (invitation.isUsed) {
      return {
        isValid: false,
        invitation,
        reason: "Davet daha önce kullanılmış",
      };
    }

    const now = new Date();
    if (invitation.expiresAt <= now) {
      return {
        isValid: false,
        invitation,
        reason: "Davetin süresi dolmuş",
      };
    }

    return {
      isValid: true,
      invitation,
    };
  }

  /**
   * Daveti kullanılmış olarak işaretler
   *
   * İş kuralları:
   * - Davet daha önce kullanılmamış olmalı
   * - Davet süresi dolmamış olmalı
   *
   * @param token - Davet token'ı
   * @returns Güncellenmiş davet
   * @throws BadRequestException - Davet geçersizse
   */
  async markUsed(token: string): Promise<Invitation> {
    // Önce doğrula
    const validation = await this.validateNotExpired(token);

    if (!validation.isValid) {
      throw new BadRequestException(validation.reason);
    }

    // Kullanıldı olarak işaretle
    return this.invitationRepository.markUsed(token);
  }

  /**
   * Davet gönderen kullanıcının tüm davetlerini getirir
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
  ): Promise<Invitation[]> {
    return this.invitationRepository.findByInviter(inviterId, options);
  }

  /**
   * Tüm davetleri getirir (admin için)
   *
   * @param options - Filtreleme ve pagination
   * @returns Davet listesi
   */
  async findAll(options?: {
    isUsed?: boolean;
    role?: Role;
    skip?: number;
    take?: number;
  }): Promise<Invitation[]> {
    return this.invitationRepository.findAll(options);
  }

  /**
   * Davet sayısını döndürür
   *
   * @param options - Filtreleme seçenekleri
   * @returns Davet sayısı
   */
  async count(options?: { isUsed?: boolean; inviterId?: string; role?: Role }): Promise<number> {
    return this.invitationRepository.count(options);
  }

  /**
   * Süresi dolmuş davetleri siler
   *
   * Cleanup job tarafından çağrılır (cron).
   *
   * @returns Silinen davet sayısı
   */
  async deleteExpired(): Promise<number> {
    return this.invitationRepository.deleteExpired();
  }

  /**
   * Davetin kalan süresini hesaplar (saat cinsinden)
   *
   * @param invitation - Davet
   * @returns Kalan saat sayısı
   */
  getRemainingHours(invitation: Invitation): number {
    const now = new Date();
    const remainingMs = invitation.expiresAt.getTime() - now.getTime();
    return Math.max(0, remainingMs / (1000 * 60 * 60));
  }

  /**
   * Davet token'ını yeniler
   *
   * Süresi dolmuş bir davet için yeni token ve expiry oluşturur.
   *
   * @param oldToken - Eski token
   * @returns Güncellenmiş davet
   * @throws NotFoundException - Davet bulunamazsa
   */
  async regenerateToken(oldToken: string): Promise<Invitation> {
    await this.findByToken(oldToken);

    // Yeni token üret
    const newToken = this.generateToken();

    // 72 saat sonra expire olacak
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 72);

    return this.invitationRepository.regenerateToken(oldToken, newToken, newExpiresAt);
  }

  /**
   * Süresi yakında dolacak davetleri getirir
   *
   * Email hatırlatması göndermek için kullanılabilir.
   *
   * @param hoursBeforeExpiry - Kaç saat kala uyarı gönderileceği
   * @returns Davet listesi
   */
  async findExpiringBefore(hoursBeforeExpiry: number): Promise<Invitation[]> {
    return this.invitationRepository.findExpiringBefore(hoursBeforeExpiry);
  }

  /**
   * Guest customer'a ait davetleri bulur
   *
   * Guest-to-registered dönüşüm takibi için.
   *
   * @param guestCustomerId - Guest customer ID
   * @returns Davet listesi
   */
  async findByGuestCustomer(guestCustomerId: string): Promise<Invitation[]> {
    return this.invitationRepository.findByGuestCustomer(guestCustomerId);
  }

  /**
   * Davet linki oluşturur
   *
   * Frontend registration sayfasına yönlendiren tam URL.
   *
   * @param token - Davet token'ı
   * @param baseUrl - Frontend base URL (opsiyonel, env'den alınabilir)
   * @returns Davet linki
   */
  generateInvitationLink(token: string, baseUrl?: string): string {
    const url = baseUrl || process.env.FRONTEND_URL || "http://localhost:3000";
    return `${url}/register?token=${token}`;
  }

  /**
   * Davet email body'si oluşturur
   *
   * @param inviterName - Davet gönderen kişinin adı
   * @param salonName - Salon adı
   * @param invitationLink - Davet linki
   * @returns HTML email içeriği
   */
  generateEmailBody(inviterName: string, salonName: string, invitationLink: string): string {
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
      ${inviterName}, sizi <strong>${salonName}</strong> sistemine davet etti.
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

  /**
   * UUID v4 formatında token üretir
   *
   * @returns Token (UUID v4)
   */
  private generateToken(): string {
    // UUID v4 üretimi (basitleştirilmiş)
    // Gerçek implementasyonda 'uuid' paketi kullanılmalı
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
