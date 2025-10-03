import {
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  Min,
  ValidateIf,
} from "class-validator";
import { PaymentMethod } from "@prisma/client";

/**
 * Ödeme Kaydetme DTO
 *
 * Randevu tamamlandıktan sonra ödeme bilgilerini kaydetmek için kullanılır.
 * VERESIYE ödemeler için ek alanlar zorunludur (FR-040).
 *
 * @class RecordPaymentDto
 */
export class RecordPaymentDto {
  /**
   * Randevu ID
   *
   * @example "appointment-id-123"
   */
  @IsString()
  appointmentId: string;

  /**
   * Ödeme tutarı (pozitif sayı)
   *
   * @example 150.50
   */
  @IsNumber()
  @Min(0.01)
  amount: number;

  /**
   * Ödeme yöntemi
   *
   * @example "CASH"
   */
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  /**
   * Ödeme tarihi (ISO 8601)
   *
   * @example "2025-10-03T14:30:00.000Z"
   */
  @IsDateString()
  paidAt: string;

  /**
   * Veresiye vade tarihi (VERESIYE için zorunlu)
   *
   * @example "2025-11-03"
   */
  @ValidateIf(o => o.method === PaymentMethod.VERESIYE)
  @IsDateString()
  veresiyeDueDate?: string;

  /**
   * Veresiye teminat bilgisi (VERESIYE için zorunlu)
   *
   * @example "Çek: 123456, Banka: XYZ"
   */
  @ValidateIf(o => o.method === PaymentMethod.VERESIYE)
  @IsString()
  veresiyeCollateral?: string;

  /**
   * Veresiye sorumlu personel (VERESIYE için zorunlu)
   *
   * @example "Ahmet Yılmaz (Müdür)"
   */
  @ValidateIf(o => o.method === PaymentMethod.VERESIYE)
  @IsString()
  veresiyeResponsible?: string;
}
