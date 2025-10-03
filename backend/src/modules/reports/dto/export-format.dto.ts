import { IsEnum } from 'class-validator';

/**
 * Export Format DTO
 *
 * Rapor export formatını belirler (CSV veya XLSX).
 *
 * @class ExportFormatDto
 */
export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

/**
 * Export Format Query DTO
 *
 * Query parametresinde format belirtilmesi için kullanılır.
 *
 * Örnek: GET /reports/export?format=xlsx
 */
export class ExportFormatQueryDto {
  /**
   * Export formatı
   * Değerler: csv | xlsx
   */
  @IsEnum(ExportFormat)
  format: ExportFormat;
}
