/**
 * Email Channel Unit Tests
 *
 * EmailChannel servisinin unit testleri.
 * Gmail SMTP konfigürasyonu ve email gönderimi test edilir.
 *
 * @module services/notifications/channels
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailChannel } from "./email.channel";

describe("EmailChannel", () => {
  let service: EmailChannel;
  let _configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GMAIL_USER: "test@gmail.com",
                GMAIL_APP_PASSWORD: "test-app-password",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailChannel>(EmailChannel);
    _configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should initialize with Gmail credentials", () => {
    expect(service.isReady()).toBe(true);
  });

  it("should not be ready without Gmail credentials", async () => {
    const moduleWithoutCredentials: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    const serviceWithoutCredentials = moduleWithoutCredentials.get<EmailChannel>(EmailChannel);
    expect(serviceWithoutCredentials.isReady()).toBe(false);
  });

  describe("generateAppointmentCreatedEmail", () => {
    it("should generate email for guest appointment with tracking code", () => {
      const result = service.generateAppointmentCreatedEmail(
        "Ahmet Yılmaz",
        "15.10.2025",
        "14:00",
        "Saç Kesimi",
        "ABC12345",
      );

      expect(result.subject).toBe("Randevunuz Oluşturuldu - Saç Kesimi");
      expect(result.html).toContain("Ahmet Yılmaz");
      expect(result.html).toContain("15.10.2025");
      expect(result.html).toContain("14:00");
      expect(result.html).toContain("Saç Kesimi");
      expect(result.html).toContain("ABC12345");
      expect(result.text).toContain("Ahmet Yılmaz");
    });

    it("should generate email for registered appointment without tracking code", () => {
      const result = service.generateAppointmentCreatedEmail(
        "Ayşe Demir",
        "16.10.2025",
        "15:30",
        "Saç Boyama",
      );

      expect(result.subject).toBe("Randevunuz Oluşturuldu - Saç Boyama");
      expect(result.html).toContain("Ayşe Demir");
      expect(result.html).not.toContain("Takip Kodunuz");
      expect(result.text).not.toContain("Takip Kodunuz");
    });
  });

  describe("generateAppointmentConfirmedEmail", () => {
    it("should generate confirmation email", () => {
      const result = service.generateAppointmentConfirmedEmail(
        "Mehmet Kaya",
        "17.10.2025",
        "10:00",
        "Manikür",
      );

      expect(result.subject).toBe("Randevunuz Onaylandı - Manikür");
      expect(result.html).toContain("✅ Randevunuz Onaylandı!");
      expect(result.html).toContain("Mehmet Kaya");
      expect(result.html).toContain("17.10.2025");
      expect(result.html).toContain("10:00");
      expect(result.html).toContain("Manikür");
    });
  });

  describe("generateAppointmentCancelledEmail", () => {
    it("should generate cancellation email with reason", () => {
      const result = service.generateAppointmentCancelledEmail(
        "Fatma Öz",
        "18.10.2025",
        "16:00",
        "Pedikür",
        "Müşteri talebi",
      );

      expect(result.subject).toBe("Randevunuz İptal Edildi - Pedikür");
      expect(result.html).toContain("❌ Randevunuz İptal Edildi");
      expect(result.html).toContain("Fatma Öz");
      expect(result.html).toContain("Müşteri talebi");
    });

    it("should generate cancellation email without reason", () => {
      const result = service.generateAppointmentCancelledEmail(
        "Ali Veli",
        "19.10.2025",
        "11:30",
        "Kaş Tasarımı",
      );

      expect(result.subject).toBe("Randevunuz İptal Edildi - Kaş Tasarımı");
      expect(result.html).toContain("❌ Randevunuz İptal Edildi");
      expect(result.html).not.toContain("Sebep:");
    });
  });

  describe("generatePaymentReminderEmail", () => {
    it("should generate payment reminder email", () => {
      const result = service.generatePaymentReminderEmail(
        "Zeynep Ak",
        250.0,
        "20.10.2025",
        "12.10.2025",
        "Saç Kesimi + Yıkama",
      );

      expect(result.subject).toBe("Ödeme Hatırlatması - 250.00 TL");
      expect(result.html).toContain("💰 Ödeme Hatırlatması");
      expect(result.html).toContain("Zeynep Ak");
      expect(result.html).toContain("250.00 TL");
      expect(result.html).toContain("20.10.2025");
    });
  });

  describe("send", () => {
    it("should return error when transporter is not ready", async () => {
      const serviceWithoutCredentials = new EmailChannel({
        get: jest.fn(() => undefined),
      } as any);

      const result = await serviceWithoutCredentials.send({
        to: "test@example.com",
        subject: "Test",
        text: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.channel).toBe("email");
      expect(result.error).toContain("Email transporter not initialized");
    });

    // Note: Actual email sending tests would require mocking nodemailer
    // and are typically done in integration tests
  });
});
