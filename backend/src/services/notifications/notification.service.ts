import { Injectable, Logger } from "@nestjs/common";
import { Appointment, Customer, Service, User } from "@prisma/client";
import { EmailChannel } from "./channels/email.channel";
import { NotificationChannel } from "../../domains/notifications/value-objects/channel.vo";

/**
 * Notification Service
 *
 * Çoklu kanal (email, SMS, socket) üzerinden bildirim gönderimi yapan servis.
 * T073: Email channel entegrasyonu tamamlandı.
 * T074-T075: SMS ve Socket channel'ları gelecek.
 * T076: BullMQ job queue entegrasyonu gelecek.
 *
 * @class NotificationService
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly emailChannel: EmailChannel) {}

  /**
   * Randevu oluşturma bildirimini gönderir
   *
   * T073: Email channel ile entegre edildi.
   * Gelecekte SMS ve Socket channel'ları da eklenecek.
   *
   * @param appointment - Randevu bilgisi (relations ile birlikte)
   */
  async sendAppointmentCreated(appointment: Appointment & {
    customer: Customer;
    service: Service;
    staff: User;
  }): Promise<void> {
    this.logger.log(`Sending appointment created notification for appointment ${appointment.id}`);

    try {
      // Email bildirimi gönder
      if (this.emailChannel.isReady()) {
        const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
        const appointmentDate = this.formatDate(appointment.date);
        const appointmentTime = appointment.time;
        const serviceName = appointment.service.name;
        const trackingCode = appointment.trackingCode;

        const emailContent = this.emailChannel.generateAppointmentCreatedEmail(
          customerName,
          appointmentDate,
          appointmentTime,
          serviceName,
          trackingCode
        );

        const result = await this.emailChannel.send({
          to: appointment.customer.email || `${appointment.customer.phone}@yildizbayan.com`,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (result.success) {
          this.logger.log(`Appointment created email sent successfully to ${appointment.customer.email}`);
        } else {
          this.logger.error(`Failed to send appointment created email: ${result.error}`);
        }
      } else {
        this.logger.warn("Email channel not ready, skipping email notification");
      }

      // TODO: T074 - SMS channel entegrasyonu
      // TODO: T075 - Socket channel entegrasyonu
      // TODO: T076 - BullMQ job queue entegrasyonu

    } catch (error) {
      this.logger.error(`Error sending appointment created notification:`, error);
    }
  }

  /**
   * Randevu onay bildirimini gönderir
   *
   * @param appointment - Randevu bilgisi (relations ile birlikte)
   */
  async sendAppointmentConfirmed(appointment: Appointment & {
    customer: Customer;
    service: Service;
    staff: User;
  }): Promise<void> {
    this.logger.log(`Sending appointment confirmed notification for appointment ${appointment.id}`);

    try {
      // Email bildirimi gönder
      if (this.emailChannel.isReady()) {
        const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
        const appointmentDate = this.formatDate(appointment.date);
        const appointmentTime = appointment.time;
        const serviceName = appointment.service.name;

        const emailContent = this.emailChannel.generateAppointmentConfirmedEmail(
          customerName,
          appointmentDate,
          appointmentTime,
          serviceName
        );

        const result = await this.emailChannel.send({
          to: appointment.customer.email || `${appointment.customer.phone}@yildizbayan.com`,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (result.success) {
          this.logger.log(`Appointment confirmed email sent successfully to ${appointment.customer.email}`);
        } else {
          this.logger.error(`Failed to send appointment confirmed email: ${result.error}`);
        }
      } else {
        this.logger.warn("Email channel not ready, skipping email notification");
      }

      // TODO: T074 - SMS channel entegrasyonu
      // TODO: T075 - Socket channel entegrasyonu

    } catch (error) {
      this.logger.error(`Error sending appointment confirmed notification:`, error);
    }
  }

  /**
   * Randevu iptal bildirimini gönderir
   *
   * @param appointment - Randevu bilgisi (relations ile birlikte)
   * @param reason - İptal sebebi (opsiyonel)
   */
  async sendAppointmentCancelled(appointment: Appointment & {
    customer: Customer;
    service: Service;
    staff: User;
  }, reason?: string): Promise<void> {
    this.logger.log(`Sending appointment cancelled notification for appointment ${appointment.id}`);

    try {
      // Email bildirimi gönder
      if (this.emailChannel.isReady()) {
        const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
        const appointmentDate = this.formatDate(appointment.date);
        const appointmentTime = appointment.time;
        const serviceName = appointment.service.name;

        const emailContent = this.emailChannel.generateAppointmentCancelledEmail(
          customerName,
          appointmentDate,
          appointmentTime,
          serviceName,
          reason
        );

        const result = await this.emailChannel.send({
          to: appointment.customer.email || `${appointment.customer.phone}@yildizbayan.com`,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (result.success) {
          this.logger.log(`Appointment cancelled email sent successfully to ${appointment.customer.email}`);
        } else {
          this.logger.error(`Failed to send appointment cancelled email: ${result.error}`);
        }
      } else {
        this.logger.warn("Email channel not ready, skipping email notification");
      }

      // TODO: T074 - SMS channel entegrasyonu
      // TODO: T075 - Socket channel entegrasyonu

    } catch (error) {
      this.logger.error(`Error sending appointment cancelled notification:`, error);
    }
  }

  /**
   * Veresiye ödeme hatırlatması gönderir
   *
   * @param customer - Müşteri bilgisi
   * @param amount - Ödeme tutarı
   * @param dueDate - Vade tarihi
   * @param appointmentDate - Randevu tarihi
   * @param serviceName - Hizmet adı
   */
  async sendPaymentReminder(
    customer: Customer,
    amount: number,
    dueDate: Date,
    appointmentDate: Date,
    serviceName: string
  ): Promise<void> {
    this.logger.log(`Sending payment reminder for customer ${customer.id}`);

    try {
      // Email bildirimi gönder
      if (this.emailChannel.isReady()) {
        const customerName = `${customer.firstName} ${customer.lastName}`;
        const formattedDueDate = this.formatDate(dueDate);
        const formattedAppointmentDate = this.formatDate(appointmentDate);

        const emailContent = this.emailChannel.generatePaymentReminderEmail(
          customerName,
          amount.toString(),
          formattedDueDate,
          formattedAppointmentDate,
          serviceName
        );

        const result = await this.emailChannel.send({
          to: customer.email || `${customer.phone}@yildizbayan.com`,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (result.success) {
          this.logger.log(`Payment reminder email sent successfully to ${customer.email}`);
        } else {
          this.logger.error(`Failed to send payment reminder email: ${result.error}`);
        }
      } else {
        this.logger.warn("Email channel not ready, skipping payment reminder email");
      }

      // TODO: T074 - SMS channel entegrasyonu
      // TODO: T075 - Socket channel entegrasyonu

    } catch (error) {
      this.logger.error(`Error sending payment reminder notification:`, error);
    }
  }

  /**
   * Tarihi Türkçe format'ta döndürür
   *
   * @param date - Formatlanacak tarih
   * @returns DD.MM.YYYY formatında tarih
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Email channel'ın hazır olup olmadığını kontrol eder
   *
   * @returns Email channel hazırsa true
   */
  isEmailChannelReady(): boolean {
    return this.emailChannel.isReady();
  }

  /**
   * Email channel bağlantısını test eder
   *
   * @returns Test başarılıysa true
   */
  async testEmailConnection(): Promise<boolean> {
    return await this.emailChannel.testConnection();
  }
}
