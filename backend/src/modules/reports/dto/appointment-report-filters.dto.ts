import { IsOptional, IsEnum, IsDateString, IsString } from "class-validator";
import { Type } from "class-transformer";
import { AppointmentStatus } from "@prisma/client";

/**
 * Randevu Raporu Filtreleme DTO
 *
 * Admin panelinde randevu raporlarını filtrelemek için kullanılır.
 *
 * Query parametreleri:
 * - startDate: Başlangıç tarihi (ISO 8601)
 * - endDate: Bitiş tarihi (ISO 8601)
 * - status: Randevu durumu (PENDING, CONFIRMED, etc.)
 * - staffId: Personel ID filtresi
 * - serviceId: Hizmet ID filtresi
 *
 * @class AppointmentReportFiltersDto
 */
export class AppointmentReportFiltersDto {
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
   * Randevu durumu filtresi
   * Değerler: PENDING | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
   */
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  /**
   * Personel ID filtresi
   * Belirli bir personelin randevularını görmek için
   */
  @IsOptional()
  @IsString()
  staffId?: string;

  /**
   * Hizmet ID filtresi
   * Belirli bir hizmetin randevularını görmek için
   */
  @IsOptional()
  @IsString()
  serviceId?: string;
}
