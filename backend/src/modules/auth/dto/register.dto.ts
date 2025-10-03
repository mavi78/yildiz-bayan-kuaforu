import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { RegisterInput } from "@usecases/auth/register.usecase";

/**
 * Kullanıcı kayıt isteği DTO'su
 */
export class RegisterDto implements RegisterInput {
  @IsString()
  @IsNotEmpty({ message: "Davet token'ı zorunludur" })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: "Ad zorunludur" })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: "Soyad zorunludur" })
  lastName!: string;

  @IsString()
  @Matches(/^\+90[1-9][0-9]{9}$/u, {
    message: "Telefon numarası +90 ile başlamalı ve 11 haneli olmalıdır",
  })
  phone!: string;

  @IsString()
  @MinLength(8, { message: "Şifre en az 8 karakter olmalıdır" })
  password!: string;
}
