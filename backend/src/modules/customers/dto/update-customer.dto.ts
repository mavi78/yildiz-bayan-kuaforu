import { IsString, IsOptional, IsEmail, IsDateString } from "class-validator";

/**
 * Müşteri güncelleme DTO
 *
 * PATCH /customers/:id
 *
 * @class UpdateCustomerDto
 */
export class UpdateCustomerDto {
  /**
   * Müşteri adı (opsiyonel)
   * @example 'Ayşe'
   */
  @IsString()
  @IsOptional()
  firstName?: string;

  /**
   * Müşteri soyadı (opsiyonel)
   * @example 'Yılmaz'
   */
  @IsString()
  @IsOptional()
  lastName?: string;

  /**
   * Telefon numarası (E.164 formatı: +90XXXXXXXXXX, opsiyonel)
   * @example '+905551234567'
   */
  @IsString()
  @IsOptional()
  phone?: string;

  /**
   * Email adresi (opsiyonel)
   * @example 'ayse@example.com'
   */
  @IsEmail()
  @IsOptional()
  email?: string;

  /**
   * Doğum tarihi (ISO 8601 formatı, opsiyonel)
   * @example '1990-05-15'
   */
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  /**
   * Müşteri notları (staff tarafından eklenebilir, opsiyonel)
   * @example 'Saç boyası hassasiyeti var'
   */
  @IsString()
  @IsOptional()
  notes?: string;
}
