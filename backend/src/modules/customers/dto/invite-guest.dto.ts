import { IsString, IsNotEmpty, IsOptional, IsUrl } from "class-validator";

/**
 * Misafir müşteriyi davet etme DTO
 *
 * POST /customers/:id/invite
 * Misafir müşteriyi kayıtlı müşteriye dönüştürmek için davetiye gönderir.
 *
 * @class InviteGuestDto
 */
export class InviteGuestDto {
  /**
   * Davet eden kişinin adı (opsiyonel, default: "Yıldız Bayan Kuaförü")
   * @example 'Admin Ayşe'
   */
  @IsString()
  @IsOptional()
  inviterName?: string;

  /**
   * Salon adı (opsiyonel, default: "Yıldız Bayan Kuaförü")
   * @example 'Yıldız Bayan Kuaförü'
   */
  @IsString()
  @IsOptional()
  salonName?: string;

  /**
   * Frontend base URL (opsiyonel, kayıt linkini oluşturmak için)
   * @example 'https://yildiz-kuafor.com'
   */
  @IsUrl()
  @IsOptional()
  baseUrl?: string;
}
