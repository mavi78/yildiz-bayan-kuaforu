import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { AppointmentStatus, CreationMethod, Prisma } from "@prisma/client";
import { AppointmentService } from "@services/appointment.service";

export interface CreateRegisteredAppointmentInput {
  customerId: string;
  staffId: string;
  serviceId: string;
  date: string | Date;
  time: string;
  notes?: string;
}

export interface CreateRegisteredAppointmentResult {
  appointmentId: string;
}

/**
 * Kayıtlı müşteriler için çevrim içi randevu oluşturma usecase'i.
 *
 * Kayıtlı müşterinin seçtiği tarih/saat için çalışma saatlerini ve personel çakışmasını
 * kontrol eder, ardından PENDING durumunda randevu oluşturur.
 *
 * @class CreateRegisteredAppointmentUsecase
 */
@Injectable()
export class CreateRegisteredAppointmentUsecase {
  constructor(private readonly appointmentService: AppointmentService) {}

  /**
   * Kayıtlı müşteri randevusu oluşturur.
   *
   * @param payload - Randevu bilgileri
   * @returns Oluşturulan randevu kimliği
   *
   * @throws {BadRequestException} Geçersiz tarih/saat veya çalışma saati dışında işlem
   * @throws {ConflictException} Personelin ilgili saatte başka randevusu varsa
   */
  async execute(
    payload: CreateRegisteredAppointmentInput,
  ): Promise<CreateRegisteredAppointmentResult> {
    this.ensureTimeFormat(payload.time);
    const appointmentDate = this.normalizeDate(payload.date);

    await this.appointmentService.checkWorkingHours(appointmentDate, payload.time);

    const hasConflict = await this.appointmentService.checkConflict(
      payload.staffId,
      appointmentDate,
      payload.time,
    );

    if (hasConflict) {
      throw new ConflictException("Seçilen personelin bu tarih ve saatte başka bir randevusu var.");
    }

    const appointmentData: Prisma.AppointmentCreateInput = {
      date: appointmentDate,
      time: payload.time,
      status: AppointmentStatus.PENDING,
      creationMethod: CreationMethod.ONLINE_REGISTERED,
      customer: {
        connect: { id: payload.customerId },
      },
      staff: {
        connect: { id: payload.staffId },
      },
      service: {
        connect: { id: payload.serviceId },
      },
    };

    if (payload.notes) {
      appointmentData.notes = payload.notes;
    }

    const appointment = await this.appointmentService.create(appointmentData);

    return {
      appointmentId: appointment.id,
    };
  }

  /**
   * HH:mm formatındaki saat bilgisini doğrular.
   *
   * @param time - Saat değeri
   * @throws {BadRequestException} Format geçersizse
   */
  private ensureTimeFormat(time: string): void {
    const timePattern = /^(?:[01]\\d|2[0-3]):[0-5]\\d$/;
    if (!timePattern.test(time)) {
      throw new BadRequestException("Saat formatı HH:mm olmalıdır.");
    }
  }

  /**
   * Tarihi Date nesnesine dönüştürür ve gün başlangıcına normalize eder.
   *
   * @param value - String veya Date değer
   * @returns Normalize edilmiş Date nesnesi
   *
   * @throws {BadRequestException} Tarih parse edilemezse
   */
  private normalizeDate(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Geçersiz tarih değeri.");
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }
}
