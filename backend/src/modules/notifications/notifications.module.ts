/**
 * Notifications Module
 *
 * Multi-channel notification module.
 * Provides Email, SMS, and Socket.io notification delivery.
 *
 * T076: NotificationService, EmailChannel, SmsChannel, NotificationRepository entegrasyonu
 *
 * @module modules/notifications
 */

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationService } from "../../services/notifications/notification.service";
import { EmailChannel } from "../../services/notifications/channels/email.channel";
import { SmsChannel } from "../../services/notifications/channels/sms.channel";
import { NotificationRepository } from "../../repositories/notification.repository";
import { PrismaService } from "../../common/prisma.service";

/**
 * Notifications Module
 *
 * Çoklu kanal (Email, SMS, Socket.io) bildirim sistemi için module.
 *
 * Provides:
 * - NotificationService: Ana bildirim servisi
 * - EmailChannel: Email gönderimi (Nodemailer + Gmail)
 * - SmsChannel: SMS gönderimi (İleti Merkezi API)
 * - NotificationsGateway: Real-time Socket.io bildirimleri
 * - NotificationRepository: Database CRUD işlemleri
 *
 * Exports:
 * - NotificationService: Diğer modüller tarafından kullanılabilir
 * - NotificationsGateway: Diğer modüller tarafından kullanılabilir
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "7d", // Default expiry, can be overridden
        },
      }),
    }),
  ],
  providers: [
    PrismaService,
    NotificationRepository,
    EmailChannel,
    SmsChannel,
    NotificationsGateway,
    NotificationService,
  ],
  exports: [NotificationService, NotificationsGateway],
})
export class NotificationsModule {}
