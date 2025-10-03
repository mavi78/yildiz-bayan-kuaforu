import { Injectable } from "@nestjs/common";
import { AuditLog, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * AuditLog Repository
 *
 * Denetim kayıtlarını yöneten repository katmanı.
 * SHA-256 hash chain ile bütünlük koruması sağlar.
 * 90 gün sonra JSONL formatında arşivlenir.
 *
 * @class AuditLogRepository
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni denetim kaydı oluşturur
   *
   * @param data - Denetim kaydı verisi
   * @returns Oluşturulan kayıt
   */
  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Arşivlenecek kayıtları getirir (90+ gün önceki)
   *
   * @param daysAgo - Kaç gün önce (varsayılan: 90)
   * @returns Denetim kaydı listesi
   */
  async findToArchive(daysAgo = 90): Promise<AuditLog[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        archived: false,
      },
      orderBy: { timestamp: "asc" },
    });
  }

  /**
   * Kayıtları arşivlenmiş olarak işaretler
   *
   * @param ids - Kayıt ID'leri
   * @returns Güncellenen kayıt sayısı
   */
  async markArchived(ids: string[]): Promise<number> {
    const result = await this.prisma.auditLog.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        archived: true,
      },
    });
    return result.count;
  }

  /**
   * Arşivlenmiş kayıtları siler
   *
   * @returns Silinen kayıt sayısı
   */
  async deleteArchived(): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        archived: true,
      },
    });
    return result.count;
  }

  /**
   * En son kaydı getirir (previousHash için)
   *
   * @returns En son denetim kaydı veya null
   */
  async findLatest(): Promise<AuditLog | null> {
    return this.prisma.auditLog.findFirst({
      orderBy: { timestamp: "desc" },
    });
  }

  /**
   * ID'ye göre kayıt bulur
   *
   * @param id - Kayıt ID
   * @returns Denetim kaydı veya null
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Filtrelere göre kayıt listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Denetim kaydı listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AuditLogWhereInput;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
  }): Promise<AuditLog[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.auditLog.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Kayıt sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Kayıt sayısı
   */
  async count(where?: Prisma.AuditLogWhereInput): Promise<number> {
    return this.prisma.auditLog.count({ where });
  }

  /**
   * Kullanıcıya ait kayıtları getirir
   *
   * @param actorId - Kullanıcı ID
   * @param limit - Limit (varsayılan: 100)
   * @returns Denetim kaydı listesi
   */
  async findByActor(actorId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  /**
   * Hedefe ait kayıtları getirir
   *
   * @param targetEntity - Hedef entity tipi
   * @param targetId - Hedef entity ID
   * @returns Denetim kaydı listesi
   */
  async findByTarget(targetEntity: string, targetId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        targetEntity,
        targetId,
      },
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });
  }

  /**
   * Aksiyona göre kayıtları getirir
   *
   * @param action - Aksiyon tipi
   * @param limit - Limit (varsayılan: 100)
   * @returns Denetim kaydı listesi
   */
  async findByAction(action: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { action },
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  /**
   * Tarih aralığındaki kayıtları getirir
   *
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns Denetim kaydı listesi
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });
  }

  /**
   * Hash chain doğrulaması için kayıt dizisi getirir
   *
   * @param startId - Başlangıç kayıt ID
   * @param limit - Limit
   * @returns Denetim kaydı listesi
   */
  async findChain(startId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: (
            await this.prisma.auditLog.findUnique({
              where: { id: startId },
              select: { timestamp: true },
            })
          )?.timestamp,
        },
      },
      orderBy: { timestamp: "asc" },
      take: limit,
    });
  }
}
