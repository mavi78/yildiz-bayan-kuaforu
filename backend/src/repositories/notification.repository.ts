import { Injectable } from "@nestjs/common";
import { Notification, DeliveryStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * Notification Repository
 *
 * Multi-channel bildirim kayıtlarını yöneten repository katmanı.
 * Email, SMS ve Socket.io kanalları için ayrı durum takibi.
 *
 * @class NotificationRepository
 */
@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni bildirim kaydı oluşturur
   *
   * @param data - Bildirim verisi
   * @returns Oluşturulan bildirim
   */
  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({
      data,
      include: {
        customer: true,
        appointment: true,
      },
    });
  }

  /**
   * Bildirimi günceller
   *
   * @param id - Bildirim ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş bildirim
   */
  async update(id: string, data: Prisma.NotificationUpdateInput): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  /**
   * Başarısız bildirimleri getirir (max retry aşılanlar)
   *
   * @param maxAttempts - Maksimum deneme sayısı (varsayılan: 3)
   * @returns Bildirim listesi
   */
  async findFailed(maxAttempts = 3): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        attemptCount: {
          gte: maxAttempts,
        },
        OR: [
          { emailStatus: DeliveryStatus.FAILED },
          { smsStatus: DeliveryStatus.FAILED },
          { socketStatus: DeliveryStatus.FAILED },
        ],
      },
      include: {
        customer: true,
        appointment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Arşivlenecek bildirimleri getirir (30+ gün önceki)
   *
   * @param daysAgo - Kaç gün önce (varsayılan: 30)
   * @returns Bildirim listesi
   */
  async findToArchive(daysAgo = 30): Promise<Notification[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return this.prisma.notification.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * ID'ye göre bildirim bulur
   *
   * @param id - Bildirim ID
   * @returns Bildirim veya null
   */
  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        customer: true,
        appointment: true,
      },
    });
  }

  /**
   * Filtrelere göre bildirim listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Bildirim listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
  }): Promise<Notification[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.notification.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        customer: true,
      },
    });
  }

  /**
   * Bildirim sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Bildirim sayısı
   */
  async count(where?: Prisma.NotificationWhereInput): Promise<number> {
    return this.prisma.notification.count({ where });
  }

  /**
   * Bildirimleri toplu siler
   *
   * @param ids - Bildirim ID'leri
   * @returns Silinen kayıt sayısı
   */
  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return result.count;
  }

  /**
   * Müşteriye ait bildirimleri getirir
   *
   * @param customerId - Müşteri ID
   * @param limit - Limit (varsayılan: 50)
   * @returns Bildirim listesi
   */
  async findByCustomer(customerId: string, limit = 50): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { customerId },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Randevuya ait bildirimleri getirir
   *
   * @param appointmentId - Randevu ID
   * @returns Bildirim listesi
   */
  async findByAppointment(appointmentId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { appointmentId },
      orderBy: { createdAt: "asc" },
    });
  }
}
