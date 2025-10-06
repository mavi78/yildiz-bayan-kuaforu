/**
 * SMS Channel Unit Tests
 *
 * SmsChannel servisinin unit testleri.
 * İleti Merkezi SMS API konfigürasyonu ve SMS gönderimi test edilir.
 *
 * @module services/notifications/channels
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SmsChannel } from "./sms.channel";

describe("SmsChannel", () => {
  let service: SmsChannel;
  let _configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ILETI_MERKEZI_API_KEY: "test-api-key",
                ILETI_MERKEZI_API_SECRET: "test-api-secret",
                ILETI_MERKEZI_SENDER: "YILDIZ",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SmsChannel>(SmsChannel);
    _configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should initialize with İleti Merkezi credentials", () => {
    expect(service.isReady()).toBe(true);
  });

  it("should not be ready without İleti Merkezi credentials", async () => {
    const moduleWithoutCredentials: TestingModule = await Test.createTestingModule({
      providers: [
        SmsChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    const serviceWithoutCredentials = moduleWithoutCredentials.get<SmsChannel>(SmsChannel);
    expect(serviceWithoutCredentials.isReady()).toBe(false);
  });

  describe("generateAppointmentCreatedSms", () => {
    it("should generate SMS for guest appointment with tracking code", () => {
      const result = service.generateAppointmentCreatedSms(
        "Ahmet Yılmaz",
        "15.10.2025",
        "14:00",
        "Saç Kesimi",
        "ABC12345",
      );

      expect(result).toContain("Ahmet Yılmaz");
      expect(result).toContain("15.10.2025");
      expect(result).toContain("14:00");
      expect(result).toContain("Saç Kesimi");
      expect(result).toContain("ABC12345");
      expect(result).toContain("Takip Kodu");
    });

    it("should generate SMS for registered appointment without tracking code", () => {
      const result = service.generateAppointmentCreatedSms(
        "Ayşe Demir",
        "16.10.2025",
        "15:30",
        "Saç Boyama",
      );

      expect(result).toContain("Ayşe Demir");
      expect(result).toContain("16.10.2025");
      expect(result).toContain("15:30");
      expect(result).not.toContain("Takip Kodu");
    });
  });

  describe("generateAppointmentConfirmedSms", () => {
    it("should generate confirmation SMS", () => {
      const result = service.generateAppointmentConfirmedSms(
        "Mehmet Kaya",
        "17.10.2025",
        "10:00",
        "Manikür",
      );

      expect(result).toContain("ONAYLANDI");
      expect(result).toContain("Mehmet Kaya");
      expect(result).toContain("17.10.2025");
      expect(result).toContain("10:00");
      expect(result).toContain("Manikür");
    });
  });

  describe("generateAppointmentCancelledSms", () => {
    it("should generate cancellation SMS with reason", () => {
      const result = service.generateAppointmentCancelledSms(
        "Fatma Öz",
        "18.10.2025",
        "16:00",
        "Pedikür",
        "Müşteri talebi",
      );

      expect(result).toContain("IPTAL");
      expect(result).toContain("Fatma Öz");
      expect(result).toContain("Müşteri talebi");
    });

    it("should generate cancellation SMS without reason", () => {
      const result = service.generateAppointmentCancelledSms(
        "Ali Veli",
        "19.10.2025",
        "11:30",
        "Kaş Tasarımı",
      );

      expect(result).toContain("IPTAL");
      expect(result).toContain("Ali Veli");
      expect(result).not.toContain("Sebep:");
    });
  });

  describe("generatePaymentReminderSms", () => {
    it("should generate payment reminder SMS", () => {
      const result = service.generatePaymentReminderSms(
        "Zeynep Ak",
        250.0,
        "20.10.2025",
      );

      expect(result).toContain("Odeme Hatirlatmasi");
      expect(result).toContain("Zeynep Ak");
      expect(result).toContain("250.00 TL");
      expect(result).toContain("20.10.2025");
    });
  });

  describe("send", () => {
    it("should return error when API client is not ready", async () => {
      const serviceWithoutCredentials = new SmsChannel({
        get: jest.fn(() => undefined),
      } as any);

      const result = await serviceWithoutCredentials.send({
        to: "+905551234567",
        message: "Test SMS",
      });

      expect(result.success).toBe(false);
      expect(result.channel).toBe("sms");
      expect(result.error).toContain("SMS API client not initialized");
    });

    // Note: Actual SMS sending tests would require mocking axios
    // and are typically done in integration tests
  });
});
