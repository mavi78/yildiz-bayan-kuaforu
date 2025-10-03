/**
 * Email Notification Channel
 *
 * Gmail SMTP üzerinden email gönderimi için notification channel implementasyonu.
 * Nodemailer kullanarak Gmail SMTP servisine bağlanır ve email gönderir.
 *
 * FR-043: Gmail SMTP konfigürasyonu
 * FR-044: Admin tarafından kanal seçimi
 * FR-046: Retry logic (3 deneme)
 *
 * @module services/notifications/channels
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { NotificationChannel } from "../../../domains/notifications/value-objects/channel.vo";
import { NotificationResult } from "../../../domains/notifications/entities/notification.entity";

/**
 * Email gönderim seçenekleri
 */
export interface EmailSendOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Email Channel Service
 *
 * Gmail SMTP üzerinden email gönderimi yapan servis.
 * Nodemailer transporter'ı kullanarak güvenli email gönderimi sağlar.
 */
@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: Transporter | null = null;
  private readonly gmailUser: string;
  private readonly gmailAppPassword: string;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.gmailUser = this.configService.get<string>("GMAIL_USER") || "";
    this.gmailAppPassword = this.configService.get<string>("GMAIL_APP_PASSWORD") || "";
    this.fromEmail = this.configService.get<string>("GMAIL_USER") || "noreply@yildizbayan.com";

    this.initializeTransporter();
  }

  /**
   * Nodemailer transporter'ını başlatır
   *
   * Gmail SMTP konfigürasyonu ile transporter oluşturur.
   * Environment değişkenleri eksikse transporter null kalır.
   */
  private initializeTransporter(): void {
    if (!this.gmailUser || !this.gmailAppPassword) {
      this.logger.warn(
        "Gmail credentials not configured. Email notifications will be disabled. " +
          "Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.",
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.gmailUser,
          pass: this.gmailAppPassword, // Gmail App Password (not regular password)
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
        },
      });

      this.logger.log("Gmail SMTP transporter initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Gmail SMTP transporter:", error);
      this.transporter = null;
    }
  }

  /**
   * Email gönderir
   *
   * @param options - Email gönderim seçenekleri
   * @returns NotificationResult - Gönderim sonucu
   */
  async send(options: EmailSendOptions): Promise<NotificationResult> {
    if (!this.transporter) {
      return {
        success: false,
        channel: NotificationChannel.EMAIL,
        error: "Email transporter not initialized. Please check Gmail credentials.",
      };
    }

    try {
      const mailOptions = {
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      this.logger.debug(`Sending email to ${options.to} with subject: ${options.subject}`);

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);

      return {
        success: true,
        channel: NotificationChannel.EMAIL,
        sentAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      this.logger.error(`Failed to send email to ${options.to}:`, errorMessage);

      return {
        success: false,
        channel: NotificationChannel.EMAIL,
        error: errorMessage,
      };
    }
  }

  /**
   * Email transporter'ının hazır olup olmadığını kontrol eder
   *
   * @returns Transporter hazırsa true
   */
  isReady(): boolean {
    return this.transporter !== null;
  }

  /**
   * Email transporter'ını test eder
   *
   * Gmail SMTP bağlantısını test eder ve sonucu döndürür.
   *
   * @returns Test başarılıysa true
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn("Cannot test email connection: transporter not initialized");
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log("Email connection test successful");
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Email connection test failed:", errorMessage);
      return false;
    }
  }

  /**
   * Randevu oluşturuldu bildirimi için email template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @param trackingCode - Takip kodu (guest için)
   * @returns HTML email içeriği
   */
  generateAppointmentCreatedEmail(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
    trackingCode?: string,
  ): { subject: string; html: string; text: string } {
    const subject = `Randevunuz Oluşturuldu - ${serviceName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Randevu Onayı</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .appointment-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .tracking-code { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .tracking-code strong { font-size: 18px; color: #1976d2; }
          .button { display: inline-block; background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yıldız Bayan Kuaförü</h1>
            <p>Randevu Onayı</p>
          </div>
          
          <div class="content">
            <h2>Merhaba ${customerName},</h2>
            <p>Randevunuz başarıyla oluşturuldu. Randevu detaylarınız aşağıdadır:</p>
            
            <div class="appointment-details">
              <h3>Randevu Detayları</h3>
              <p><strong>Tarih:</strong> ${appointmentDate}</p>
              <p><strong>Saat:</strong> ${appointmentTime}</p>
              <p><strong>Hizmet:</strong> ${serviceName}</p>
              <p><strong>Durum:</strong> Onay Bekliyor</p>
            </div>

            ${
              trackingCode
                ? `
              <div class="tracking-code">
                <p><strong>Takip Kodunuz:</strong></p>
                <strong>${trackingCode}</strong>
                <p>Bu kodu kullanarak randevu durumunuzu takip edebilirsiniz.</p>
              </div>
            `
                : ""
            }

            <p>Randevunuz onaylandıktan sonra size bilgi verilecektir.</p>
            
            <p>Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Yıldız Bayan Kuaförü</p>
            <p>Bu email otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Yıldız Bayan Kuaförü - Randevu Onayı
      
      Merhaba ${customerName},
      
      Randevunuz başarıyla oluşturuldu. Randevu detaylarınız:
      
      Tarih: ${appointmentDate}
      Saat: ${appointmentTime}
      Hizmet: ${serviceName}
      Durum: Onay Bekliyor
      
      ${trackingCode ? `Takip Kodunuz: ${trackingCode}` : ""}
      
      Randevunuz onaylandıktan sonra size bilgi verilecektir.
      
      Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
      
      Yıldız Bayan Kuaförü
    `;

    return { subject, html, text };
  }

  /**
   * Randevu onaylandı bildirimi için email template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @returns HTML email içeriği
   */
  generateAppointmentConfirmedEmail(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
  ): { subject: string; html: string; text: string } {
    const subject = `Randevunuz Onaylandı - ${serviceName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Randevu Onayı</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .appointment-details { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .success-message { color: #4caf50; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yıldız Bayan Kuaförü</h1>
            <p>Randevu Onayı</p>
          </div>
          
          <div class="content">
            <div class="success-message">✅ Randevunuz Onaylandı!</div>
            
            <h2>Merhaba ${customerName},</h2>
            <p>Randevunuz başarıyla onaylandı. Randevu detaylarınız aşağıdadır:</p>
            
            <div class="appointment-details">
              <h3>Randevu Detayları</h3>
              <p><strong>Tarih:</strong> ${appointmentDate}</p>
              <p><strong>Saat:</strong> ${appointmentTime}</p>
              <p><strong>Hizmet:</strong> ${serviceName}</p>
              <p><strong>Durum:</strong> Onaylandı</p>
            </div>

            <p>Randevu saatinde salonumuzda olmayı unutmayın.</p>
            <p>Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Yıldız Bayan Kuaförü</p>
            <p>Bu email otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Yıldız Bayan Kuaförü - Randevu Onayı
      
      ✅ Randevunuz Onaylandı!
      
      Merhaba ${customerName},
      
      Randevunuz başarıyla onaylandı. Randevu detaylarınız:
      
      Tarih: ${appointmentDate}
      Saat: ${appointmentTime}
      Hizmet: ${serviceName}
      Durum: Onaylandı
      
      Randevu saatinde salonumuzda olmayı unutmayın.
      
      Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
      
      Yıldız Bayan Kuaförü
    `;

    return { subject, html, text };
  }

  /**
   * Randevu iptal bildirimi için email template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param appointmentDate - Randevu tarihi
   * @param appointmentTime - Randevu saati
   * @param serviceName - Hizmet adı
   * @param reason - İptal sebebi
   * @returns HTML email içeriği
   */
  generateAppointmentCancelledEmail(
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
    reason?: string,
  ): { subject: string; html: string; text: string } {
    const subject = `Randevunuz İptal Edildi - ${serviceName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Randevu İptali</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .appointment-details { background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cancelled-message { color: #f44336; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yıldız Bayan Kuaförü</h1>
            <p>Randevu İptali</p>
          </div>
          
          <div class="content">
            <div class="cancelled-message">❌ Randevunuz İptal Edildi</div>
            
            <h2>Merhaba ${customerName},</h2>
            <p>Maalesef randevunuz iptal edilmiştir. Randevu detaylarınız aşağıdadır:</p>
            
            <div class="appointment-details">
              <h3>İptal Edilen Randevu</h3>
              <p><strong>Tarih:</strong> ${appointmentDate}</p>
              <p><strong>Saat:</strong> ${appointmentTime}</p>
              <p><strong>Hizmet:</strong> ${serviceName}</p>
              <p><strong>Durum:</strong> İptal Edildi</p>
              ${reason ? `<p><strong>Sebep:</strong> ${reason}</p>` : ""}
            </div>

            <p>Yeni randevu almak için bizimle iletişime geçebilirsiniz.</p>
            <p>Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Yıldız Bayan Kuaförü</p>
            <p>Bu email otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Yıldız Bayan Kuaförü - Randevu İptali
      
      ❌ Randevunuz İptal Edildi
      
      Merhaba ${customerName},
      
      Maalesef randevunuz iptal edilmiştir. Randevu detaylarınız:
      
      Tarih: ${appointmentDate}
      Saat: ${appointmentTime}
      Hizmet: ${serviceName}
      Durum: İptal Edildi
      ${reason ? `Sebep: ${reason}` : ""}
      
      Yeni randevu almak için bizimle iletişime geçebilirsiniz.
      
      Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
      
      Yıldız Bayan Kuaförü
    `;

    return { subject, html, text };
  }

  /**
   * Veresiye ödeme hatırlatması için email template'i oluşturur
   *
   * @param customerName - Müşteri adı
   * @param amount - Ödeme tutarı
   * @param dueDate - Vade tarihi
   * @param appointmentDate - Randevu tarihi
   * @param serviceName - Hizmet adı
   * @returns HTML email içeriği
   */
  generatePaymentReminderEmail(
    customerName: string,
    amount: number,
    dueDate: string,
    appointmentDate: string,
    serviceName: string,
  ): { subject: string; html: string; text: string } {
    const subject = `Ödeme Hatırlatması - ${amount} TL`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ödeme Hatırlatması</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .payment-details { background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #ff9800; text-align: center; margin: 20px 0; }
          .reminder-message { color: #ff9800; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yıldız Bayan Kuaförü</h1>
            <p>Ödeme Hatırlatması</p>
          </div>
          
          <div class="content">
            <div class="reminder-message">💰 Ödeme Hatırlatması</div>
            
            <h2>Merhaba ${customerName},</h2>
            <p>Veresiye ödemenizin vadesi yaklaşıyor. Ödeme detaylarınız aşağıdadır:</p>
            
            <div class="payment-details">
              <h3>Ödeme Detayları</h3>
              <div class="amount">${amount} TL</div>
              <p><strong>Vade Tarihi:</strong> ${dueDate}</p>
              <p><strong>Randevu Tarihi:</strong> ${appointmentDate}</p>
              <p><strong>Hizmet:</strong> ${serviceName}</p>
            </div>

            <p>Ödemenizi vade tarihinden önce yapmanızı rica ederiz.</p>
            <p>Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Yıldız Bayan Kuaförü</p>
            <p>Bu email otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Yıldız Bayan Kuaförü - Ödeme Hatırlatması
      
      💰 Ödeme Hatırlatması
      
      Merhaba ${customerName},
      
      Veresiye ödemenizin vadesi yaklaşıyor. Ödeme detaylarınız:
      
      Tutar: ${amount} TL
      Vade Tarihi: ${dueDate}
      Randevu Tarihi: ${appointmentDate}
      Hizmet: ${serviceName}
      
      Ödemenizi vade tarihinden önce yapmanızı rica ederiz.
      
      Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
      
      Yıldız Bayan Kuaförü
    `;

    return { subject, html, text };
  }
}
