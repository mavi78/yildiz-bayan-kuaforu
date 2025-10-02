import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

/**
 * Bootstrap fonksiyonu - Uygulamayı başlatır
 *
 * @description
 * NestJS uygulamasını yapılandırır ve başlatır:
 * - Global validation pipe (class-validator)
 * - Helmet güvenlik başlıkları
 * - CORS (Cross-Origin Resource Sharing)
 * - Rate limiting (throttler)
 * - Swagger API dokümantasyonu (development)
 *
 * @async
 * @returns {Promise<void>}
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger("Bootstrap");
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix("api");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Throttler guard eklenecek (TBD) - T012 sonrası

  // Security: Helmet
  app.use(helmet());

  // CORS yapılandırması
  app.enableCors({
    origin: configService.get<string>("FRONTEND_URL") || "http://localhost:3000",
    credentials: true,
  });

  // Swagger dokümantasyonu (sadece development)
  const nodeEnv = configService.get<string>("NODE_ENV");
  if (nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Yıldız Bayan Kuaförü API")
      .setDescription("Appointment & Customer Management API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .addTag("auth", "Kimlik Doğrulama")
      .addTag("appointments", "Randevu Yönetimi")
      .addTag("customers", "Müşteri Yönetimi")
      .addTag("payments", "Ödeme Takibi")
      .addTag("reports", "Raporlar")
      .addTag("notifications", "Bildirimler")
      .addTag("working-hours", "Çalışma Saatleri")
      .addTag("audit", "Audit Log")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = configService.get<number>("BACKEND_PORT") || 3001;
  await app.listen(port);

  logger.log(`🚀 Backend API running on: http://localhost:${port}/api`);
  if (nodeEnv !== "production") {
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch(error => {
  const logger = new Logger("Bootstrap");
  logger.error("❌ Backend başlatılamadı:", error);
  process.exit(1);
});
