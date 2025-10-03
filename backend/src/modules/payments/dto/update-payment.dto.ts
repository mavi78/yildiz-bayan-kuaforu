import {
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import { PaymentMethod } from "@prisma/client";

/**
 * Ödeme Güncelleme DTO
 *
 * Mevcut ödeme kaydını güncellemek için kullanılır.
 * Veresiye kapatma veya vade uzatma işlemlerinde kullanılabilir.
 *
 * @class UpdatePaymentDto
 */
export class UpdatePaymentDto {
  /**
   * Ödeme tutarı (opsiyonel)
   *
   * @example 175.00
   */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  /**
   * Ödeme yöntemi (opsiyonel)
   *
   * @example "CASH"
   */
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  /**
   * Ödeme tarihi (opsiyonel)
   *
   * @example "2025-10-03T14:30:00.000Z"
   */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  /**
   * Veresiye vade tarihi (opsiyonel, null olabilir - veresiye kapatırken)
   *
   * @example "2025-11-15"
   */
  @IsOptional()
  @IsDateString()
  veresiyeDueDate?: string | null;

  /**
   * Veresiye teminat bilgisi (opsiyonel, null olabilir)
   *
   * @example "Çek: 789012"
   */
  @IsOptional()
  @IsString()
  veresiyeCollateral?: string | null;

  /**
   * Veresiye sorumlu personel (opsiyonel, null olabilir)
   *
   * @example "Mehmet Demir (Sorumlu)"
   */
  @IsOptional()
  @IsString()
  veresiyeResponsible?: string | null;
}
