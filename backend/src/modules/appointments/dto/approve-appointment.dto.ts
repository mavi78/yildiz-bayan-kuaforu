import { IsBoolean, IsOptional, IsString } from "class-validator";
import { ApproveAppointmentInput } from "@usecases/appointments/approve-appointment.usecase";

/**
 * Randevu onaylama DTO'su
 */
export class ApproveAppointmentDto implements Omit<ApproveAppointmentInput, "appointmentId"> {
  @IsBoolean()
  @IsOptional()
  override?: boolean;

  @IsString()
  @IsOptional()
  justification?: string;
}
