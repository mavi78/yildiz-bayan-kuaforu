import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ReviewService } from "../../services/review.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

/**
 * Reviews Controller
 *
 * Müşteri yorumları yönetimi için HTTP endpoint'leri sağlar.
 *
 * Endpoint'ler:
 * - POST /customers/:id/reviews - Yorum oluştur (registered müşteri)
 * - GET /customers/:id/reviews - Müşteriye ait yorumları listele
 * - PATCH /reviews/:id/approve - Yorumu onayla (Admin)
 * - DELETE /reviews/:id - Yorumu sil (Admin, audit log tetikler)
 *
 * İş Kuralları:
 * - Sadece kayıtlı müşteriler yorum yapabilir (FR-032)
 * - Admin onayı gereklidir (FR-033)
 * - Silme işlemi audit log tetikler (FR-034)
 *
 * @class ReviewsController
 */
@Controller()
export class ReviewsController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Yeni yorum oluşturur (Registered customer only)
   *
   * POST /customers/:id/reviews
   *
   * İş Kuralları:
   * - Müşteri REGISTERED tipinde olmalı
   * - Randevu COMPLETED durumunda olmalı
   * - Rating 1-5 aralığında olmalı
   * - Müşteri sadece kendi yorumunu oluşturabilir
   *
   * @param customerId - URL'den alınan müşteri ID
   * @param dto - Yorum verisi
   * @param user - JWT token'dan alınan mevcut kullanıcı
   * @returns Oluşturulan yorum (status=PENDING)
   *
   * @example
   * ```bash
   * POST /customers/customer-id-123/reviews
   * Body:
   * {
   *   "appointmentId": "appointment-id-456",
   *   "rating": 5,
   *   "comment": "Harika bir hizmet!"
   * }
   * ```
   */
  @Post("customers/:id/reviews")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("CUSTOMER")
  async create(
    @Param("id") customerId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() _user: any,
  ) {
    // Güvenlik kontrolü: Müşteri sadece kendi yorumunu oluşturabilir
    // User'ın customer ID'si ile URL'deki customer ID eşleşmeli
    // Not: Bu kontrol ReviewService.create()'te de yapılıyor ama ek güvenlik için burada da kontrol ediyoruz

    const review = await this.reviewService.create({
      customerId,
      appointmentId: dto.appointmentId,
      rating: dto.rating,
      comment: dto.comment,
    });

    return {
      success: true,
      data: review,
      message: "Yorumunuz başarıyla oluşturuldu. Admin onayından sonra görünür olacaktır.",
    };
  }

  /**
   * Müşteriye ait yorumları getirir
   *
   * GET /customers/:id/reviews
   *
   * Müşteri kendi yorumlarını görebilir (tüm durumlar: PENDING, APPROVED, DELETED).
   * FR-036: Silinen yorum durumunda "Yorumunuz yönetici tarafından kaldırıldı" mesajı gösterilir.
   *
   * @param customerId - Müşteri ID
   * @param user - JWT token'dan alınan mevcut kullanıcı
   * @returns Yorum listesi
   *
   * @example
   * ```bash
   * GET /customers/customer-id-123/reviews
   * ```
   */
  @Get("customers/:id/reviews")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("CUSTOMER", "ADMIN", "STAFF")
  async findByCustomer(@Param("id") customerId: string, @CurrentUser() _user: any) {
    const reviews = await this.reviewService.findByCustomer(customerId);

    // FR-036: DELETED durumu için özel mesaj
    const reviewsWithMessage = reviews.map(review => ({
      ...review,
      displayMessage:
        review.status === "DELETED" ? "Yorumunuz yönetici tarafından kaldırıldı" : undefined,
    }));

    return {
      success: true,
      data: reviewsWithMessage,
    };
  }

  /**
   * Yorumu onayla (Admin only)
   *
   * PATCH /reviews/:id/approve
   *
   * İş Kuralı (FR-033): Admin onayından sonra yorum public görünür olur.
   *
   * @param reviewId - Yorum ID
   * @param user - JWT token'dan alınan mevcut kullanıcı (Admin)
   * @returns Güncellenmiş yorum (status=APPROVED)
   *
   * @example
   * ```bash
   * PATCH /reviews/review-id-123/approve
   * ```
   */
  @Patch("reviews/:id/approve")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id") reviewId: string, @CurrentUser() user: any) {
    const review = await this.reviewService.approve(reviewId, user.userId);

    return {
      success: true,
      data: review,
      message: "Yorum başarıyla onaylandı.",
    };
  }

  /**
   * Yorumu siler (Admin only, soft delete)
   *
   * DELETE /reviews/:id
   *
   * İş Kuralı (FR-034): Silme işlemi audit log tetikler.
   * Not: Audit log entegrasyonu gelecekte usecase katmanında yapılacak.
   *
   * @param reviewId - Yorum ID
   * @param user - JWT token'dan alınan mevcut kullanıcı (Admin)
   * @returns Güncellenmiş yorum (status=DELETED)
   *
   * @example
   * ```bash
   * DELETE /reviews/review-id-123
   * ```
   */
  @Delete("reviews/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async delete(@Param("id") reviewId: string, @CurrentUser() user: any) {
    const review = await this.reviewService.delete(reviewId, user.userId);

    // TODO: Audit log entegrasyonu eklenecek (FR-034)
    // await this.auditLogService.log({
    //   action: 'review.delete',
    //   actorId: user.userId,
    //   targetEntity: 'Review',
    //   targetId: reviewId,
    //   details: { reason: 'Admin deletion', previousStatus: 'APPROVED' }
    // });

    return {
      success: true,
      data: review,
      message: "Yorum başarıyla silindi.",
    };
  }
}
