import { IsNotEmpty, IsString } from "class-validator";
import { LoginInput } from "@usecases/auth/login.usecase";

/**
 * Kullanıcı giriş isteği DTO'su
 */
export class LoginDto implements LoginInput {
  @IsString()
  @IsNotEmpty({ message: "Email veya telefon zorunludur" })
  emailOrPhone!: string;

  @IsString()
  @IsNotEmpty({ message: "Şifre zorunludur" })
  password!: string;
}
