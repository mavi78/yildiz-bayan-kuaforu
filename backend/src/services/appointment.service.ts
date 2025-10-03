import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Appointment, AppointmentStatus } from "@prisma/client";
import { AppointmentRepository } from "../repositories/appointment.repository";
import { WorkingHoursRepository } from "../repositories/working-hours.repository";
import { SpecialWorkingDayRepository } from "../repositories/special-working-day.repository";
import { ServiceRepository } from "../repositories/service.repository";

/**
 * Appointment Service (İş Mantığı Katmanı)
 *
 * Randevu yönetimi iş kurallarını uygular.
 * Çakışma kontrolü, çalışma saati kontrolü, tracking code üretimi gibi
 * kritik iş mantığını içerir.
 *
 * İş Kuralları:
 * - Çakışma kontrolü: (staffId, date, time) + status ∈ {PENDING, CONFIRMED}
 * - Çalışma saati önceliği: SpecialWorkingDay > WorkingHours (FR-057)
 * - Tracking code: 8 haneli alphanumeric (misafir randevuları için)
 * - Slot hesaplama: (closeTime - openTime) / serviceDuration
 *
 * @class AppointmentService
 */
@Injectable()
export class AppointmentService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly workingHoursRepository: WorkingHoursRepository,
    private readonly specialWorkingDayRepository: SpecialWorkingDayRepository,
    private readonly serviceRepository: ServiceRepository,
  ) {}

  /**
   * Randevu çakışması kontrolü yapar
   *
   * İş Kuralı: (staffId, date, time) kombinasyonu ile
   * status ∈ {PENDING, CONFIRMED} olan randevu varsa çakışma var demektir.
   *
   * @param staffId - Personel ID
   * @param date - Randevu tarihi
   * @param time - Randevu saati (HH:mm)
   * @param excludeId - Hariç tutulacak randevu ID (güncelleme için)
   * @returns Çakışma var mı (true/false)
   *
   * @example
   * ```typescript
   * const hasConflict = await service.checkConflict(
   *   'staff-id',
   *   new Date('2025-01-15'),
   *   '10:00'
   * );
   * ```
   */
  async checkConflict(
    staffId: string,
    date: Date,
    time: string,
    excludeId?: string,
  ): Promise<boolean> {
    const conflictCount = await this.appointmentRepository.findConflicts(
      staffId,
      date,
      time,
      excludeId,
    );
    return conflictCount > 0;
  }

  /**
   * Çalışma saati kontrolü yapar
   *
   * İş Kuralı (FR-057, FR-059a):
   * 1. Önce SpecialWorkingDay kontrol edilir
   * 2. Yoksa WorkingHours kullanılır
   * 3. Gün kapalıysa veya saat dışındaysa hata fırlatır
   *
   * @param date - Randevu tarihi
   * @param time - Randevu saati (HH:mm)
   * @returns Geçerli mi (true/false)
   *
   * @throws {BadRequestException} Salon kapalı veya saat dışı
   *
   * @example
   * ```typescript
   * const isValid = await service.checkWorkingHours(
   *   new Date('2025-01-15'),
   *   '10:00'
   * );
   * ```
   */
  async checkWorkingHours(date: Date, time: string): Promise<boolean> {
    // Saat formatını doğrula
    this.validateTimeFormat(time);

    // Tarihi normalize et (saat bilgisini sıfırla)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // 1. Önce SpecialWorkingDay kontrol et (FR-057)
    const specialDay = await this.specialWorkingDayRepository.findByDate(normalizedDate);

    if (specialDay) {
      // Özel gün varsa, onun kurallarını kullan
      if (specialDay.isClosed) {
        throw new BadRequestException(
          `Salon ${normalizedDate.toLocaleDateString("tr-TR")} tarihinde kapalıdır. Sebep: ${specialDay.description || "Özel gün"}`,
        );
      }

      // Özel gün açıksa, saat kontrolü yap
      return this.isTimeInRange(time, specialDay.openTime!, specialDay.closeTime!);
    }

    // 2. SpecialWorkingDay yoksa WorkingHours kullan
    const dayOfWeek = normalizedDate.getDay(); // 0=Pazar, 6=Cumartesi
    const workingHours = await this.workingHoursRepository.findByDayOfWeek(dayOfWeek);

    if (!workingHours) {
      throw new BadRequestException("Bu gün için çalışma saati tanımlanmamış.");
    }

    if (workingHours.isClosed) {
      throw new BadRequestException(`Salon ${this.getDayName(dayOfWeek)} günü kapalıdır.`);
    }

    // Saat kontrolü yap
    const isValid = this.isTimeInRange(time, workingHours.openTime!, workingHours.closeTime!);

    if (!isValid) {
      throw new BadRequestException(
        `Randevu saati çalışma saatleri dışında. Çalışma saatleri: ${workingHours.openTime} - ${workingHours.closeTime}`,
      );
    }

    return true;
  }

  /**
   * 8 haneli alphanumeric tracking code üretir (misafir randevuları için)
   *
   * Format: [A-Z0-9]{8} (örn: "AB12CD34")
   * Benzersizlik kontrolü yapar.
   *
   * @returns Unique tracking code
   *
   * @example
   * ```typescript
   * const code = await service.generateTrackingCode();
   * // Örnek: "XY45ZT89"
   * ```
   */
  async generateTrackingCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Karışıklık önlemek için I,O,0,1 hariç
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;

      // Benzersizlik kontrolü
      const exists = await this.appointmentRepository.isTrackingCodeTaken(code);
      if (!exists) {
        return code;
      }
    } while (attempts < maxAttempts);

    throw new Error("Tracking code üretilemedi. Lütfen tekrar deneyin.");
  }

  /**
   * Belirli bir tarih için müsait slot listesi döndürür
   *
   * İş Kuralı (FR-056):
   * - Slot sayısı = (closeTime - openTime) / serviceDuration
   * - Çakışan slotlar hariç tutulur
   * - Sadece gelecek saatler döndürülür
   *
   * @param date - Randevu tarihi
   * @param staffId - Personel ID
   * @param serviceId - Hizmet ID (süre için gerekli)
   * @returns Müsait slot listesi ["09:00", "10:00", ...]
   *
   * @throws {NotFoundException} Hizmet bulunamadı
   * @throws {BadRequestException} Salon kapalı veya çalışma saati yok
   *
   * @example
   * ```typescript
   * const slots = await service.findAvailableSlots(
   *   new Date('2025-01-15'),
   *   'staff-id',
   *   'service-id'
   * );
   * // Örnek: ["09:00", "10:00", "11:00", "14:00"]
   * ```
   */
  async findAvailableSlots(date: Date, staffId: string, serviceId: string): Promise<string[]> {
    // Hizmet bilgisini al (süre için)
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException("Hizmet bulunamadı.");
    }

    // Tarihi normalize et
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Çalışma saatlerini al (SpecialWorkingDay > WorkingHours)
    const specialDay = await this.specialWorkingDayRepository.findByDate(normalizedDate);
    let openTime: string;
    let closeTime: string;

    if (specialDay) {
      if (specialDay.isClosed) {
        throw new BadRequestException("Salon bu tarihte kapalıdır.");
      }
      openTime = specialDay.openTime!;
      closeTime = specialDay.closeTime!;
    } else {
      const dayOfWeek = normalizedDate.getDay();
      const workingHours = await this.workingHoursRepository.findByDayOfWeek(dayOfWeek);

      if (!workingHours || workingHours.isClosed) {
        throw new BadRequestException("Salon bu günde kapalıdır.");
      }

      openTime = workingHours.openTime!;
      closeTime = workingHours.closeTime!;
    }

    // Slot listesi oluştur
    const slots = this.generateTimeSlots(openTime, closeTime, service.durationMinutes);

    // Bugünse, geçmiş saatleri filtrele
    const now = new Date();
    const isToday = normalizedDate.getTime() === new Date(now.setHours(0, 0, 0, 0)).getTime();

    const futureSlots = isToday
      ? slots.filter(slot => {
          const [hour, minute] = slot.split(":").map(Number);
          const slotTime = new Date();
          slotTime.setHours(hour, minute, 0, 0);
          return slotTime > new Date();
        })
      : slots;

    // Çakışan slotları filtrele
    const availableSlots: string[] = [];
    for (const slot of futureSlots) {
      const hasConflict = await this.checkConflict(staffId, normalizedDate, slot);
      if (!hasConflict) {
        availableSlots.push(slot);
      }
    }

    return availableSlots;
  }

  /**
   * Randevu oluşturur (service katmanı seviyesinde)
   *
   * Bu method doğrudan repository'e delege eder.
   * İş kuralları (conflict, working hours) usecase katmanında kontrol edilir.
   *
   * @param data - Randevu verisi
   * @returns Oluşturulan randevu
   */
  async create(data: any): Promise<Appointment> {
    return this.appointmentRepository.create(data);
  }

  /**
   * ID'ye göre randevu bulur
   *
   * @param id - Randevu ID
   * @param includeRelations - İlişkileri dahil et
   * @returns Randevu
   *
   * @throws {NotFoundException} Randevu bulunamadı
   */
  async findById(id: string, includeRelations = false): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id, includeRelations);

    if (!appointment) {
      throw new NotFoundException(`Randevu bulunamadı: ${id}`);
    }

    return appointment;
  }

  /**
   * Tracking code'a göre randevu bulur
   *
   * @param trackingCode - 8 haneli tracking code
   * @returns Randevu veya null
   */
  async findByTrackingCode(trackingCode: string): Promise<Appointment | null> {
    return this.appointmentRepository.findByTrackingCode(trackingCode);
  }

  /**
   * Randevu durumunu günceller
   *
   * @param id - Randevu ID
   * @param status - Yeni durum
   * @param cancellationReason - İptal nedeni (opsiyonel)
   * @returns Güncellenmiş randevu
   */
  async updateStatus(
    id: string,
    status: AppointmentStatus,
    cancellationReason?: string,
  ): Promise<Appointment> {
    await this.findById(id); // Var mı kontrol
    return this.appointmentRepository.updateStatus(id, status, cancellationReason);
  }

  /**
   * Bekleyen randevuları getirir
   *
   * @param limit - Limit (varsayılan: 50)
   * @returns Randevu listesi
   */
  async findPending(limit = 50): Promise<Appointment[]> {
    return this.appointmentRepository.findPending(limit);
  }

  /**
   * Müşteriye ait randevuları getirir
   *
   * @param customerId - Müşteri ID
   * @param includeAll - Tüm durumları dahil et
   * @returns Randevu listesi
   */
  async findByCustomer(customerId: string, includeAll = false): Promise<Appointment[]> {
    return this.appointmentRepository.findByCustomer(customerId, includeAll);
  }

  /**
   * Personele ait randevuları getirir
   *
   * @param staffId - Personel ID
   * @param startDate - Başlangıç tarihi (opsiyonel)
   * @param endDate - Bitiş tarihi (opsiyonel)
   * @returns Randevu listesi
   */
  async findByStaff(staffId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]> {
    return this.appointmentRepository.findByStaff(staffId, startDate, endDate);
  }

  // ============================================================================
  // Yardımcı Methodlar (Private)
  // ============================================================================

  /**
   * Saat formatını doğrular (HH:mm)
   *
   * @param time - Saat (örn: "09:00")
   * @throws {BadRequestException} Geçersiz format
   */
  private validateTimeFormat(time: string): void {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new BadRequestException("Geçersiz saat formatı. Format: HH:mm (örn: 09:00)");
    }
  }

  /**
   * Saatin belirli aralıkta olup olmadığını kontrol eder
   *
   * @param time - Kontrol edilecek saat
   * @param openTime - Açılış saati
   * @param closeTime - Kapanış saati
   * @returns Aralıkta mı (true/false)
   */
  private isTimeInRange(time: string, openTime: string, closeTime: string): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const openMinutes = this.timeToMinutes(openTime);
    const closeMinutes = this.timeToMinutes(closeTime);

    return timeMinutes >= openMinutes && timeMinutes < closeMinutes;
  }

  /**
   * Saat string'ini dakikaya çevirir (karşılaştırma için)
   *
   * @param time - Saat (HH:mm)
   * @returns Dakika (örn: "09:30" -> 570)
   */
  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }

  /**
   * Dakikayı saat string'ine çevirir
   *
   * @param minutes - Dakika (örn: 570)
   * @returns Saat (örn: "09:30")
   */
  private minutesToTime(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  /**
   * Çalışma saatleri içinde slot listesi oluşturur
   *
   * @param openTime - Açılış saati (HH:mm)
   * @param closeTime - Kapanış saati (HH:mm)
   * @param durationMinutes - Hizmet süresi (dakika)
   * @returns Slot listesi ["09:00", "10:00", ...]
   */
  private generateTimeSlots(
    openTime: string,
    closeTime: string,
    durationMinutes: number,
  ): string[] {
    const slots: string[] = [];
    let currentMinutes = this.timeToMinutes(openTime);
    const closeMinutes = this.timeToMinutes(closeTime);

    while (currentMinutes + durationMinutes <= closeMinutes) {
      slots.push(this.minutesToTime(currentMinutes));
      currentMinutes += durationMinutes;
    }

    return slots;
  }

  /**
   * Gün numarasını Türkçe isme çevirir
   *
   * @param dayOfWeek - Gün numarası (0-6)
   * @returns Gün adı (örn: "Pazartesi")
   */
  private getDayName(dayOfWeek: number): string {
    const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    return days[dayOfWeek];
  }
}
