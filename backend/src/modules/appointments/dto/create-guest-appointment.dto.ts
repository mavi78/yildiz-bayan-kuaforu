import { IsNotEmpty, IsString, IsOptional, IsDateString } from "class-validator";
import { CreateGuestAppointmentInput } from "@usecases/appointments/create-guest-appointment.usecase";

/**
 * Misafir randevu oluşturma DTO'su
 */
export class CreateGuestAppointmentDto implements CreateGuestAppointmentInput {
  @IsString()
  @IsNotEmpty({ message: "Ad zorunludur" })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: "Soyad zorunludur" })
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "Telefon zorunludur" })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "Hizmet ID zorunludur" })
  serviceId!: string;

  @IsString()
  @IsNotEmpty({ message: "Personel ID zorunludur" })
  staffId!: string;

  @IsDateString({}, { message: "Geçerli bir tarih giriniz" })
  @IsNotEmpty({ message: "Tarih zorunludur" })
  date!: string;

  @IsString()
  @IsNotEmpty({ message: "Saat zorunludur" })
  time!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsDateString({}, { message: "Geçerli bir doğum tarihi giriniz" })
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
