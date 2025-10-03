import { IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

/**
 * Ödeme Raporu Filtreleme DTO
 *
 * Admin panelinde ödeme raporlarını filtrelemek için kullanılır.
 *
 * Query parametreleri:
 * - startDate: Başlangıç tarihi (ISO 8601)
 * - endDate: Bitiş tarihi (ISO 8601)
 * - method: Ödeme yöntemi (CASH, BANK_TRANSFER, POS_CARD, VERESIYE)
 * - veresiyeOnly: Sadece veresiye ödemeleri getir (boolean)
 *
 * @class PaymentReportFiltersDto
 */
export class PaymentReportFiltersDto {
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
   * Ödeme yöntemi filtresi
   * Değerler: CASH | BANK_TRANSFER | POS_CARD | VERESIYE
   */
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  /**
   * Sadece veresiye ödemeleri getir
   * true ise method parametresi göz ardı edilir ve sadece VERESIYE ödemeler döner
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  veresiyeOnly?: boolean;
}
