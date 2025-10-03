import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString } from "class-validator";

/**
 * Misafir müşteri oluşturma DTO
 *
 * Staff/Admin tarafından manuel misafir müşteri oluşturmak için kullanılır.
 * POST /customers
 *
 * @class CreateGuestCustomerDto
 */
export class CreateGuestCustomerDto {
  /**
   * Müşteri adı
   * @example 'Ayşe'
   */
  @IsString()
  @IsNotEmpty()
  firstName: string;

  /**
   * Müşteri soyadı
   * @example 'Yılmaz'
   */
  @IsString()
  @IsNotEmpty()
  lastName: string;

  /**
   * Telefon numarası (E.164 formatı: +90XXXXXXXXXX)
   * @example '+905551234567'
   */
  @IsString()
  @IsNotEmpty()
  phone: string;

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
