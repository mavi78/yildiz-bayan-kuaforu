import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { AuditLogRepository } from "../repositories/audit-log.repository";
import { NotificationRepository } from "../repositories/notification.repository";

/**
 * Audit Archive Job
 *
 * Denetim kayıtlarını ve başarısız bildirimleri arşivleyen cron job.
 *
 * @remarks
 * - Çalışma zamanı: Her gün saat 02:00'de
 * - Audit log arşivleme: 90+ gün önceki kayıtlar
 * - Notification arşivleme: 30+ gün önceki başarısız bildirimler (FR-047a)
 * - Format: JSONL (JSON Lines) - her satır bir JSON objesi
 * - Hash chain doğrulama: SHA-256 zincir bütünlüğü kontrol edilir
 * - WORM storage: Arşiv dosyaları immutable (chattr +i Linux)
 * - Retention: Minimum 5 yıl
 *
 * İş Akışı:
 * 1. 90+ gün önceki audit log'ları getir
 * 2. Hash chain'i doğrula (bütünlük kontrolü)
 * 3. JSONL formatında dosyaya yaz (append mode)
 * 4. Dosyayı immutable yap (chattr +i)
 * 5. Database'den kayıtları sil (archived=true işaretleyip sil)
 * 6. 30+ gün önceki başarısız notification'ları arşivle
 *
 * @class AuditArchiveJob
 */
@Injectable()
export class AuditArchiveJob {
  private readonly logger = new Logger(AuditArchiveJob.name);
  private readonly archiveDir = process.env.AUDIT_ARCHIVE_DIR || "./storage/audit-archive";

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Cron job: Her gün saat 02:00'de çalışır
   *
   * @Cron('0 2 * * *') - 02:00:00 daily
   */
  @Cron("0 2 * * *", {
    name: "audit-archive-job",
    timeZone: "Europe/Istanbul",
  })
  async handleAuditArchive() {
    this.logger.log("Starting audit archive job...");

    try {
      // 1. Audit log arşivleme (90+ gün)
      await this.archiveAuditLogs();

      // 2. Notification arşivleme (30+ gün, başarısız olanlar)
      await this.archiveFailedNotifications();

      this.logger.log("Audit archive job completed successfully");
    } catch (error) {
      this.logger.error(`Audit archive job failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 90+ gün önceki audit log kayıtlarını arşivler
   */
  private async archiveAuditLogs() {
    this.logger.log("Archiving audit logs (90+ days old)...");

    // 1. Arşivlenecek kayıtları getir
    const logsToArchive = await this.auditLogRepository.findToArchive(90);

    if (logsToArchive.length === 0) {
      this.logger.log("No audit logs to archive");
      return;
    }

    this.logger.log(`Found ${logsToArchive.length} audit logs to archive`);

    // 2. Hash chain doğrulama
    const isValid = this.verifyHashChain(logsToArchive);
    if (!isValid) {
      throw new Error("Hash chain verification failed! Data integrity compromised.");
    }

    this.logger.log("Hash chain verification passed");

    // 3. Arşiv dizinini oluştur (yoksa)
    await fs.mkdir(this.archiveDir, { recursive: true });

    // 4. JSONL dosyasına yaz
    const archiveFileName = `audit-logs-${this.getDateString()}.jsonl`;
    const archiveFilePath = join(this.archiveDir, archiveFileName);

    const jsonlLines = logsToArchive.map(log =>
      JSON.stringify({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        actorId: log.actorId,
        targetEntity: log.targetEntity,
        targetId: log.targetId,
        details: log.details,
        justification: log.justification,
        hash: log.hash,
        previousHash: log.previousHash,
        createdAt: log.createdAt,
      }),
    );

    await fs.appendFile(archiveFilePath, jsonlLines.join("\n") + "\n", "utf-8");

    this.logger.log(`Archived ${logsToArchive.length} logs to ${archiveFilePath}`);

    // 5. Dosyayı immutable yap (Linux chattr +i)
    await this.makeFileImmutable(archiveFilePath);

    // 6. Database'den kayıtları işaretle ve sil
    const ids = logsToArchive.map(log => log.id);
    await this.auditLogRepository.markArchived(ids);
    const deletedCount = await this.auditLogRepository.deleteArchived();

    this.logger.log(`Deleted ${deletedCount} archived audit logs from database`);
  }

  /**
   * 30+ gün önceki başarısız notification'ları arşivler
   */
  private async archiveFailedNotifications() {
    this.logger.log("Archiving failed notifications (30+ days old)...");

    // 1. Arşivlenecek notification'ları getir
    const notificationsToArchive = await this.notificationRepository.findToArchive(30);

    if (notificationsToArchive.length === 0) {
      this.logger.log("No failed notifications to archive");
      return;
    }

    this.logger.log(`Found ${notificationsToArchive.length} notifications to archive`);

    // 2. Arşiv dizinini oluştur (yoksa)
    await fs.mkdir(this.archiveDir, { recursive: true });

    // 3. JSONL dosyasına yaz
    const archiveFileName = `notifications-${this.getDateString()}.jsonl`;
    const archiveFilePath = join(this.archiveDir, archiveFileName);

    const jsonlLines = notificationsToArchive.map(notification =>
      JSON.stringify({
        id: notification.id,
        eventType: notification.eventType,
        customerId: notification.customerId,
        appointmentId: notification.appointmentId,
        channels: notification.channels,
        emailStatus: notification.emailStatus,
        smsStatus: notification.smsStatus,
        socketStatus: notification.socketStatus,
        attemptCount: notification.attemptCount,
        lastError: notification.lastError,
        createdAt: notification.createdAt,
      }),
    );

    await fs.appendFile(archiveFilePath, jsonlLines.join("\n") + "\n", "utf-8");

    this.logger.log(
      `Archived ${notificationsToArchive.length} notifications to ${archiveFilePath}`,
    );

    // 4. Dosyayı immutable yap
    await this.makeFileImmutable(archiveFilePath);

    // 5. Database'den sil
    const ids = notificationsToArchive.map(n => n.id);
    const deletedCount = await this.notificationRepository.deleteMany(ids);

    this.logger.log(`Deleted ${deletedCount} archived notifications from database`);
  }

  /**
   * Hash chain bütünlüğünü doğrular
   *
   * @param logs - Audit log kayıtları (timestamp'e göre sıralı olmalı)
   * @returns Bütünlük doğruysa true
   */
  private verifyHashChain(logs: any[]): boolean {
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // İlk kayıt için previousHash null olmalı
      if (i === 0 && log.previousHash !== null) {
        this.logger.error(`First log should have previousHash=null, got: ${log.previousHash}`);
        return false;
      }

      // Sonraki kayıtlar için previousHash önceki kaydın hash'i olmalı
      if (i > 0) {
        const expectedPreviousHash = logs[i - 1].hash;
        if (log.previousHash !== expectedPreviousHash) {
          this.logger.error(
            `Hash chain broken at index ${i}: expected previousHash=${expectedPreviousHash}, got=${log.previousHash}`,
          );
          return false;
        }
      }

      // Hash doğrulama (yeniden hesapla)
      const computedHash = this.computeHash(log);
      if (log.hash !== computedHash) {
        this.logger.error(
          `Hash mismatch at index ${i}: expected=${log.hash}, computed=${computedHash}`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * SHA-256 hash hesaplar
   *
   * @param log - Audit log kaydı
   * @returns SHA-256 hex string
   */
  private computeHash(log: any): string {
    const data = `${log.timestamp}${log.action}${log.actorId}${log.targetEntity}${log.targetId}${JSON.stringify(log.details)}${log.previousHash || ""}`;
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Dosyayı immutable yapar (Linux chattr +i)
   *
   * WORM (Write Once Read Many) storage için gerekli.
   * Linux dışı sistemlerde sadece readonly yapar.
   *
   * @param filePath - Dosya yolu
   */
  private async makeFileImmutable(filePath: string) {
    try {
      // Linux için chattr +i (immutable flag)
      if (process.platform === "linux") {
        const { exec } = require("child_process");
        await new Promise((resolve, reject) => {
          exec(`chattr +i "${filePath}"`, (error: any) => {
            if (error) {
              this.logger.warn(`Could not set immutable flag: ${error.message}`);
              resolve(null); // Hata olsa da devam et
            } else {
              this.logger.log(`Set immutable flag on ${filePath}`);
              resolve(null);
            }
          });
        });
      } else {
        // Linux dışı sistemlerde readonly yap
        await fs.chmod(filePath, 0o444); // read-only for all
        this.logger.log(`Set read-only permission on ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to make file immutable: ${error.message}`);
    }
  }

  /**
   * Bugünün tarihini YYYY-MM-DD formatında döndürür
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
