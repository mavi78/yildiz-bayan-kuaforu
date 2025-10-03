import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Review, ReviewStatus, CustomerType, AppointmentStatus } from "@prisma/client";
import { ReviewRepository } from "../repositories/review.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { AppointmentRepository } from "../repositories/appointment.repository";

/**
 * Review Service (İş Mantığı Katmanı)
 *
 * Müşteri yorumları iş kurallarını uygular.
 * Admin onay süreci, audit log entegrasyonu ve rating hesaplama içerir.
 *
 * İş Kuralları:
 * - Sadece REGISTERED müşteriler yorum yapabilir (FR-032)
 * - Admin onayı gereklidir (FR-033)
 * - Silme işlemi audit log tetikler (FR-034)
 * - Salon puanı = AVG(rating) WHERE status=APPROVED (FR-035)
 *
 * @class ReviewService
 */
@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly appointmentRepository: AppointmentRepository,
  ) {}

  /**
   * Yeni yorum oluşturur
   *
   * İş Kuralları (FR-032):
   * - Müşteri REGISTERED tipinde olmalı
   * - Randevu COMPLETED durumunda olmalı
   * - Rating 1-5 aralığında olmalı
   * - Randevu başına 1 yorum
   *
   * @param data - Yorum verisi
   * @returns Oluşturulan yorum (status=PENDING)
   *
   * @throws {ForbiddenException} Misafir müşteri yorum yapamaz
   * @throws {BadRequestException} Randevu tamamlanmamış veya rating geçersiz
   * @throws {ConflictException} Yorum zaten var
   *
   * @example
   * ```typescript
   * const review = await service.create({
   *   customerId: 'customer-id',
   *   appointmentId: 'appointment-id',
   *   rating: 5,
   *   comment: 'Harika bir hizmet!'
   * });
   * ```
   */
  async create(data: {
    customerId: string;
    appointmentId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    // Müşteri kontrolü: REGISTERED olmalı
    const customer = await this.customerRepository.findById(data.customerId);
    if (!customer) {
      throw new NotFoundException("Müşteri bulunamadı.");
    }

    if (customer.type !== CustomerType.REGISTERED) {
      throw new ForbiddenException(
        "Sadece kayıtlı müşteriler yorum yapabilir. (FR-032)",
      );
    }

    // Randevu kontrolü: COMPLETED olmalı
    const appointment = await this.appointmentRepository.findById(
      data.appointmentId,
    );
    if (!appointment) {
      throw new NotFoundException("Randevu bulunamadı.");
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        "Sadece tamamlanmış randevular için yorum yapılabilir.",
      );
    }

    // Randevu müşteriye ait mi kontrol et
    if (appointment.customerId !== data.customerId) {
      throw new ForbiddenException("Bu randevu size ait değil.");
    }

    // Rating validation (1-5)
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException("Rating 1-5 arasında olmalıdır.");
    }

    // Randevu için yorum zaten var mı kontrol et (unique constraint)
    const existingReview = await this.reviewRepository.findMany({
      where: { appointmentId: data.appointmentId },
      take: 1,
    });

    if (existingReview.length > 0) {
      throw new BadRequestException(
        "Bu randevu için zaten yorum yapılmış.",
      );
    }

    // Yorum oluştur (default status=PENDING)
    return this.reviewRepository.create({
      customer: {
        connect: { id: data.customerId },
      },
      appointment: {
        connect: { id: data.appointmentId },
      },
      rating: data.rating,
      comment: data.comment,
    });
  }

  /**
   * Yorumu onayla (Admin only)
   *
   * İş Kuralı (FR-033): Admin onayından sonra public görünür
   *
   * @param reviewId - Yorum ID
   * @param approvedById - Onaylayan admin ID
   * @returns Güncellenmiş yorum (status=APPROVED)
   *
   * @throws {NotFoundException} Yorum bulunamadı
   * @throws {BadRequestException} Yorum zaten onaylanmış veya silinmiş
   *
   * @example
   * ```typescript
   * const review = await service.approve('review-id', 'admin-id');
   * ```
   */
  async approve(reviewId: string, approvedById: string): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException("Yorum bulunamadı.");
    }

    // Durum kontrolü
    if (review.status === ReviewStatus.APPROVED) {
      throw new BadRequestException("Yorum zaten onaylanmış.");
    }

    if (review.status === ReviewStatus.DELETED) {
      throw new BadRequestException("Silinen yorum onaylanamaz.");
    }

    // Onayla
    return this.reviewRepository.approve(reviewId, approvedById);
  }

  /**
   * Yorumu siler (soft delete, Admin only)
   *
   * İş Kuralı (FR-034): Silme işlemi audit log tetikler
   * Not: Audit log entegrasyonu usecase katmanında yapılacak
   *
   * @param reviewId - Yorum ID
   * @param deletedById - Silen admin ID
   * @returns Güncellenmiş yorum (status=DELETED)
   *
   * @throws {NotFoundException} Yorum bulunamadı
   *
   * @example
   * ```typescript
   * const review = await service.delete('review-id', 'admin-id');
   * // Audit log usecase katmanında oluşturulacak
   * ```
   */
  async delete(reviewId: string, deletedById: string): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException("Yorum bulunamadı.");
    }

    // Soft delete (status=DELETED)
    return this.reviewRepository.softDelete(reviewId, deletedById);
  }

  /**
   * ID'ye göre yorum bulur
   *
   * @param id - Yorum ID
   * @returns Yorum
   *
   * @throws {NotFoundException} Yorum bulunamadı
   */
  async findById(id: string): Promise<Review> {
    const review = await this.reviewRepository.findById(id);
    if (!review) {
      throw new NotFoundException(`Yorum bulunamadı: ${id}`);
    }
    return review;
  }

  /**
   * Bekleyen yorumları getirir (Admin review için)
   *
   * @param limit - Limit (varsayılan: 50)
   * @returns Yorum listesi
   */
  async findPending(limit = 50): Promise<Review[]> {
    return this.reviewRepository.findPending(limit);
  }

  /**
   * Onaylanmış yorumları getirir (public display için)
   *
   * @param limit - Limit (varsayılan: 100)
   * @returns Yorum listesi
   */
  async findApproved(limit = 100): Promise<Review[]> {
    return this.reviewRepository.findApproved(limit);
  }

  /**
   * Salon ortalama puanını hesaplar
   *
   * İş Kuralı (FR-035): Sadece APPROVED yorumlar hesaba katılır
   *
   * @returns Ortalama rating (0-5)
   *
   * @example
   * ```typescript
   * const avgRating = await service.getAverageRating();
   * // Örnek: 4.7
   * ```
   */
  async getAverageRating(): Promise<number> {
    return this.reviewRepository.calculateAverageRating();
  }

  /**
   * Müşteriye ait yorumları getirir
   *
   * @param customerId - Müşteri ID
   * @returns Yorum listesi
   */
  async findByCustomer(customerId: string): Promise<Review[]> {
    return this.reviewRepository.findByCustomer(customerId);
  }

  /**
   * Yorum sayısını döndürür
   *
   * @param status - Durum filtresi (opsiyonel)
   * @returns Yorum sayısı
   */
  async count(status?: ReviewStatus): Promise<number> {
    return this.reviewRepository.count(status ? { status } : undefined);
  }

  /**
   * Yorum istatistiklerini getirir
   *
   * @returns İstatistik bilgisi
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    approved: number;
    deleted: number;
    averageRating: number;
  }> {
    const [total, pending, approved, deleted, averageRating] =
      await Promise.all([
        this.count(),
        this.count(ReviewStatus.PENDING),
        this.count(ReviewStatus.APPROVED),
        this.count(ReviewStatus.DELETED),
        this.getAverageRating(),
      ]);

    return {
      total,
      pending,
      approved,
      deleted,
      averageRating: Math.round(averageRating * 10) / 10, // 1 ondalık basamak
    };
  }

  /**
   * Rating dağılımını getirir (1-5 yıldız bazında)
   *
   * @returns Rating bazında yorum sayısı
   */
  async getRatingDistribution(): Promise<Record<number, number>> {
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    const approvedReviews = await this.reviewRepository.findApproved(1000);

    for (const review of approvedReviews) {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating]++;
      }
    }

    return distribution;
  }
}

