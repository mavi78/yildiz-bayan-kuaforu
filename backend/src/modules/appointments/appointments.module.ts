import { Module } from "@nestjs/common";
import { SharedModule } from "@modules/shared";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentActionsController } from "./appointment-actions.controller";
import { CreateGuestAppointmentUsecase } from "@usecases/appointments/create-guest-appointment.usecase";
import { CreateRegisteredAppointmentUsecase } from "@usecases/appointments/create-registered-appointment.usecase";
import { ApproveAppointmentUsecase } from "@usecases/appointments/approve-appointment.usecase";

/**
 * AppointmentsModule
 *
 * Randevu yönetimi modülü. Misafir ve kayıtlı müşteri randevu oluşturma,
 * listeleme, detay görüntüleme, takip kodu işlemleri ve randevu aksiyonlarını
 * (onaylama, iptal, tamamlama, not ekleme) sağlar.
 *
 * @module AppointmentsModule
 */
@Module({
  imports: [SharedModule],
  controllers: [AppointmentsController, AppointmentActionsController],
  providers: [
    CreateGuestAppointmentUsecase,
    CreateRegisteredAppointmentUsecase,
    ApproveAppointmentUsecase,
  ],
  exports: [
    CreateGuestAppointmentUsecase,
    CreateRegisteredAppointmentUsecase,
    ApproveAppointmentUsecase,
  ],
})
export class AppointmentsModule {}
