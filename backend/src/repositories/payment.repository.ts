import { Injectable } from "@nestjs/common";
import { Payment, PaymentMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * Payment Repository
 *
 * Offline ödeme takibini yöneten repository katmanı.
 * Veresiye ödemeleri için vade, teminat ve sorumlu personel bilgilerini saklar.
 *
 * @class PaymentRepository
 */
@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni ödeme kaydı oluşturur
   *
   * @param data - Ödeme verisi
   * @returns Oluşturulan ödeme
   */
  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return this.prisma.payment.create({
      data,
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Randevuya ait ödemeyi getirir
   *
   * @param appointmentId - Randevu ID
   * @returns Ödeme veya null
   */
  async findByAppointment(appointmentId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { appointmentId },
      include: {
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Ödemeyi günceller
   *
   * @param id - Ödeme ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş ödeme
   */
  async update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data,
    });
  }

  /**
   * Veresiye ödemeleri getirir
   *
   * @param includeOverdue - Sadece vadesi geçenleri getir
   * @returns Ödeme listesi
   */
  async findVeresiye(includeOverdue = false): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        method: PaymentMethod.VERESIYE,
        ...(includeOverdue && {
          veresiyeDueDate: {
            lt: new Date(),
          },
        }),
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
      orderBy: { veresiyeDueDate: "asc" },
    });
  }

  /**
   * Vadesi geçmiş veresiye ödemelerini getirir
   *
   * @returns Ödeme listesi
   */
  async findOverdue(): Promise<Payment[]> {
    return this.findVeresiye(true);
  }

  /**
   * ID'ye göre ödeme bulur
   *
   * @param id - Ödeme ID
   * @returns Ödeme veya null
   */
  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Filtrelere göre ödeme listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Ödeme listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PaymentWhereInput;
    orderBy?: Prisma.PaymentOrderByWithRelationInput;
  }): Promise<Payment[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.payment.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
    });
  }

  /**
   * Ödeme sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Ödeme sayısı
   */
  async count(where?: Prisma.PaymentWhereInput): Promise<number> {
    return this.prisma.payment.count({ where });
  }

  /**
   * Vadesi yaklaşan veresiye ödemelerini getirir
   *
   * @param daysAhead - Kaç gün sonrası (varsayılan: 3)
   * @returns Ödeme listesi
   */
  async findUpcomingVeresiye(daysAhead = 3): Promise<Payment[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.payment.findMany({
      where: {
        method: PaymentMethod.VERESIYE,
        veresiyeDueDate: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      include: {
        appointment: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { veresiyeDueDate: "asc" },
    });
  }

  /**
   * Tarih aralığındaki ödemeleri getirir
   *
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns Ödeme listesi
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });
  }

  /**
   * Toplam ödeme tutarını hesaplar
   *
   * @param where - Filtre koşulları
   * @returns Toplam tutar
   */
  async getTotalAmount(where?: Prisma.PaymentWhereInput): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });
    return Number(result._sum.amount || 0);
  }
}
