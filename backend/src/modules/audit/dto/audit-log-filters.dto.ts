import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

/**
 * Audit Log Filtreleme DTO
 *
 * Admin panelinde denetim kayıtlarını filtrelemek için kullanılır.
 *
 * Query parametreleri:
 * - action: Aksiyon tipi filtresi (örn: "appointment.override", "payment.update")
 * - actorId: İşlemi yapan kullanıcı ID
 * - targetEntity: Hedef entity tipi (örn: "Appointment", "Payment")
 * - targetId: Hedef entity ID
 * - startDate: Başlangıç tarihi (ISO 8601)
 * - endDate: Bitiş tarihi (ISO 8601)
 * - page: Sayfa numarası (varsayılan: 1)
 * - limit: Sayfa başına kayıt (varsayılan: 50, max: 100)
 *
 * @class AuditLogFiltersDto
 */
export class AuditLogFiltersDto {
  /**
   * Aksiyon tipi filtresi
   * Örnek: "appointment.override", "review.delete", "payment.update"
   */
  @IsOptional()
  @IsString()
  action?: string;

  /**
   * İşlemi yapan kullanıcı ID filtresi
   * Belirli bir kullanıcının yaptığı işlemleri görmek için
   */
  @IsOptional()
  @IsString()
  actorId?: string;

  /**
   * Hedef entity tipi filtresi
   * Örnek: "Appointment", "Payment", "Review", "User"
   */
  @IsOptional()
  @IsString()
  targetEntity?: string;

  /**
   * Hedef entity ID filtresi
   * Belirli bir kaydın tüm değişiklik geçmişini görmek için
   */
  @IsOptional()
  @IsString()
  targetId?: string;

  /**
   * Başlangıç tarihi
   * Format: YYYY-MM-DD veya ISO 8601
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  startDate?: Date;

  /**
   * Bitiş tarihi
   * Format: YYYY-MM-DD veya ISO 8601
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  endDate?: Date;

  /**
   * Sayfa numarası (1'den başlar)
   * Varsayılan: 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Sayfa başına kayıt sayısı
   * Varsayılan: 50, Maksimum: 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
