import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { QueueManager } from "../../jobs/queue.config";
import { NotificationProcessor } from "../../jobs/notification.processor";
import { AuditArchiveJob } from "../../jobs/audit-archive.job";
import { VeresiyeReminderJob } from "../../jobs/veresiye-reminder.job";
import { NotificationRepository } from "../../repositories/notification.repository";
import { AuditLogRepository } from "../../repositories/audit-log.repository";
import { PaymentRepository } from "../../repositories/payment.repository";
import { PrismaService } from "../../common/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";

/**
 * Jobs Module
 *
 * BullMQ background job processor'larını ve cron job'ları yöneten modül.
 * Tüm background job'lar bu modülde tanımlanır.
 *
 * Processors:
 * - NotificationProcessor: Multi-channel bildirim gönderimi (T078) ✅
 * - AuditArchiveJob: Audit log arşivleme (T079) ✅
 * - VeresiyeReminderJob: Veresiye hatırlatıcıları (T080) ✅
 *
 * @module JobsModule
 */
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), NotificationsModule],
  providers: [
    PrismaService,
    QueueManager,
    NotificationProcessor,
    AuditArchiveJob,
    VeresiyeReminderJob,
    NotificationRepository,
    AuditLogRepository,
    PaymentRepository,
  ],
  exports: [QueueManager],
})
export class JobsModule {}
