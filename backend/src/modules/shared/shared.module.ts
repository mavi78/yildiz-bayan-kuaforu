import { Global, Module } from "@nestjs/common";
import { PrismaService } from "@common/prisma.service";
import { RedisService } from "@common/redis.service";
import { UserRepository } from "@repositories/user.repository";
import { InvitationRepository } from "@repositories/invitation.repository";
import { CustomerRepository } from "@repositories/customer.repository";
import { ServiceRepository } from "@repositories/service.repository";
import { WorkingHoursRepository } from "@repositories/working-hours.repository";
import { SpecialWorkingDayRepository } from "@repositories/special-working-day.repository";
import { AppointmentRepository } from "@repositories/appointment.repository";
import { ServiceNoteRepository } from "@repositories/service-note.repository";
import { PaymentRepository } from "@repositories/payment.repository";
import { ReviewRepository } from "@repositories/review.repository";
import { NotificationRepository } from "@repositories/notification.repository";
import { AuditLogRepository } from "@repositories/audit-log.repository";
import { InvitationService } from "@services/invitation.service";
import { CustomerService } from "@services/customer.service";
import { AppointmentService } from "@services/appointment.service";
import { PaymentService } from "@services/payment.service";
import { ReviewService } from "@services/review.service";
import { NotificationService } from "@services/notifications/notification.service";
import { BcryptService } from "@services/bcrypt.service";

/**
 * SharedModule
 *
 * Uygulamanın farklı modüllerinde paylaşılan altyapı servislerini,
 * repository katmanını ve domain servislerini sağlar.
 *
 * @module SharedModule
 */
@Global()
@Module({
  providers: [
    PrismaService,
    RedisService,
    BcryptService,
    UserRepository,
    InvitationRepository,
    CustomerRepository,
    ServiceRepository,
    WorkingHoursRepository,
    SpecialWorkingDayRepository,
    AppointmentRepository,
    ServiceNoteRepository,
    PaymentRepository,
    ReviewRepository,
    NotificationRepository,
    AuditLogRepository,
    InvitationService,
    CustomerService,
    AppointmentService,
    PaymentService,
    ReviewService,
    NotificationService,
  ],
  exports: [
    PrismaService,
    RedisService,
    BcryptService,
    UserRepository,
    InvitationRepository,
    CustomerRepository,
    ServiceRepository,
    WorkingHoursRepository,
    SpecialWorkingDayRepository,
    AppointmentRepository,
    ServiceNoteRepository,
    PaymentRepository,
    ReviewRepository,
    NotificationRepository,
    AuditLogRepository,
    InvitationService,
    CustomerService,
    AppointmentService,
    PaymentService,
    ReviewService,
    NotificationService,
  ],
})
export class SharedModule {}
