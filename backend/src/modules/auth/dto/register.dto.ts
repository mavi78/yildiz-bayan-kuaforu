import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { RegisterInput } from "@usecases/auth/register.usecase";

/**
 * Kullanıcı kayıt isteği DTO'su
 */
export class RegisterDto implements RegisterInput {
  @ApiProperty({
    description: "Davet token'ı (72 saat geçerli)",
    example: "abc123-def456-ghi789",
  })
  @IsString()
  @IsNotEmpty({ message: "Davet token'ı zorunludur" })
  token!: string;

  @ApiProperty({
    description: "Kullanıcı adı",
    example: "Ayşe",
  })
  @IsString()
  @IsNotEmpty({ message: "Ad zorunludur" })
  firstName!: string;

  @ApiProperty({
    description: "Kullanıcı soyadı",
    example: "Yılmaz",
  })
  @IsString()
  @IsNotEmpty({ message: "Soyad zorunludur" })
  lastName!: string;

  @ApiProperty({
    description: "Telefon numarası (E.164 format, +90 ile başlayan Türkiye numarası)",
    example: "+905551234567",
  })
  @IsString()
  @Matches(/^\+90[1-9][0-9]{9}$/u, {
    message: "Telefon numarası +90 ile başlamalı ve 11 haneli olmalıdır",
  })
  phone!: string;

  @ApiProperty({
    description: "Şifre (minimum 8 karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam)",
    example: "Password123",
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "Şifre en az 8 karakter olmalıdır" })
  password!: string;
}
