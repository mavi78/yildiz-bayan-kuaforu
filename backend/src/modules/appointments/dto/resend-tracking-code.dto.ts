import { IsNotEmpty, IsString } from "class-validator";

/**
 * Takip kodu yeniden gönderme DTO'su
 */
export class ResendTrackingCodeDto {
  @IsString()
  @IsNotEmpty({ message: "Telefon numarası zorunludur" })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "Takip kodu zorunludur" })
  trackingCode!: string;
}
