import { IsNotEmpty, IsString, IsOptional, IsDateString } from "class-validator";
import { CreateRegisteredAppointmentInput } from "@usecases/appointments/create-registered-appointment.usecase";

/**
 * Kayıtlı müşteri randevu oluşturma DTO'su
 */
export class CreateRegisteredAppointmentDto implements CreateRegisteredAppointmentInput {
  @IsString()
  @IsNotEmpty({ message: "Müşteri ID zorunludur" })
  customerId!: string;

  @IsString()
  @IsNotEmpty({ message: "Personel ID zorunludur" })
  staffId!: string;

  @IsString()
  @IsNotEmpty({ message: "Hizmet ID zorunludur" })
  serviceId!: string;

  @IsDateString({}, { message: "Geçerli bir tarih giriniz" })
  @IsNotEmpty({ message: "Tarih zorunludur" })
  date!: string;

  @IsString()
  @IsNotEmpty({ message: "Saat zorunludur" })
  time!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
