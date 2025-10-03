import { Injectable } from "@nestjs/common";
import { Review, ReviewStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * Review Repository
 *
 * Müşteri yorumlarını yöneten repository katmanı.
 * Admin onayı gerektirir, 1-5 yıldız rating sistemi.
 *
 * @class ReviewRepository
 */
@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni yorum oluşturur
   *
   * @param data - Yorum verisi
   * @returns Oluşturulan yorum
   */
  async create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return this.prisma.review.create({
      data,
      include: {
        customer: true,
        appointment: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  /**
   * ID'ye göre yorum bulur
   *
   * @param id - Yorum ID
   * @returns Yorum veya null
   */
  async findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { id },
      include: {
        customer: true,
        appointment: {
          include: {
            service: true,
            staff: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        deletedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Yorumu günceller
   *
   * @param id - Yorum ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş yorum
   */
  async update(id: string, data: Prisma.ReviewUpdateInput): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data,
    });
  }

  /**
   * Bekleyen yorumları getirir
   *
   * @param limit - Limit (varsayılan: 50)
   * @returns Yorum listesi
   */
  async findPending(limit = 50): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { status: ReviewStatus.PENDING },
      include: {
        customer: true,
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
   * Onaylanmış yorumları getirir
   *
   * @param limit - Limit (varsayılan: 100)
   * @returns Yorum listesi
   */
  async findApproved(limit = 100): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { status: ReviewStatus.APPROVED },
      include: {
        customer: true,
        appointment: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { approvedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Ortalama puanı hesaplar
   *
   * @param where - Filtre koşulları
   * @returns Ortalama rating
   */
  async calculateAverageRating(where?: Prisma.ReviewWhereInput): Promise<number> {
    const result = await this.prisma.review.aggregate({
      where: {
        ...where,
        status: ReviewStatus.APPROVED,
      },
      _avg: {
        rating: true,
      },
    });
    return result._avg.rating || 0;
  }

  /**
   * Filtrelere göre yorum listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Yorum listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput;
  }): Promise<Review[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.review.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        customer: true,
        appointment: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  /**
   * Yorum sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Yorum sayısı
   */
  async count(where?: Prisma.ReviewWhereInput): Promise<number> {
    return this.prisma.review.count({ where });
  }

  /**
   * Yorumu onayla
   *
   * @param id - Yorum ID
   * @param approvedById - Onaylayan admin ID
   * @returns Güncellenmiş yorum
   */
  async approve(id: string, approvedById: string): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: {
        status: ReviewStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Yorumu sil (soft delete, status=DELETED)
   *
   * @param id - Yorum ID
   * @param deletedById - Silen admin ID
   * @returns Güncellenmiş yorum
   */
  async softDelete(id: string, deletedById: string): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: {
        status: ReviewStatus.DELETED,
        deletedById,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Müşteriye ait yorumları getirir
   *
   * @param customerId - Müşteri ID
   * @returns Yorum listesi
   */
  async findByCustomer(customerId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { customerId },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
