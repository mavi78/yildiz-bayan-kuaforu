import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "@prisma/client";

/**
 * Davet oluşturma isteği DTO'su
 */
export class CreateInvitationDto {
  @IsEmail({}, { message: "Geçerli bir email adresi girin" })
  email!: string;

  @IsEnum(Role, { message: "Rol değeri geçersiz" })
  role!: Role;

  @IsOptional()
  @IsString({ message: "Misafir müşteri ID'si string olmalıdır" })
  guestCustomerId?: string;
}
