import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { LoginInput } from "@usecases/auth/login.usecase";

/**
 * Kullanıcı giriş isteği DTO'su
 */
export class LoginDto implements LoginInput {
  @ApiProperty({
    description: "Email adresi veya telefon numarası (+90XXXXXXXXXX)",
    example: "ayse@example.com",
  })
  @IsString()
  @IsNotEmpty({ message: "Email veya telefon zorunludur" })
  emailOrPhone!: string;

  @ApiProperty({
    description: "Kullanıcı şifresi",
    example: "Password123",
  })
  @IsString()
  @IsNotEmpty({ message: "Şifre zorunludur" })
  password!: string;
}
