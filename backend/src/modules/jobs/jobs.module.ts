import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueManager } from '../../jobs/queue.config';
import { NotificationProcessor } from '../../jobs/notification.processor';
import { AuditArchiveJob } from '../../jobs/audit-archive.job';
import { NotificationRepository } from '../../repositories/notification.repository';
import { AuditLogRepository } from '../../repositories/audit-log.repository';
import { NotificationService } from '../../services/notifications/notification.service';
import { EmailChannel } from '../../services/notifications/channels/email.channel';
import { SmsChannel } from '../../services/notifications/channels/sms.channel';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../../common/prisma.service';

/**
 * Jobs Module
 *
 * BullMQ background job processor'larını ve cron job'ları yöneten modül.
 * Tüm background job'lar bu modülde tanımlanır.
 *
 * Processors:
 * - NotificationProcessor: Multi-channel bildirim gönderimi (T078) ✅
 * - AuditArchiveJob: Audit log arşivleme (T079) ✅
 * - VeresiyeReminderJob: Veresiye hatırlatıcıları (T080 - gelecek)
 *
 * @module JobsModule
 */
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    PrismaService,
    QueueManager,
    NotificationProcessor,
    AuditArchiveJob,
    NotificationRepository,
    AuditLogRepository,
    NotificationService,
    EmailChannel,
    SmsChannel,
    NotificationsGateway,
  ],
  exports: [QueueManager],
})
export class JobsModule {}
