import {
  IsDateString,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";

/**
 * Özel Gün Oluşturma DTO
 *
 * Tatiller, özel etkinlikler için çalışma saati tanımlar.
 * SpecialWorkingDay, WorkingHours'a göre önceliklidir (FR-057).
 *
 * Body:
 * {
 *   "date": "2025-01-01",
 *   "isClosed": true,
 *   "description": "Yılbaşı Tatili"
 * }
 *
 * veya
 *
 * {
 *   "date": "2025-12-31",
 *   "openTime": "09:00",
 *   "closeTime": "15:00",
 *   "isClosed": false,
 *   "description": "Yılbaşı Arifesi - Yarım Gün Açık"
 * }
 *
 * @class CreateSpecialDayDto
 */
export class CreateSpecialDayDto {
  /**
   * Özel günün tarihi
   * Format: YYYY-MM-DD veya ISO 8601
   * Geçmiş tarih kabul edilmez (controller'da kontrol)
   */
  @IsDateString()
  date: string;

  /**
   * Açılış saati (HH:mm formatı)
   * Örnek: "09:00"
   * isClosed=false ise zorunlu
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "openTime must be in HH:mm format (e.g., 09:00)",
  })
  @ValidateIf(o => !o.isClosed)
  openTime?: string;

  /**
   * Kapanış saati (HH:mm formatı)
   * Örnek: "19:00"
   * isClosed=false ise zorunlu
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "closeTime must be in HH:mm format (e.g., 19:00)",
  })
  @ValidateIf(o => !o.isClosed)
  closeTime?: string;

  /**
   * Gün kapalı mı?
   * true ise openTime ve closeTime göz ardı edilir
   */
  @IsBoolean()
  isClosed: boolean;

  /**
   * Açıklama (opsiyonel)
   * Örnek: "Resmi Tatil", "Özel Etkinlik"
   * Maksimum 200 karakter
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: "description cannot exceed 200 characters",
  })
  description?: string;
}
