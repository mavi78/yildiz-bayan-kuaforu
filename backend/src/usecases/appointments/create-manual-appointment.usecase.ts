import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { AppointmentStatus, CreationMethod, Prisma } from "@prisma/client";
import { CustomerService } from "@services/customer.service";
import { AppointmentService } from "@services/appointment.service";
import { NotificationService } from "@services/notifications/notification.service";

export interface CreateManualAppointmentInput {
  staffId: string;
  serviceId: string;
  firstName: string;
  lastName: string;
  phone: string;
  date: string | Date;
  time: string;
  email?: string;
  notes?: string;
}

export interface CreateManualAppointmentResult {
  appointmentId: string;
  customerId: string;
  status: AppointmentStatus;
}

/**
 * Salon personeli tarafından manuel olarak oluşturulan randevu usecase'i.
 *
 * Var olan müşteriyi telefonla bulur ya da yeni misafir oluşturur, çalışma saati
 * ve personel çakışması kontrolü yapar ve randevuyu CONFIRMED durumunda kaydeder.
 *
 * @class CreateManualAppointmentUsecase
 */
@Injectable()
export class CreateManualAppointmentUsecase {
  constructor(
    private readonly customerService: CustomerService,
    private readonly appointmentService: AppointmentService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Manuel randevu oluşturur.
   *
   * @param payload - Randevu bilgileri
   * @returns Oluşturulan randevu kimliği ve durumu
   *
   * @throws {BadRequestException} Geçersiz tarih/saat
   * @throws {ConflictException} Personelin aynı saatte başka randevusu varsa
   */
  async execute(payload: CreateManualAppointmentInput): Promise<CreateManualAppointmentResult> {
    this.ensureTimeFormat(payload.time);
    const appointmentDate = this.normalizeDate(payload.date);

    let customer = await this.customerService.findByPhone(payload.phone);

    if (!customer) {
      customer = await this.customerService.createGuest({
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
      });
    }

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
      status: AppointmentStatus.CONFIRMED,
      creationMethod: CreationMethod.MANUAL,
      notes: payload.notes,
      customer: {
        connect: { id: customer.id },
      },
      staff: {
        connect: { id: payload.staffId },
      },
      service: {
        connect: { id: payload.serviceId },
      },
    };

    const appointment = await this.appointmentService.create(appointmentData);

    await this.notificationService.sendAppointmentConfirmed(appointment);

    return {
      appointmentId: appointment.id,
      customerId: customer.id,
      status: appointment.status,
    };
  }

  /**
   * HH:mm saat formatını doğrular.
   */
  private ensureTimeFormat(time: string): void {
    const timePattern = /^(?:[01]\\d|2[0-3]):[0-5]\\d$/;
    if (!timePattern.test(time)) {
      throw new BadRequestException("Saat formatı HH:mm olmalıdır.");
    }
  }

  /**
   * Tarihi Date nesnesine dönüştürür ve gün başlangıcına normalize eder.
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
