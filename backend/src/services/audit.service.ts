/**
 * Audit Service
 *
 * Denetim (audit) log yönetimi servis katmanı.
 * Hash chain ile bütünlük koruması sağlar.
 *
 * @module services
 */

import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditLogRepository } from "../repositories/audit-log.repository";
import { createHash } from "crypto";

/**
 * Audit log oluşturma için gerekli veriler
 */
export interface CreateAuditLogInput {
  action: string;
  actorId: string;
  targetEntity: string;
  targetId: string;
  details: Record<string, any>;
  justification?: string;
}

/**
 * Audit Service
 *
 * İş kuralları:
 * - Her audit log kaydı SHA-256 hash chain'e dahil edilir (FR-063)
 * - Hash = SHA256(timestamp + action + actorId + targetEntity + targetId + details + previousHash)
 * - İlk kayıt için previousHash = null
 * - Justification required for .override or .force actions (FR-061)
 */
@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Yeni audit log kaydı oluşturur
   *
   * Hash chain ile bütünlük koruması sağlar.
   *
   * @param input - Audit log verisi
   * @returns Oluşturulan kayıt
   */
  async createAuditLog(input: CreateAuditLogInput) {
    const timestamp = new Date();

    // En son kaydı al (previousHash için)
    const latestLog = await this.auditLogRepository.findLatest();
    const previousHash = latestLog?.hash || null;

    // Hash hesapla (FR-063)
    const hash = this.calculateHash({
      timestamp,
      action: input.action,
      actorId: input.actorId,
      targetEntity: input.targetEntity,
      targetId: input.targetId,
      details: input.details,
      previousHash,
    });

    // Audit log oluştur
    const auditLogData: Prisma.AuditLogCreateInput = {
      timestamp,
      action: input.action,
      actor: { connect: { id: input.actorId } },
      targetEntity: input.targetEntity,
      targetId: input.targetId,
      details: input.details,
      justification: input.justification,
      hash,
      previousHash,
    };

    return this.auditLogRepository.create(auditLogData);
  }

  /**
   * Login başarısızlığını audit log'a kaydeder
   *
   * @param userId - Kullanıcı ID
   * @param emailOrPhone - Email veya telefon
   * @param reason - Başarısızlık nedeni
   * @param attemptCount - Deneme sayısı
   */
  async logLoginFailure(
    userId: string | null,
    emailOrPhone: string,
    reason: string,
    attemptCount: number,
  ) {
    // Eğer kullanıcı bulunamadıysa, sistemin kendisini actor olarak kullan
    const actorId = userId || "system";

    return this.createAuditLog({
      action: "auth.login_failed",
      actorId,
      targetEntity: "User",
      targetId: userId || "unknown",
      details: {
        emailOrPhone,
        reason,
        attemptCount,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Hesap kilitlenmesini audit log'a kaydeder
   *
   * @param userId - Kullanıcı ID
   * @param reason - Kilitlenme nedeni
   * @param attemptCount - Toplam başarısız deneme sayısı
   * @param lockDuration - Kilitlenme süresi
   * @param lockedUntil - Kilit bitiş zamanı
   */
  async logAccountLock(
    userId: string,
    reason: string,
    attemptCount: number,
    lockDuration: string,
    lockedUntil: Date,
  ) {
    return this.createAuditLog({
      action: "auth.account_locked",
      actorId: userId,
      targetEntity: "User",
      targetId: userId,
      details: {
        reason,
        attemptCount,
        lockDuration,
        lockedUntil,
      },
    });
  }

  /**
   * Başarılı login'i audit log'a kaydeder
   *
   * @param userId - Kullanıcı ID
   * @param emailOrPhone - Email veya telefon
   */
  async logLoginSuccess(userId: string, emailOrPhone: string) {
    return this.createAuditLog({
      action: "auth.login_success",
      actorId: userId,
      targetEntity: "User",
      targetId: userId,
      details: {
        emailOrPhone,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Davet oluşturulmasını audit log'a kaydeder
   *
   * @param invitationId - Davet ID
   * @param inviterId - Daveti oluşturan kullanıcı ID
   * @param email - Davet edilen email
   * @param role - Davet edilen rol
   * @param expiresAt - Davet son kullanma tarihi
   * @param guestCustomerId - Guest customer ID (varsa)
   */
  async logInvitationCreated(
    invitationId: string,
    inviterId: string,
    email: string,
    role: string,
    expiresAt: Date,
    guestCustomerId?: string,
  ) {
    return this.createAuditLog({
      action: "auth.invitation_created",
      actorId: inviterId,
      targetEntity: "Invitation",
      targetId: invitationId,
      details: {
        email,
        role,
        expiresAt,
        guestCustomerId: guestCustomerId || null,
      },
    });
  }

  /**
   * Hesap deaktivasyonunu audit log'a kaydeder
   *
   * @param userId - Kullanıcı ID
   * @param actorId - İşlemi yapan kullanıcı ID
   * @param reason - Deaktivasyon nedeni
   */
  async logAccountDeactivation(userId: string, actorId: string, reason: string) {
    return this.createAuditLog({
      action: "auth.account_deactivated",
      actorId,
      targetEntity: "User",
      targetId: userId,
      details: {
        reason,
      },
    });
  }

  /**
   * SHA-256 hash hesaplar (FR-063)
   *
   * Hash = SHA256(timestamp + action + actorId + targetEntity + targetId + details + previousHash)
   *
   * @param data - Hash hesaplanacak veri
   * @returns SHA-256 hex string (64 karakter)
   */
  private calculateHash(data: {
    timestamp: Date;
    action: string;
    actorId: string;
    targetEntity: string;
    targetId: string;
    details: Record<string, any>;
    previousHash: string | null;
  }): string {
    const hashInput = [
      data.timestamp.toISOString(),
      data.action,
      data.actorId,
      data.targetEntity,
      data.targetId,
      JSON.stringify(data.details),
      data.previousHash || "",
    ].join("|");

    return createHash("sha256").update(hashInput).digest("hex");
  }

  /**
   * Hash chain'i doğrular
   *
   * Verilen kayıt dizisinin hash chain'inin bozulmamış olduğunu kontrol eder.
   *
   * @param startId - Başlangıç kayıt ID
   * @param limit - Kontrol edilecek kayıt sayısı
   * @returns Doğrulama sonucu
   */
  async verifyHashChain(
    startId: string,
    limit = 100,
  ): Promise<{ isValid: boolean; invalidAt?: number; error?: string }> {
    const chain = await this.auditLogRepository.findChain(startId, limit);

    if (chain.length === 0) {
      return { isValid: false, error: "No records found" };
    }

    for (let i = 0; i < chain.length; i++) {
      const record = chain[i];
      const expectedPreviousHash = i === 0 ? null : chain[i - 1].hash;

      if (record.previousHash !== expectedPreviousHash) {
        return {
          isValid: false,
          invalidAt: i,
          error: `previousHash mismatch at index ${i}`,
        };
      }

      // Hash'i yeniden hesapla ve kontrol et
      const recalculatedHash = this.calculateHash({
        timestamp: record.timestamp,
        action: record.action,
        actorId: record.actorId,
        targetEntity: record.targetEntity,
        targetId: record.targetId,
        details: record.details as Record<string, any>,
        previousHash: record.previousHash,
      });

      if (recalculatedHash !== record.hash) {
        return {
          isValid: false,
          invalidAt: i,
          error: `Hash mismatch at index ${i}`,
        };
      }
    }

    return { isValid: true };
  }
}
