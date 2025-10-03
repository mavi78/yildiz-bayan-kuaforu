import { Injectable, Logger } from "@nestjs/common";
import { Appointment } from "@prisma/client";

/**
 * NotificationService placeholder'ı.
 *
 * T072-T076 sırasında gerçek kanallar ve BullMQ entegrasyonu ile genişletilecektir.
 * Şimdilik usecase'lerin bağımlılıkları için no-op metotlar sağlar.
 *
 * @class NotificationService
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * Randevu oluşturma bildirimini kuyruğa ekler (placeholder).
   */
  async sendAppointmentCreated(_appointment: Appointment): Promise<void> {
    this.logger.debug("sendAppointmentCreated placeholder çağrıldı.");
  }

  /**
   * Randevu onay bildirimini kuyruğa ekler (placeholder).
   */
  async sendAppointmentConfirmed(_appointment: Appointment): Promise<void> {
    this.logger.debug("sendAppointmentConfirmed placeholder çağrıldı.");
  }

  /**
   * Randevu iptal bildirimini kuyruğa ekler (placeholder).
   */
  async sendAppointmentCancelled(_appointment: Appointment): Promise<void> {
    this.logger.debug("sendAppointmentCancelled placeholder çağrıldı.");
  }
}
