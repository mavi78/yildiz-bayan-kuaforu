import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Appointment, AppointmentStatus } from "@prisma/client";
import { AppointmentService } from "@services/appointment.service";
import { NotificationService } from "@services/notifications/notification.service";

export interface ApproveAppointmentInput {
  appointmentId: string;
  override?: boolean;
  justification?: string;
}

export interface ApproveAppointmentResult {
  appointmentId: string;
  status: AppointmentStatus;
  appointment: Appointment;
}

/**
 * Personel randevu onayı usecase'i.
 *
 * Çakışma kontrolü yapar, gerekirse override gerekçesi ister ve randevuyu CONFIRMED
 * durumuna günceller. Başarılı onay sonrası bildirim sürecini tetikler.
 *
 * @class ApproveAppointmentUsecase
 */
@Injectable()
export class ApproveAppointmentUsecase {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Randevuyu onaylar ve gerekli bildirimleri tetikler.
   *
   * @param payload - Onay verileri
   * @returns Güncellenmiş randevu bilgisi
   *
   * @throws {BadRequestException} Randevu PENDING değilse veya override gerekçesi eksikse
   * @throws {ConflictException} Çakışma mevcut ve override talep edilmemişse
   */
  async execute(payload: ApproveAppointmentInput): Promise<ApproveAppointmentResult> {
    const appointment = await this.appointmentService.findById(payload.appointmentId);

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException("Sadece bekleyen (PENDING) randevular onaylanabilir.");
    }

    const hasConflict = await this.appointmentService.checkConflict(
      appointment.staffId,
      appointment.date,
      appointment.time,
      appointment.id,
    );

    if (hasConflict) {
      if (!payload.override) {
        throw new ConflictException(
          "Bu zaman diliminde başka bir randevu mevcut. Override gerekli.",
        );
      }

      if (!payload.justification || payload.justification.trim().length === 0) {
        throw new BadRequestException("Override işlemleri için gerekçe belirtilmelidir.");
      }
    }

    const updated = await this.appointmentService.updateStatus(
      appointment.id,
      AppointmentStatus.CONFIRMED,
    );

    await this.notificationService.sendAppointmentConfirmed(updated);

    return {
      appointmentId: updated.id,
      status: updated.status,
      appointment: updated,
    };
  }
}
