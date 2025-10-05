import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueManager } from '../../jobs/queue.config';
import { NotificationProcessor } from '../../jobs/notification.processor';
import { NotificationRepository } from '../../repositories/notification.repository';
import { NotificationService } from '../../services/notifications/notification.service';
import { EmailChannel } from '../../services/notifications/channels/email.channel';
import { SmsChannel } from '../../services/notifications/channels/sms.channel';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../../common/prisma.service';

/**
 * Jobs Module
 *
 * BullMQ background job processor'larını yöneten modül.
 * Tüm background job'lar bu modülde tanımlanır.
 *
 * Processors:
 * - NotificationProcessor: Multi-channel bildirim gönderimi (T078)
 * - AuditArchiveProcessor: Audit log arşivleme (T079 - gelecek)
 * - VeresiyeReminderProcessor: Veresiye hatırlatıcıları (T080 - gelecek)
 *
 * @module JobsModule
 */
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    QueueManager,
    NotificationProcessor,
    NotificationRepository,
    NotificationService,
    EmailChannel,
    SmsChannel,
    NotificationsGateway,
  ],
  exports: [QueueManager],
})
export class JobsModule {}
