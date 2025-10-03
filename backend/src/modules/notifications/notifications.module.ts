/**
 * Notifications Module
 *
 * WebSocket notifications module.
 * Provides real-time notification delivery via Socket.io gateway.
 *
 * @module modules/notifications
 */

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationsGateway } from "./notifications.gateway";

/**
 * Notifications Module
 *
 * Socket.io gateway ve real-time notification servisleri için module.
 *
 * Exports:
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
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
