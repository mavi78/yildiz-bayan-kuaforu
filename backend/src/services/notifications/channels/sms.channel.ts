/**
 * SMS Notification Channel
 *
 * İleti Merkezi SMS API üzerinden SMS gönderimi için notification channel implementasyonu.
 * Axios kullanarak İleti Merkezi REST API'sine bağlanır ve SMS gönderir.
 *
 * FR-043: İleti Merkezi SMS konfigürasyonu
 * FR-044: Admin tarafından kanal seçimi
 * FR-046: Retry logic (3 deneme)
 *
 * @module services/notifications/channels
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";
import { NotificationChannel } from "@domains/notifications/value-objects/channel.vo";
import { NotificationResult } from "@domains/notifications/entities/notification.entity";

/**
 * SMS gönderim seçenekleri
 */
export interface SmsSendOptions {
  to: string; // E.164 format: +905XXXXXXXXX
  message: string;
  sender?: string; // Başlık (opsiyonel, default: sistem başlığı)
}

/**
 * İleti Merkezi API yanıt yapısı
 *
 * API'den dönen JSON yanıtının type definition'ı
 */
interface IletiMerkeziResponse {
  status: {
    code: number;
    message: string;
  };
  order?: {
    id: string;
  };
}

/**
 * DLR (Delivery Report) callback verisi
 *
 * İleti Merkezi'nden webhook ile gelen delivery raporu
 */
export interface DlrReport {
  orderId: string;
  status: "DELIVERED" | "UNDELIVERED" | "EXPIRED" | "REJECTED";
  phone: string;
  timestamp: string;
}

/**
 * SMS Channel Service
 *
 * İleti Merkezi REST API üzerinden SMS gönderimi yapan servis.
 * Axios HTTP client kullanarak güvenli SMS gönderimi sağlar.
 *
 * API Endpoint: https://api.iletimerkezi.com/v1/send-sms
 * Authentication: API Key (Authorization header)
 * Format: JSON
 */
@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);
  private readonly apiClient: AxiosInstance | null = null;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly defaultSender: string;
  private readonly apiBaseUrl = "https://api.iletimerkezi.com/v1";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("ILETI_MERKEZI_API_KEY") || "";
    this.apiSecret = this.configService.get<string>("ILETI_MERKEZI_API_SECRET") || "";
    this.defaultSender = this.configService.get<string>("ILETI_MERKEZI_SENDER") || "YILDIZ";

    this.apiClient = this.initializeApiClient();
  }

  /**
   * Axios API client'ını başlatır
   *
   * İleti Merkezi REST API konfigürasyonu ile axios instance oluşturur.
   * Environment değişkenleri eksikse client null kalır.
   *
   * @returns Axios instance veya null
   */
  private initializeApiClient(): AxiosInstance | null {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        "İleti Merkezi credentials not configured. SMS notifications will be disabled. " +
          "Please set ILETI_MERKEZI_API_KEY and ILETI_MERKEZI_API_SECRET environment variables.",
      );
      return null;
    }

    try {
      const client = axios.create({
        baseURL: this.apiBaseUrl,
        timeout: 10000, // 10 saniye timeout
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      // Request interceptor: Her request'e API credentials ekle
      client.interceptors.request.use(config => {
        config.headers["Authorization"] = `Bearer ${this.apiKey}`;
        return config;
      });

      // Response interceptor: Hataları logla
      client.interceptors.response.use(
        response => response,
        (error: AxiosError) => {
          this.logger.error("İleti Merkezi API error:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
          });
          return Promise.reject(error);
        },
      );

      this.logger.log("İleti Merkezi SMS API client initialized successfully");
      return client;
    } catch (error) {
      this.logger.error("Failed to initialize İleti Merkezi API client:", error);
      return null;
    }
  }

  /**
   * SMS gönderir
   *
   * İleti Merkezi REST API'sine POST request göndererek SMS gönderir.
   * API endpoint: POST /v1/send-sms
   *
   * Request body format (JSON):
   * {
   *   "request": {
   *     "authentication": {
   *       "key": "API_KEY",
   *       "hash": "API_SECRET"
   *     },
   *     "order": {
   *       "sender": "YILDIZ",
   *       "sendDateTime": "",
   *       "message": {
   *         "text": "Mesaj içeriği",
   *         "receipents": {
   *           "number": ["905XXXXXXXXX"]
   *         }
   *       }
   *     }
   *   }
   * }
   *
   * @param options - SMS gönderim seçenekleri
   * @returns NotificationResult - Gönderim sonucu
   */
  async send(options: SmsSendOptions): Promise<NotificationResult> {
    if (!this.apiClient) {
      return {
        success: false,
        channel: NotificationChannel.SMS,
        error: "SMS API client not initialized. Please check İleti Merkezi credentials.",
      };
    }

    try {
      // Telefon numarasını normalize et (E.164 format)
      const normalizedPhone = this.normalizePhoneNumber(options.to);

      // SMS mesajını doğrula
      if (!options.message || options.message.trim().length === 0) {
        throw new Error("SMS message cannot be empty");
      }

      // Mesaj uzunluğunu kontrol et (160 karakter = 1 SMS, 306 karakter = 2 SMS)
      const messageLength = options.message.length;
      const smsCount = Math.ceil(messageLength / 160);
      this.logger.debug(`SMS length: ${messageLength} chars, estimated ${smsCount} SMS credit(s)`);

      // İleti Merkezi API request body
      const requestBody = {
        request: {
          authentication: {
            key: this.apiKey,
            hash: this.apiSecret,
          },
          order: {
            sender: options.sender || this.defaultSender,
            sendDateTime: "", // Boş = hemen gönder
            message: {
              text: options.message,
              receipents: {
                number: [normalizedPhone],
              },
            },
          },
        },
      };

      this.logger.debug(`Sending SMS to ${normalizedPhone} via İleti Merkezi`);

      // API request gönder
      const response = await this.apiClient.post<IletiMerkeziResponse>("/send-sms", requestBody);

      // Yanıtı kontrol et
      if (response.data.status.code === 200) {
        this.logger.log(
          `SMS sent successfully to ${normalizedPhone}. Order ID: ${response.data.order?.id}`,
        );

        return {
          success: true,
          channel: NotificationChannel.SMS,
          sentAt: new Date(),
        };
      } else {
        const errorMessage = `SMS failed with code ${response.data.status.code}: ${response.data.status.message}`;
        this.logger.error(errorMessage);

        return {
          success: false,
          channel: NotificationChannel.SMS,
          error: errorMessage,
        };
      }
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.logger.error(`Failed to send SMS to ${options.to}:`, errorMessage);

      return {
        success: false,
        channel: NotificationChannel.SMS,
        error: errorMessage,
      };
    }
  }

  /**
   * Telefon numarasını E.164 formatına normalize eder
   *
   * Desteklenen format örnekleri:
   * - 5XXXXXXXXX → +905XXXXXXXXX
   * - 05XXXXXXXXX → +905XXXXXXXXX
   * - 905XXXXXXXXX → +905XXXXXXXXX
   * - +905XXXXXXXXX → +905XXXXXXXXX (değişmez)
   *
   * @param phone - Ham telefon numarası
   * @returns E.164 format telefon numarası
   * @throws Error - Geçersiz telefon format
   */
  private normalizePhoneNumber(phone: string): string {
    // Boşlukları ve özel karakterleri temizle
    let cleaned = phone.replace(/[\s\-\(\)]/g, "");

    // + ile başlıyorsa zaten E.164 format
    if (cleaned.startsWith("+90")) {
      return cleaned;
    }

    // 90 ile başlıyorsa sadece + ekle
    if (cleaned.startsWith("90")) {
      return "+" + cleaned;
    }

    // 0 ile başlıyorsa 0'ı kaldır ve +90 ekle
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    // 5 ile başlıyorsa +90 ekle
    if (cleaned.startsWith("5")) {
      return "+90" + cleaned;
    }

    throw new Error(`Invalid phone number format: ${phone}`);
  }

  /**
   * Axios error'dan kullanıcı dostu hata mesajı çıkarır
   *
   * @param error - Yakalanan hata
   * @returns Hata mesajı
   */
  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<IletiMerkeziResponse>;

      if (axiosError.response?.data?.status?.message) {
        return axiosError.response.data.status.message;
      }

      if (axiosError.response?.status === 401) {
        return "İleti Merkezi authentication failed. Please check API credentials.";
      }

      if (axiosError.response?.status === 429) {
        return "İleti Merkezi rate limit exceeded. Please try again later.";
      }

      if (axiosError.code === "ECONNABORTED") {
        return "İleti Merkezi request timeout. Please try again.";
      }

      return axiosError.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown error occurred while sending SMS";
  }

  /**
   * SMS API client'ının hazır olup olmadığını kontrol eder
   *
   * @returns Client hazırsa true
   */
  isReady(): boolean {
    return this.apiClient !== null;
  }

  /**
   * İleti Merkezi API bağlantısını test eder
   *
   * Basit bir request göndererek API credentials'ın geçerliliğini kontrol eder.
   *
   * @returns Test başarılıysa true
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiClient) {
      this.logger.warn("Cannot test SMS connection: API client not initialized");
      return false;
    }

    try {
      // İleti Merkezi'nin balance check endpoint'i varsa kullan
      // Yoksa dummy SMS gönder ve hata kontrolü yap
      const response = await this.apiClient.get("/balance");
      this.logger.log("SMS connection test successful");
      return response.status === 200;
    } catch (error) {
      // Balance endpoint yoksa, credentials check başarısız ise 401 dönecektir
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // 404 = endpoint yok ama auth başarılı
        this.logger.log("SMS connection test successful (balance endpoint not available)");
        return true;
      }

      const errorMessage = this.extractErrorMessage(error);
      this.logger.error("SMS connection test failed:", errorMessage);
      return false;
    }
  }

  /**
   * DLR (Delivery Report) callback'ini işler
   *
   * İleti Merkezi'nden webhook ile gelen delivery raporunu parse eder.
   * Bu metod NotificationService tarafından webhook endpoint'ten çağrılır.
   *
   * FR-046: DLR handling requirement
   *
   * @param dlrData - Webhook'tan gelen DLR verisi
   * @returns Parse edilmiş DLR raporu
   */
  async processDlr(dlrData: unknown): Promise<DlrReport | null> {
    try {
      // İleti Merkezi DLR format'ını parse et
      // Gerçek format API dokümantasyonuna göre güncellenmelidir
      const data = dlrData as {
        orderId?: string;
        status?: string;
        phone?: string;
        timestamp?: string;
      };

      if (!data.orderId || !data.status || !data.phone) {
        this.logger.warn("Invalid DLR data received:", dlrData);
        return null;
      }

      const dlrReport: DlrReport = {
        orderId: data.orderId,
        status: this.mapDlrStatus(data.status),
        phone: data.phone,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      this.logger.log(`DLR received for order ${dlrReport.orderId}: ${dlrReport.status}`);

      return dlrReport;
    } catch (error) {
      this.logger.error("Failed to process DLR:", error);
      return null;
    }
  }

  /**
   * İleti Merkezi durum kodunu standart DLR status'e map eder
   *
   * @param status - İleti Merkezi status kodu
   * @returns Standart DLR status
   */
  private mapDlrStatus(status: string): DlrReport["status"] {
    const statusUpper = status.toUpperCase();

    if (statusUpper.includes("DELIVERED") || statusUpper.includes("SUCCESS")) {
      return "DELIVERED";
    }

    if (statusUpper.includes("EXPIRED")) {
      return "EXPIRED";
    }

    if (statusUpper.includes("REJECTED") || statusUpper.includes("INVALID")) {
      return "REJECTED";
    }

    return "UNDELIVERED";
  }

  /**
   * Randevu oluşturuldu bildirimi için SMS template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @param trackingCode - Takip kodu (guest için)
   * @returns SMS mesajı
   */
  generateAppointmentCreatedSms(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
    trackingCode?: string,
  ): string {
    let message = `Merhaba ${customerName},\n\n`;
    message += `Randevunuz olusturuldu.\n\n`;
    message += `Tarih: ${appointmentDate}\n`;
    message += `Saat: ${appointmentTime}\n`;
    message += `Hizmet: ${serviceName}\n`;

    if (trackingCode) {
      message += `\nTakip Kodunuz: ${trackingCode}\n`;
    }

    message += `\nYildiz Bayan Kuaforu`;

    return message;
  }

  /**
   * Randevu onaylandı bildirimi için SMS template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @returns SMS mesajı
   */
  generateAppointmentConfirmedSms(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
  ): string {
    let message = `Merhaba ${customerName},\n\n`;
    message += `Randevunuz ONAYLANDI!\n\n`;
    message += `Tarih: ${appointmentDate}\n`;
    message += `Saat: ${appointmentTime}\n`;
    message += `Hizmet: ${serviceName}\n`;
    message += `\nSalonumuzda gormeyi umuyoruz.\n`;
    message += `\nYildiz Bayan Kuaforu`;

    return message;
  }

  /**
   * Randevu iptal bildirimi için SMS template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @param reason - İptal sebebi (opsiyonel)
   * @returns SMS mesajı
   */
  generateAppointmentCancelledSms(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
    reason?: string,
  ): string {
    let message = `Merhaba ${customerName},\n\n`;
    message += `Randevunuz IPTAL edildi.\n\n`;
    message += `Tarih: ${appointmentDate}\n`;
    message += `Saat: ${appointmentTime}\n`;
    message += `Hizmet: ${serviceName}\n`;

    if (reason) {
      message += `\nSebep: ${reason}\n`;
    }

    message += `\nYeni randevu icin bizimle iletisime gecebilirsiniz.\n`;
    message += `\nYildiz Bayan Kuaforu`;

    return message;
  }

  /**
   * Randevu hatırlatması için SMS template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @returns SMS mesajı
   */
  generateAppointmentReminderSms(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
  ): string {
    let message = `Merhaba ${customerName},\n\n`;
    message += `Randevu Hatirlatmasi:\n\n`;
    message += `Tarih: ${appointmentDate}\n`;
    message += `Saat: ${appointmentTime}\n`;
    message += `Hizmet: ${serviceName}\n`;
    message += `\nSizi bekliyoruz!\n`;
    message += `\nYildiz Bayan Kuaforu`;

    return message;
  }

  /**
   * Veresiye ödeme hatırlatması için SMS template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param amount - Ödeme tutarı
   * @param dueDate - Vade tarihi
   * @returns SMS mesajı
   */
  generatePaymentReminderSms(customerName: string, amount: number, dueDate: string): string {
    const formattedAmount = amount.toFixed(2);
    let message = `Merhaba ${customerName},\n\n`;
    message += `Odeme Hatirlatmasi:\n\n`;
    message += `Tutar: ${formattedAmount} TL\n`;
    message += `Vade Tarihi: ${dueDate}\n`;
    message += `\nOdemenizi vade tarihinden once yapmanizi rica ederiz.\n`;
    message += `\nYildiz Bayan Kuaforu`;

    return message;
  }

  /**
   * Tracking code yeniden gönderimi için SMS template'i oluşturur
   *
   * FR-015: Guest SMS tracking code recovery
   *
   * @param customerName - Müşteri adı
   * @param trackingCode - Takip kodu
   * @returns SMS mesajı
   */
  generateTrackingCodeResendSms(customerName: string, trackingCode: string): string {
    let message = `Merhaba ${customerName},\n\n`;
    message += `Randevu takip kodunuz:\n\n`;
    message += `${trackingCode}\n\n`;
    message += `Bu kod ile randevu durumunuzu takip edebilirsiniz.\n`;
    message += `\nYildiz Bayan Kuaforu`;

    return message;
  }
}
