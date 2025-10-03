import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { AppointmentStatus, CreationMethod, Prisma } from "@prisma/client";
import { CustomerService } from "@services/customer.service";
import { AppointmentService } from "@services/appointment.service";

export interface CreateGuestAppointmentInput {
  firstName: string;
  lastName: string;
  phone: string;
  serviceId: string;
  staffId: string;
  date: string | Date;
  time: string;
  email?: string;
  birthDate?: string | Date;
  notes?: string;
}

export interface CreateGuestAppointmentResult {
  appointmentId: string;
  customerId: string;
  trackingCode: string;
}

/**
 * Misafir müşteriler için çevrim içi randevu oluşturma usecase'i.
 *
 * Kullanıcı telefon numarasına göre mevcut misafir müşteriyi bulur veya yeni kayıt açar,
 * çalışma saati ve personel çakışması kontrollerini gerçekleştirir ve PENDING durumunda
 * yeni bir randevu oluşturur.
 *
 * @class CreateGuestAppointmentUsecase
 */
@Injectable()
export class CreateGuestAppointmentUsecase {
  constructor(
    private readonly customerService: CustomerService,
    private readonly appointmentService: AppointmentService,
  ) {}

  /**
   * Misafir randevusu oluşturur ve takip kodunu döndürür.
   *
   * Akış:
   * 1. Telefon numarasına göre misafir müşteriyi bulur/oluşturur
   * 2. Çalışma saati ve personel çakışması kontrolü yapar
   * 3. Tracking code üretir
   * 4. PENDING durumunda randevu oluşturur ve takip kodunu döndürür
   *
   * @param payload - Randevu oluşturma verileri
   * @returns Randevu kimliği, müşteri kimliği ve takip kodu
   *
   * @throws {BadRequestException} Geçersiz tarih/saat veya çalışma saati dışında işlem
   * @throws {ConflictException} Seçilen personelin ilgili saatte randevusu varsa
   */
  async execute(payload: CreateGuestAppointmentInput): Promise<CreateGuestAppointmentResult> {
    this.ensureTimeFormat(payload.time);
    const appointmentDate = this.normalizeDate(payload.date);

    const customer = await this.customerService.createGuest({
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      email: payload.email,
      birthDate: payload.birthDate ? this.normalizeDate(payload.birthDate) : undefined,
      notes: payload.notes,
    });

    await this.appointmentService.checkWorkingHours(appointmentDate, payload.time);

    const hasConflict = await this.appointmentService.checkConflict(
      payload.staffId,
      appointmentDate,
      payload.time,
    );

    if (hasConflict) {
      throw new ConflictException("Seçilen personelin bu tarih ve saatte başka bir randevusu var.");
    }

    const trackingCode = await this.appointmentService.generateTrackingCode();

    const appointmentData: Prisma.AppointmentCreateInput = {
      date: appointmentDate,
      time: payload.time,
      status: AppointmentStatus.PENDING,
      creationMethod: CreationMethod.ONLINE_GUEST,
      trackingCode,
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

    if (payload.notes) {
      appointmentData.notes = payload.notes;
    }

    const appointment = await this.appointmentService.create(appointmentData);

    return {
      appointmentId: appointment.id,
      customerId: customer.id,
      trackingCode,
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
   * Tarih girişini Date nesnesine dönüştürür ve gün başlangıcına normalize eder.
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
