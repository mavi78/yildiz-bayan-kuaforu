import { IsString, IsInt, Min, Max, IsOptional, MaxLength } from "class-validator";

/**
 * Yorum Oluşturma DTO
 *
 * Kayıtlı müşteriler için yorum oluşturma veri aktarım nesnesi.
 * Sadece tamamlanmış randevular için yorum yapılabilir (FR-032).
 *
 * @class CreateReviewDto
 */
export class CreateReviewDto {
  /**
   * Randevu ID
   *
   * @example "appointment-id-123"
   */
  @IsString()
  appointmentId: string;

  /**
   * Puan (1-5)
   *
   * @example 5
   */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /**
   * Yorum metni (opsiyonel, maks 2000 karakter)
   *
   * @example "Harika bir hizmet aldık, çok memnun kaldık!"
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
