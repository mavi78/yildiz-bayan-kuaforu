import { IsInt, IsBoolean, IsOptional, IsString, Matches, Min, Max, ValidateIf } from 'class-validator';

/**
 * Günlük Çalışma Saati DTO
 *
 * Haftanın bir günü için çalışma saatini tanımlar.
 *
 * İş Kuralları:
 * - dayOfWeek: 0-6 (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi)
 * - isClosed=true ise openTime ve closeTime null olabilir
 * - isClosed=false ise openTime ve closeTime zorunlu
 * - openTime < closeTime kontrolü (business layer'da)
 *
 * @class DayWorkingHoursDto
 */
export class DayWorkingHoursDto {
  /**
   * Haftanın günü
   * 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
   */
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  /**
   * Açılış saati (HH:mm formatı)
   * Örnek: "09:00"
   * isClosed=false ise zorunlu
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'openTime must be in HH:mm format (e.g., 09:00)',
  })
  @ValidateIf((o) => !o.isClosed)
  openTime?: string;

  /**
   * Kapanış saati (HH:mm formatı)
   * Örnek: "19:00"
   * isClosed=false ise zorunlu
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'closeTime must be in HH:mm format (e.g., 19:00)',
  })
  @ValidateIf((o) => !o.isClosed)
  closeTime?: string;

  /**
   * Gün kapalı mı?
   * true ise openTime ve closeTime göz ardı edilir
   */
  @IsBoolean()
  isClosed: boolean;
}
