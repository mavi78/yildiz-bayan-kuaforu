import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config.module";
import { SharedModule } from "@modules/shared";
import { AuthModule } from "@modules/auth/auth.module";
import { AppointmentsModule } from "@modules/appointments/appointments.module";
import { CustomersModule } from "@modules/customers/customers.module";
import { PaymentsModule } from "@modules/payments/payments.module";
import { ReportsModule } from "@modules/reports/reports.module";

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
    ConfigModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 saniye
        limit: 100, // Maksimum 100 istek
      },
    ]),

    // Feature modülleri
    SharedModule,
    AuthModule,
    AppointmentsModule,
    CustomersModule,
    PaymentsModule,
    ReportsModule,
    // NotificationsModule,
    // WorkingHoursModule,
    // AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
