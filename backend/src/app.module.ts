import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

/**
 * Ana uygulama modülü
 *
 * @description
 * NestJS uygulamasının root modülü. Tüm feature modüllerini ve
 * global konfigürasyonları içerir.
 *
 * Yapılandırmalar:
 * - ConfigModule: Environment değişkenleri yönetimi
 * - ThrottlerModule: Rate limiting (DDoS koruması)
 *
 * @module AppModule
 */
@Module({
  imports: [
    // Environment değişkenleri
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../.env",
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 saniye
        limit: 100, // Maksimum 100 istek
      },
    ]),

    // Feature modülleri buraya eklenecek
    // AuthModule,
    // AppointmentsModule,
    // CustomersModule,
    // PaymentsModule,
    // ReportsModule,
    // NotificationsModule,
    // WorkingHoursModule,
    // AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
