import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Payment, PaymentMethod } from "@prisma/client";
import { PaymentRepository } from "../repositories/payment.repository";

/**
 * Payment Service (İş Mantığı Katmanı)
 *
 * Offline ödeme takibi iş kurallarını uygular.
 * Veresiye (deferred payment) yönetimi, vade kontrolü ve hatırlatma mantığı içerir.
 *
 * İş Kuralları:
 * - VERESIYE ödemeler için vade, teminat ve sorumlu zorunlu (FR-040)
 * - Veresiye hatırlatmaları: -3 gün, 0 gün, +N gün (FR-042a)
 * - Ödeme create/update audit log tetikler (FR-039a)
 *
 * @class PaymentService
 */
@Injectable()
export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  /**
   * Yeni ödeme kaydı oluşturur
   *
   * İş Kuralları:
   * - Randevu başına sadece 1 ödeme kaydı (unique constraint)
   * - VERESIYE ise: dueDate, collateral, responsible zorunlu
   * - Amount > 0 kontrolü
   *
   * @param data - Ödeme verisi
   * @returns Oluşturulan ödeme
   *
   * @throws {BadRequestException} Geçersiz veri (amount, veresiye alanları)
   * @throws {ConflictException} Randevu için ödeme zaten var
   *
   * @example
   * ```typescript
   * const payment = await service.recordPayment({
   *   appointmentId: 'apt-id',
   *   amount: 150.00,
   *   method: PaymentMethod.CASH,
   *   paidAt: new Date(),
   *   recordedById: 'staff-id'
   * });
   * ```
   */
  async recordPayment(data: {
    appointmentId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    recordedById: string;
    veresiyeDueDate?: Date;
    veresiyeCollateral?: string;
    veresiyeResponsible?: string;
  }): Promise<Payment> {
    // Amount validation
    if (data.amount <= 0) {
      throw new BadRequestException("Ödeme tutarı 0'dan büyük olmalıdır.");
    }

    // VERESIYE validasyonu (FR-040)
    if (data.method === PaymentMethod.VERESIYE) {
      if (!data.veresiyeDueDate) {
        throw new BadRequestException("Veresiye ödemeler için vade tarihi zorunludur.");
      }
      if (!data.veresiyeCollateral) {
        throw new BadRequestException("Veresiye ödemeler için teminat bilgisi zorunludur.");
      }
      if (!data.veresiyeResponsible) {
        throw new BadRequestException(
          "Veresiye ödemeler için sorumlu personel bilgisi zorunludur.",
        );
      }

      // Vade tarihi geçmişte olamaz
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (data.veresiyeDueDate < today) {
        throw new BadRequestException("Vade tarihi geçmişte olamaz.");
      }
    }

    // Randevu için ödeme zaten var mı kontrol et
    const existingPayment = await this.paymentRepository.findByAppointment(data.appointmentId);
    if (existingPayment) {
      throw new ConflictException("Bu randevu için zaten ödeme kaydı mevcut.");
    }

    // Ödeme kaydı oluştur
    return this.paymentRepository.create({
      appointment: {
        connect: { id: data.appointmentId },
      },
      amount: data.amount,
      method: data.method,
      paidAt: data.paidAt,
      veresiyeDueDate: data.veresiyeDueDate,
      veresiyeCollateral: data.veresiyeCollateral,
      veresiyeResponsible: data.veresiyeResponsible,
      recordedBy: {
        connect: { id: data.recordedById },
      },
    });
  }

  /**
   * Vadesi geçmiş veresiye ödemelerini getirir
   *
   * İş Kuralı: veresiyeDueDate < bugün olan VERESIYE ödemeler
   *
   * @returns Vadesi geçmiş ödeme listesi
   */
  async findVeresiyeOverdue(): Promise<Payment[]> {
    return this.paymentRepository.findOverdue();
  }

  /**
   * Ödeme bilgilerini günceller
   *
   * Kullanım: Veresiye ödeme sonradan kapatıldığında
   *
   * @param id - Ödeme ID
   * @param data - Güncellenecek alanlar
   * @returns Güncellenmiş ödeme
   *
   * @throws {NotFoundException} Ödeme bulunamadı
   *
   * @example
   * ```typescript
   * // Veresiye ödeme kapatıldı
   * await service.updatePayment('payment-id', {
   *   method: PaymentMethod.CASH,
   *   veresiyeDueDate: null,
   *   veresiyeCollateral: null,
   *   veresiyeResponsible: null
   * });
   * ```
   */
  async updatePayment(
    id: string,
    data: {
      amount?: number;
      method?: PaymentMethod;
      paidAt?: Date;
      veresiyeDueDate?: Date | null;
      veresiyeCollateral?: string | null;
      veresiyeResponsible?: string | null;
    },
  ): Promise<Payment> {
    // Ödeme var mı kontrol et
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Ödeme bulunamadı: ${id}`);
    }

    // Amount güncellenmişse, pozitif kontrolü
    if (data.amount !== undefined && data.amount <= 0) {
      throw new BadRequestException("Ödeme tutarı 0'dan büyük olmalıdır.");
    }

    // VERESIYE'ye dönüştürülüyorsa, gerekli alanları kontrol et
    if (data.method === PaymentMethod.VERESIYE) {
      if (!data.veresiyeDueDate) {
        throw new BadRequestException("Veresiye ödemeler için vade tarihi zorunludur.");
      }
      if (!data.veresiyeCollateral) {
        throw new BadRequestException("Veresiye ödemeler için teminat bilgisi zorunludur.");
      }
      if (!data.veresiyeResponsible) {
        throw new BadRequestException(
          "Veresiye ödemeler için sorumlu personel bilgisi zorunludur.",
        );
      }
    }

    return this.paymentRepository.update(id, data);
  }

  /**
   * ID'ye göre ödeme bulur
   *
   * @param id - Ödeme ID
   * @returns Ödeme
   *
   * @throws {NotFoundException} Ödeme bulunamadı
   */
  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Ödeme bulunamadı: ${id}`);
    }
    return payment;
  }

  /**
   * Randevuya ait ödemeyi getirir
   *
   * @param appointmentId - Randevu ID
   * @returns Ödeme veya null
   */
  async findByAppointment(appointmentId: string): Promise<Payment | null> {
    return this.paymentRepository.findByAppointment(appointmentId);
  }

  /**
   * Tüm veresiye ödemelerini getirir
   *
   * @returns Veresiye ödeme listesi
   */
  async findAllVeresiye(): Promise<Payment[]> {
    return this.paymentRepository.findVeresiye(false);
  }

  /**
   * Vadesi yaklaşan veresiye ödemelerini getirir (hatırlatma için)
   *
   * İş Kuralı (FR-042a): -3 gün, 0 gün kontrolü
   *
   * @param daysAhead - Kaç gün sonrası (varsayılan: 3)
   * @returns Ödeme listesi
   *
   * @example
   * ```typescript
   * // 3 gün içinde vadesi dolacak ödemeler
   * const upcoming = await service.findUpcomingVeresiye(3);
   * ```
   */
  async findUpcomingVeresiye(daysAhead = 3): Promise<Payment[]> {
    return this.paymentRepository.findUpcomingVeresiye(daysAhead);
  }

  /**
   * Tarih aralığındaki ödemeleri getirir (raporlama için)
   *
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns Ödeme listesi
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]> {
    return this.paymentRepository.findByDateRange(startDate, endDate);
  }

  /**
   * Toplam ödeme tutarını hesaplar
   *
   * @param filters - Filtre koşulları (method, tarih aralığı vb.)
   * @returns Toplam tutar
   */
  async getTotalAmount(filters?: {
    method?: PaymentMethod;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const where: any = {};

    if (filters?.method) {
      where.method = filters.method;
    }

    if (filters?.startDate && filters?.endDate) {
      where.paidAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return this.paymentRepository.getTotalAmount(where);
  }

  /**
   * Ödeme sayısını döndürür
   *
   * @param method - Ödeme yöntemi filtresi (opsiyonel)
   * @returns Ödeme sayısı
   */
  async count(method?: PaymentMethod): Promise<number> {
    return this.paymentRepository.count(method ? { method } : undefined);
  }

  /**
   * Veresiye ödemeyi kapatır (ödeme yapıldı)
   *
   * @param id - Ödeme ID
   * @param newMethod - Yeni ödeme yöntemi (CASH, BANK_TRANSFER, POS_CARD)
   * @param paidAt - Ödeme tarihi
   * @returns Güncellenmiş ödeme
   *
   * @throws {NotFoundException} Ödeme bulunamadı
   * @throws {BadRequestException} Veresiye değilse veya yeni method VERESIYE
   */
  async closeVeresiye(id: string, newMethod: PaymentMethod, paidAt: Date): Promise<Payment> {
    const payment = await this.findById(id);

    // Veresiye kontrolü
    if (payment.method !== PaymentMethod.VERESIYE) {
      throw new BadRequestException("Bu ödeme veresiye değil.");
    }

    // Yeni method VERESIYE olamaz
    if (newMethod === PaymentMethod.VERESIYE) {
      throw new BadRequestException(
        "Veresiye ödemeyi kapatırken yeni ödeme yöntemi VERESIYE olamaz.",
      );
    }

    return this.paymentRepository.update(id, {
      method: newMethod,
      paidAt,
      veresiyeDueDate: null,
      veresiyeCollateral: null,
      veresiyeResponsible: null,
    });
  }

  /**
   * Veresiye vade tarihini uzatır
   *
   * @param id - Ödeme ID
   * @param newDueDate - Yeni vade tarihi
   * @returns Güncellenmiş ödeme
   *
   * @throws {NotFoundException} Ödeme bulunamadı
   * @throws {BadRequestException} Veresiye değilse veya tarih geçersiz
   */
  async extendVeresiyeDueDate(id: string, newDueDate: Date): Promise<Payment> {
    const payment = await this.findById(id);

    // Veresiye kontrolü
    if (payment.method !== PaymentMethod.VERESIYE) {
      throw new BadRequestException("Bu ödeme veresiye değil.");
    }

    // Tarih kontrolü
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDueDate < today) {
      throw new BadRequestException("Yeni vade tarihi geçmişte olamaz.");
    }

    return this.paymentRepository.update(id, {
      veresiyeDueDate: newDueDate,
    });
  }

  /**
   * Ödeme yöntemi dağılımını getirir (raporlama için)
   *
   * @returns Yöntem bazında sayı
   */
  async getPaymentMethodDistribution(): Promise<Record<PaymentMethod, number>> {
    const distribution: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.POS_CARD]: 0,
      [PaymentMethod.VERESIYE]: 0,
    };

    for (const method of Object.values(PaymentMethod)) {
      distribution[method] = await this.paymentRepository.count({ method });
    }

    return distribution;
  }

  /**
   * Veresiye ödeme özeti döndürür
   *
   * @returns Özet bilgisi (toplam, vadesi geçmiş, yaklaşan)
   */
  async getVeresiyeSummary(): Promise<{
    total: number;
    overdue: number;
    upcoming: number;
    totalAmount: number;
  }> {
    const allVeresiye = await this.paymentRepository.findVeresiye(false);
    const overdueVeresiye = await this.paymentRepository.findOverdue();
    const upcomingVeresiye = await this.findUpcomingVeresiye(3);
    const totalAmount = await this.paymentRepository.getTotalAmount({
      method: PaymentMethod.VERESIYE,
    });

    return {
      total: allVeresiye.length,
      overdue: overdueVeresiye.length,
      upcoming: upcomingVeresiye.length,
      totalAmount,
    };
  }
}
