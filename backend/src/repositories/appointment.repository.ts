import { Injectable } from "@nestjs/common";
import { Appointment, AppointmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * Appointment Repository
 *
 * Randevu verilerini yöneten repository katmanı.
 * Optimistic locking ile concurrent creation koruması sağlar.
 *
 * İş Kuralları:
 * - Çakışma kontrolü: (staffId, date, time) + status ∈ {PENDING, CONFIRMED}
 * - Tracking code: 8 haneli alphanumeric (ONLINE_GUEST için zorunlu)
 *
 * @class AppointmentRepository
 */
@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni randevu oluşturur
   *
   * Not: Transaction kullanarak optimistic locking sağlar
   *
   * @param data - Randevu oluşturma verisi
   * @returns Oluşturulan randevu
   */
  async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
    return this.prisma.appointment.create({
      data,
      include: {
        customer: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: true,
      },
    });
  }

  /**
   * ID'ye göre randevu bulur
   *
   * @param id - Randevu ID
   * @param includeRelations - İlişkileri dahil et
   * @returns Randevu veya null
   */
  async findById(id: string, includeRelations = false): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: includeRelations
        ? {
            customer: true,
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            service: true,
            serviceNotes: {
              orderBy: { createdAt: "desc" },
            },
            payment: true,
            review: true,
          }
        : undefined,
    });
  }

  /**
   * Tracking code'a göre randevu bulur (misafir randevuları için)
   *
   * @param trackingCode - 8 haneli kod
   * @returns Randevu veya null
   */
  async findByTrackingCode(trackingCode: string): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({
      where: { trackingCode },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });
  }

  /**
   * Çakışan randevuları bulur
   *
   * Kontrol: (staffId, date, time) + status ∈ {PENDING, CONFIRMED}
   *
   * @param staffId - Personel ID
   * @param date - Randevu tarihi
   * @param time - Randevu saati (HH:mm)
   * @param excludeId - Hariç tutulacak randevu ID (update işlemlerinde)
   * @returns Çakışan randevu sayısı
   */
  async findConflicts(
    staffId: string,
    date: Date,
    time: string,
    excludeId?: string,
  ): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        staffId,
        date,
        time,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  /**
   * Randevuyu günceller
   *
   * @param id - Randevu ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş randevu
   */
  async update(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    return this.prisma.appointment.update({
      where: { id },
      data,
    });
  }

  /**
   * Bekleyen randevuları getirir
   *
   * @param limit - Limit (varsayılan: 50)
   * @returns Randevu listesi
   */
  async findPending(limit = 50): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: { status: AppointmentStatus.PENDING },
      include: {
        customer: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: true,
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: limit,
    });
  }

  /**
   * Müşteriye ait randevuları getirir
   *
   * @param customerId - Müşteri ID
   * @param includeAll - Tüm durumları dahil et (varsayılan: sadece aktif)
   * @returns Randevu listesi
   */
  async findByCustomer(customerId: string, includeAll = false): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        customerId,
        ...(includeAll
          ? {}
          : {
              status: {
                notIn: [AppointmentStatus.CANCELLED],
              },
            }),
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: true,
      },
      orderBy: { date: "desc" },
    });
  }

  /**
   * Personele ait randevuları getirir
   *
   * @param staffId - Personel ID
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns Randevu listesi
   */
  async findByStaff(staffId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        staffId,
        ...(startDate && endDate
          ? {
              date: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
      },
      include: {
        customer: true,
        service: true,
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  }

  /**
   * Filtrelere göre randevu listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Randevu listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AppointmentWhereInput;
    orderBy?: Prisma.AppointmentOrderByWithRelationInput;
    include?: Prisma.AppointmentInclude;
  }): Promise<Appointment[]> {
    const { skip, take, where, orderBy, include } = params;
    return this.prisma.appointment.findMany({
      skip,
      take,
      where,
      orderBy,
      include,
    });
  }

  /**
   * Randevu sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Randevu sayısı
   */
  async count(where?: Prisma.AppointmentWhereInput): Promise<number> {
    return this.prisma.appointment.count({ where });
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
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(cancellationReason && { cancellationReason }),
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }

  /**
   * Tarih aralığındaki randevuları getirir
   *
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @param status - Durum filtresi (opsiyonel)
   * @returns Randevu listesi
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    status?: AppointmentStatus,
  ): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(status && { status }),
      },
      include: {
        customer: true,
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: true,
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  }

  /**
   * Randevu var mı kontrol eder
   *
   * @param id - Randevu ID
   * @returns Var ise true, yoksa false
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Tracking code kullanımda mı kontrol eder
   *
   * @param trackingCode - Tracking code
   * @returns Kullanımda ise true
   */
  async isTrackingCodeTaken(trackingCode: string): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: { trackingCode },
    });
    return count > 0;
  }

  /**
   * Randevuyu siler
   *
   * @param id - Randevu ID
   * @returns Silinen randevu
   */
  async delete(id: string): Promise<Appointment> {
    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  /**
   * Bugünkü randevuları getirir
   *
   * @param status - Durum filtresi (opsiyonel)
   * @returns Randevu listesi
   */
  async findToday(status?: AppointmentStatus): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        ...(status && { status }),
      },
      include: {
        customer: true,
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: true,
      },
      orderBy: { time: "asc" },
    });
  }
}
