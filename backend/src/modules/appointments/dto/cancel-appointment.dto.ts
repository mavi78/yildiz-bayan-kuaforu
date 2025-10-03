import { IsNotEmpty, IsString } from "class-validator";

/**
 * Randevu iptal etme DTO'su
 */
export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty({ message: "İptal nedeni zorunludur" })
  cancellationReason!: string;
}
