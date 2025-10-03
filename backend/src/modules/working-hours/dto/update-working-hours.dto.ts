import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { DayWorkingHoursDto } from './day-working-hours.dto';

/**
 * Çalışma Saatleri Güncelleme DTO
 *
 * Haftanın tüm günleri için çalışma saatlerini toplu olarak günceller.
 * Admin panelinde kullanılır (FR-055).
 *
 * Body:
 * {
 *   "workingHours": [
 *     { "dayOfWeek": 0, "isClosed": true },
 *     { "dayOfWeek": 1, "openTime": "09:00", "closeTime": "19:00", "isClosed": false },
 *     ...
 *   ]
 * }
 *
 * @class UpdateWorkingHoursDto
 */
export class UpdateWorkingHoursDto {
  /**
   * Haftanın günlerine ait çalışma saatleri
   * Array uzunluğu: 7 (Pazar=0, Pazartesi=1, ..., Cumartesi=6)
   */
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayWorkingHoursDto)
  workingHours: DayWorkingHoursDto[];
}
