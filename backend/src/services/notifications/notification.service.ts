import { Injectable, Logger } from "@nestjs/common";
import { Appointment, Customer, Service, User } from "@prisma/client";
import { EmailChannel } from "./channels/email.channel";
import { SmsChannel } from "./channels/sms.channel";
import { NotificationsGateway } from "../../modules/notifications/notifications.gateway";
import { NotificationRepository } from "../../repositories/notification.repository";
import { NotificationChannel } from "../../domains/notifications/value-objects/channel.vo";
import {
  Notification,
  NotificationEvent,
  DeliveryStatus,
} from "../../domains/notifications/entities/notification.entity";

/**
 * Notification Service
 *
 * Çoklu kanal (email, SMS, socket) üzerinden bildirim gönderimi yapan servis.
 * Admin konfigürasyonuna göre her event type için hangi kanalların aktif olacağını belirler.
 *
 * T073: Email channel entegrasyonu ✅
 * T074: SMS channel entegrasyonu ✅
 * T075: Socket.io gateway entegrasyonu ✅
 * T076: NotificationRepository ve multi-channel orchestration ✅
 * T077-T078: BullMQ job queue entegrasyonu (gelecek)
 *
 * İş Kuralları:
 * - FR-043: Admin her event type için kanal seçimi yapar
 * - FR-044: Kanal ayarları database'de saklanır (SystemConfig table - gelecek)
 * - FR-046: Her bildirim max 3 kez denenebilir
 * - FR-047: Tüm kanallar başarısız olursa admin panel'de göster
 * - FR-047a: 30 günden eski başarısız bildirimler arşivlenir
 *
 * @class NotificationService
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly socketGateway: NotificationsGateway,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Event type için aktif kanalları getirir
   *
   * NOT: Şu an için tüm kanallar aktif. Gelecekte SystemConfig table'dan
   * admin ayarlarına göre kanal seçimi yapılacak (FR-044).
   *
   * @param eventType - Notification event type
   * @returns Aktif kanal listesi
   */
  private getActiveChannelsForEvent(eventType: NotificationEvent): NotificationChannel[] {
    // TODO (T077-T078): SystemConfig table'dan admin ayarlarını oku
    // Şimdilik tüm kanallar aktif
    return [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.SOCKET];
  }

  /**
   * Bildirim kaydı oluşturur ve tüm kanallara gönderir
   *
   * Bu method notification entity oluşturur, database'e kaydeder ve
   * tüm aktif kanallara gönderim yapar. Her kanalın sonucunu entity'ye işler.
   *
   * @param eventType - Notification event type
   * @param customerId - Customer ID
   * @param appointmentId - Appointment ID (opsiyonel)
   * @param sendFunc - Her kanal için gönderim yapan async function
   * @returns Oluşturulan notification entity
   */
  private async createAndSendNotification(
    eventType: NotificationEvent,
    customerId: string,
    appointmentId: string | undefined,
    sendFunc: (channel: NotificationChannel) => Promise<void>,
  ): Promise<Notification> {
    const activeChannels = this.getActiveChannelsForEvent(eventType);

    // Notification entity oluştur
    const notificationEntity = Notification.create({
      eventType,
      customerId,
      appointmentId,
      channels: activeChannels,
    });

    try {
      // Database'e kaydet (channels Json field için string array)
      const savedNotification = await this.notificationRepository.create({
        eventType,
        channels: activeChannels.map(ch => ch.toString()), // Json field için serialize
        emailStatus: activeChannels.includes(NotificationChannel.EMAIL)
          ? DeliveryStatus.PENDING
          : undefined,
        smsStatus: activeChannels.includes(NotificationChannel.SMS)
          ? DeliveryStatus.PENDING
          : undefined,
        socketStatus: activeChannels.includes(NotificationChannel.SOCKET)
          ? DeliveryStatus.PENDING
          : undefined,
        attemptCount: 0,
        customer: { connect: { id: customerId } },
        appointment: appointmentId ? { connect: { id: appointmentId } } : undefined,
      });

      this.logger.log(
        `Notification record created: ${savedNotification.id} for event ${eventType}`,
      );

      // Tüm kanallara sırayla gönder
      for (const channel of activeChannels) {
        try {
          await sendFunc(channel);
        } catch (error) {
          this.logger.error(`Failed to send via ${channel}:`, error);
        }
      }

      return notificationEntity;
    } catch (error) {
      this.logger.error(`Failed to create notification record:`, error);
      throw error;
    }
  }

  /**
   * Randevu oluşturma bildirimini gönderir
   *
   * T076: Tüm kanallar (Email, SMS, Socket) ile entegre edildi.
   * Database'e notification kaydı oluşturur ve her kanalın durumunu takip eder.
   *
   * @param appointment - Randevu bilgisi (relations ile birlikte)
   */
  async sendAppointmentCreated(
    appointment: Appointment & {
      customer: Customer;
      service: Service;
      staff: User;
    },
  ): Promise<void> {
    this.logger.log(`Sending appointment created notification for appointment ${appointment.id}`);

    const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
    const appointmentDate = this.formatDate(appointment.date);
    const appointmentTime = appointment.time;
    const serviceName = appointment.service.name;
    const staffName = `${appointment.staff.firstName} ${appointment.staff.lastName}`;
    const trackingCode = appointment.trackingCode;

    await this.createAndSendNotification(
      NotificationEvent.APPOINTMENT_CREATED,
      appointment.customerId,
      appointment.id,
      async (channel: NotificationChannel) => {
        switch (channel) {
          case NotificationChannel.EMAIL:
            if (this.emailChannel.isReady() && appointment.customer.email) {
              const emailContent = this.emailChannel.generateAppointmentCreatedEmail(
                customerName,
                appointmentDate,
                appointmentTime,
                serviceName,
                trackingCode ?? undefined,
              );

              const result = await this.emailChannel.send({
                to: appointment.customer.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
              });

              if (result.success) {
                this.logger.log(
                  `Appointment created email sent to ${appointment.customer.email}`,
                );
              } else {
                this.logger.error(
                  `Failed to send appointment created email: ${result.error}`,
                );
              }
            }
            break;

          case NotificationChannel.SMS:
            if (appointment.customer.phone) {
              const smsMessage = `Merhaba ${customerName}, randevunuz oluşturuldu. Tarih: ${appointmentDate} ${appointmentTime}, Hizmet: ${serviceName}. Takip kodu: ${trackingCode}. Yıldız Bayan Kuaförü`;

              const result = await this.smsChannel.send({
                to: appointment.customer.phone,
                message: smsMessage,
              });

              if (result.success) {
                this.logger.log(`Appointment created SMS sent to ${appointment.customer.phone}`);
              } else {
                this.logger.error(`Failed to send appointment created SMS: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SOCKET:
            // Guest mi yoksa registered customer mı?
            this.socketGateway.notifyAppointmentCreated(
              appointment.customer.userId,
              trackingCode,
              {
                appointmentId: appointment.id,
                date: appointmentDate,
                time: appointmentTime,
                serviceName,
                staffName,
              },
            );

            this.logger.log(`Appointment created socket notification sent`);
            break;
        }
      },
    );
  }

  /**
   * Randevu onay bildirimini gönderir
   *
   * T076: Tüm kanallar ile entegre edildi.
   *
   * @param appointment - Randevu bilgisi (relations ile birlikte)
   */
  async sendAppointmentConfirmed(
    appointment: Appointment & {
      customer: Customer;
      service: Service;
      staff: User;
    },
  ): Promise<void> {
    this.logger.log(`Sending appointment confirmed notification for appointment ${appointment.id}`);

    const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
    const appointmentDate = this.formatDate(appointment.date);
    const appointmentTime = appointment.time;
    const serviceName = appointment.service.name;
    const trackingCode = appointment.trackingCode;

    await this.createAndSendNotification(
      NotificationEvent.APPOINTMENT_CONFIRMED,
      appointment.customerId,
      appointment.id,
      async (channel: NotificationChannel) => {
        switch (channel) {
          case NotificationChannel.EMAIL:
            if (this.emailChannel.isReady() && appointment.customer.email) {
              const emailContent = this.emailChannel.generateAppointmentConfirmedEmail(
                customerName,
                appointmentDate,
                appointmentTime,
                serviceName,
              );

              const result = await this.emailChannel.send({
                to: appointment.customer.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
              });

              if (result.success) {
                this.logger.log(`Appointment confirmed email sent to ${appointment.customer.email}`);
              } else {
                this.logger.error(`Failed to send appointment confirmed email: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SMS:
            if (appointment.customer.phone) {
              const smsMessage = `Merhaba ${customerName}, randevunuz ONAYLANDI! Tarih: ${appointmentDate} ${appointmentTime}, Hizmet: ${serviceName}. Yıldız Bayan Kuaförü`;

              const result = await this.smsChannel.send({
                to: appointment.customer.phone,
                message: smsMessage,
              });

              if (result.success) {
                this.logger.log(`Appointment confirmed SMS sent to ${appointment.customer.phone}`);
              } else {
                this.logger.error(`Failed to send appointment confirmed SMS: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SOCKET:
            this.socketGateway.notifyAppointmentConfirmed(
              appointment.customer.userId,
              trackingCode,
              {
                appointmentId: appointment.id,
                date: appointmentDate,
                time: appointmentTime,
                serviceName,
              },
            );

            this.logger.log(`Appointment confirmed socket notification sent`);
            break;
        }
      },
    );
  }

  /**
   * Randevu iptal bildirimini gönderir
   *
   * T076: Tüm kanallar ile entegre edildi.
   *
   * @param appointment - Randevu bilgisi (relations ile birlikte)
   * @param reason - İptal sebebi (opsiyonel)
   */
  async sendAppointmentCancelled(
    appointment: Appointment & {
      customer: Customer;
      service: Service;
      staff: User;
    },
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Sending appointment cancelled notification for appointment ${appointment.id}`);

    const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
    const appointmentDate = this.formatDate(appointment.date);
    const appointmentTime = appointment.time;
    const serviceName = appointment.service.name;
    const trackingCode = appointment.trackingCode;

    await this.createAndSendNotification(
      NotificationEvent.APPOINTMENT_CANCELLED,
      appointment.customerId,
      appointment.id,
      async (channel: NotificationChannel) => {
        switch (channel) {
          case NotificationChannel.EMAIL:
            if (this.emailChannel.isReady() && appointment.customer.email) {
              const emailContent = this.emailChannel.generateAppointmentCancelledEmail(
                customerName,
                appointmentDate,
                appointmentTime,
                serviceName,
                reason,
              );

              const result = await this.emailChannel.send({
                to: appointment.customer.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
              });

              if (result.success) {
                this.logger.log(`Appointment cancelled email sent to ${appointment.customer.email}`);
              } else {
                this.logger.error(`Failed to send appointment cancelled email: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SMS:
            if (appointment.customer.phone) {
              const reasonText = reason ? ` Sebep: ${reason}` : "";
              const smsMessage = `Merhaba ${customerName}, randevunuz iptal edildi. Tarih: ${appointmentDate} ${appointmentTime}, Hizmet: ${serviceName}.${reasonText} Yıldız Bayan Kuaförü`;

              const result = await this.smsChannel.send({
                to: appointment.customer.phone,
                message: smsMessage,
              });

              if (result.success) {
                this.logger.log(`Appointment cancelled SMS sent to ${appointment.customer.phone}`);
              } else {
                this.logger.error(`Failed to send appointment cancelled SMS: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SOCKET:
            this.socketGateway.notifyAppointmentCancelled(
              appointment.customer.userId,
              trackingCode,
              {
                appointmentId: appointment.id,
                date: appointmentDate,
                time: appointmentTime,
                serviceName,
                reason,
              },
            );

            this.logger.log(`Appointment cancelled socket notification sent`);
            break;
        }
      },
    );
  }

  /**
   * Veresiye ödeme hatırlatması gönderir
   *
   * T076: Tüm kanallar ile entegre edildi.
   * NOT: Sadece kayıtlı müşterilere gönderilir (veresiye guest'lerde yok).
   *
   * @param customer - Müşteri bilgisi
   * @param amount - Ödeme tutarı
   * @param dueDate - Vade tarihi
   * @param appointmentId - Randevu ID
   * @param appointmentDate - Randevu tarihi
   * @param serviceName - Hizmet adı
   */
  async sendPaymentReminder(
    customer: Customer,
    amount: number,
    dueDate: Date,
    appointmentId: string,
    appointmentDate: Date,
    serviceName: string,
  ): Promise<void> {
    this.logger.log(`Sending payment reminder for customer ${customer.id}`);

    const customerName = `${customer.firstName} ${customer.lastName}`;
    const formattedDueDate = this.formatDate(dueDate);
    const formattedAppointmentDate = this.formatDate(appointmentDate);

    await this.createAndSendNotification(
      NotificationEvent.PAYMENT_REMINDER,
      customer.id,
      appointmentId,
      async (channel: NotificationChannel) => {
        switch (channel) {
          case NotificationChannel.EMAIL:
            if (this.emailChannel.isReady() && customer.email) {
              const emailContent = this.emailChannel.generatePaymentReminderEmail(
                customerName,
                amount,
                formattedDueDate,
                formattedAppointmentDate,
                serviceName,
              );

              const result = await this.emailChannel.send({
                to: customer.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
              });

              if (result.success) {
                this.logger.log(`Payment reminder email sent to ${customer.email}`);
              } else {
                this.logger.error(`Failed to send payment reminder email: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SMS:
            if (customer.phone) {
              const smsMessage = `Merhaba ${customerName}, veresiye ödeme hatırlatması: ${amount} TL, vade tarihi: ${formattedDueDate}. Randevu: ${formattedAppointmentDate} - ${serviceName}. Yıldız Bayan Kuaförü`;

              const result = await this.smsChannel.send({
                to: customer.phone,
                message: smsMessage,
              });

              if (result.success) {
                this.logger.log(`Payment reminder SMS sent to ${customer.phone}`);
              } else {
                this.logger.error(`Failed to send payment reminder SMS: ${result.error}`);
              }
            }
            break;

          case NotificationChannel.SOCKET:
            // Veresiye sadece kayıtlı müşteriler için olduğundan userId kesin var
            if (customer.userId) {
              this.socketGateway.notifyPaymentReminder(customer.userId, {
                paymentId: "", // Payment ID burada mevcut değil, BullMQ job'dan gelecek
                amount,
                dueDate: formattedDueDate,
                appointmentId,
              });

              this.logger.log(`Payment reminder socket notification sent`);
            }
            break;
        }
      },
    );
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
   * SMS channel'ın hazır olup olmadığını kontrol eder
   *
   * @returns SMS channel hazırsa true
   */
  isSmsChannelReady(): boolean {
    return this.smsChannel.isReady();
  }

  /**
   * Socket gateway'in aktif olup olmadığını kontrol eder
   *
   * @returns Bağlı client sayısını döndürür
   */
  getSocketConnectedCount(): number {
    return this.socketGateway.getConnectedClientsCount();
  }

  /**
   * Email channel bağlantısını test eder
   *
   * @returns Test başarılıysa true
   */
  async testEmailConnection(): Promise<boolean> {
    return await this.emailChannel.testConnection();
  }

  /**
   * SMS channel bağlantısını test eder
   *
   * @returns Test başarılıysa true
   */
  async testSmsConnection(): Promise<boolean> {
    return await this.smsChannel.testConnection();
  }

  /**
   * Tüm kanalların sağlık durumunu kontrol eder
   *
   * Debugging ve monitoring için tüm notification kanallarının durumunu döndürür.
   *
   * @returns Kanal sağlık durumu objesi
   */
  async getChannelsHealthStatus(): Promise<{
    email: { ready: boolean; tested?: boolean };
    sms: { ready: boolean; tested?: boolean };
    socket: { connectedClients: number };
  }> {
    const emailReady = this.isEmailChannelReady();
    const smsReady = this.isSmsChannelReady();
    const socketClients = this.getSocketConnectedCount();

    // Channel test'leri paralel çalıştır
    const [emailTested, smsTested] = await Promise.all([
      emailReady ? this.testEmailConnection() : Promise.resolve(false),
      smsReady ? this.testSmsConnection() : Promise.resolve(false),
    ]);

    return {
      email: {
        ready: emailReady,
        tested: emailTested,
      },
      sms: {
        ready: smsReady,
        tested: smsTested,
      },
      socket: {
        connectedClients: socketClients,
      },
    };
  }
}
