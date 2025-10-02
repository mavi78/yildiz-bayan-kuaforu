import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
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
  const app = await NestFactory.create(AppModule);

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

  // Security: Helmet
  app.use(helmet());

  // CORS yapılandırması
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  // Swagger dokümantasyonu (sadece development)
  if (process.env.NODE_ENV !== "production") {
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

  const port = process.env.BACKEND_PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend API running on: http://localhost:${port}/api`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch(error => {
  console.error("❌ Backend başlatılamadı:", error);
  process.exit(1);
});
