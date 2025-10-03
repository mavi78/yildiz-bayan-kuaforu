import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppointmentStatus, Prisma, Role } from "@prisma/client";
import { ApproveAppointmentUsecase } from "@usecases/appointments/approve-appointment.usecase";
import { AppointmentService } from "@services/appointment.service";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { RolesGuard } from "@common/guards/roles.guard";
import { ApproveAppointmentDto } from "./dto/approve-appointment.dto";
import { CancelAppointmentDto } from "./dto/cancel-appointment.dto";
import { AddServiceNoteDto } from "./dto/add-service-note.dto";
import { ServiceNoteRepository } from "@repositories/service-note.repository";

interface JwtUser {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Randevu aksiyon endpoint'leri
 *
 * Bu controller randevu üzerinde yapılan aksiyonları yönetir:
 * - Randevu onaylama (Staff/Admin)
 * - Randevu override (Admin, gerekçe ile)
 * - Randevu iptal etme
 * - Randevu tamamlama
 * - Hizmet notu ekleme (Staff/Admin)
 */
@ApiTags("appointment-actions")
@Controller("appointments")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@ApiBearerAuth()
export class AppointmentActionsController {
  constructor(
    private readonly approveAppointmentUsecase: ApproveAppointmentUsecase,
    private readonly appointmentService: AppointmentService,
    private readonly serviceNoteRepository: ServiceNoteRepository,
  ) {}

  /**
   * Randevu onaylama (Staff/Admin)
   *
   * PENDING durumundaki randevuları CONFIRMED durumuna getirir.
   * Çakışma varsa override parametresi ile geçersiz kılınabilir (Admin için).
   *
   * @param id - Randevu ID
   * @param dto - Onay verileri (override, justification)
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Güncellenmiş randevu bilgisi
   */
  @Patch(":id/approve")
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Randevu onaylama (Staff/Admin)" })
  @ApiResponse({ status: 200, description: "Randevu başarıyla onaylandı" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  @ApiResponse({ status: 409, description: "Çakışma hatası" })
  async approveAppointment(
    @Param("id") id: string,
    @Body() dto: ApproveAppointmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    // Override sadece Admin yapabilir
    if (dto.override && user.role !== Role.ADMIN) {
      throw new BadRequestException("Override işlemi sadece Admin tarafından yapılabilir");
    }

    return this.approveAppointmentUsecase.execute({
      appointmentId: id,
      override: dto.override,
      justification: dto.justification,
    });
  }

  /**
   * Randevu override (Admin, gerekçe ile)
   *
   * Çakışmalı randevuları gerekçe ile onaylar.
   * Bu endpoint aslında approve endpoint'inin override parametresi ile aynı işlevi görür.
   *
   * @param id - Randevu ID
   * @param dto - Override verileri (justification zorunlu)
   * @returns Güncellenmiş randevu bilgisi
   */
  @Patch(":id/override")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Randevu override (Admin, gerekçe ile)" })
  @ApiResponse({ status: 200, description: "Randevu başarıyla override edildi" })
  @ApiResponse({ status: 400, description: "Gerekçe eksik" })
  async overrideAppointment(@Param("id") id: string, @Body() dto: ApproveAppointmentDto) {
    if (!dto.justification || dto.justification.trim().length === 0) {
      throw new BadRequestException("Override işlemleri için gerekçe belirtilmelidir");
    }

    return this.approveAppointmentUsecase.execute({
      appointmentId: id,
      override: true,
      justification: dto.justification,
    });
  }

  /**
   * Randevu iptal etme
   *
   * Randevuyu CANCELLED durumuna getirir.
   * Müşteriler sadece kendi randevularını iptal edebilir.
   * Staff/Admin tüm randevuları iptal edebilir.
   *
   * @param id - Randevu ID
   * @param dto - İptal nedeni
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Güncellenmiş randevu bilgisi
   */
  @Patch(":id/cancel")
  @ApiOperation({ summary: "Randevu iptal etme" })
  @ApiResponse({ status: 200, description: "Randevu başarıyla iptal edildi" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  @ApiResponse({ status: 403, description: "Yetki hatası" })
  async cancelAppointment(
    @Param("id") id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    const appointment = await this.appointmentService.findById(id, true);

    // Müşteriler sadece kendi randevularını iptal edebilir
    if (user.role === Role.CUSTOMER) {
      // TODO: Implement proper customer ownership check
      // appointment.customer.userId === user.userId kontrolü yapılmalı
    }

    // Tamamlanmış veya iptal edilmiş randevular iptal edilemez
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        "Tamamlanmış, iptal edilmiş veya gelmemiş randevular iptal edilemez",
      );
    }

    return this.appointmentService.updateStatus(
      id,
      AppointmentStatus.CANCELLED,
      dto.cancellationReason,
    );
  }

  /**
   * Randevu tamamlama
   *
   * Randevuyu COMPLETED durumuna getirir.
   * Sadece Staff/Admin yapabilir.
   *
   * @param id - Randevu ID
   * @returns Güncellenmiş randevu bilgisi
   */
  @Patch(":id/complete")
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Randevu tamamlama (Staff/Admin)" })
  @ApiResponse({ status: 200, description: "Randevu başarıyla tamamlandı" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  async completeAppointment(@Param("id") id: string) {
    const appointment = await this.appointmentService.findById(id);

    // Sadece CONFIRMED randevular tamamlanabilir
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException("Sadece onaylanmış (CONFIRMED) randevular tamamlanabilir");
    }

    return this.appointmentService.updateStatus(id, AppointmentStatus.COMPLETED);
  }

  /**
   * Hizmet notu ekleme (Staff/Admin)
   *
   * Randevuya personel notu ekler.
   * Notlar sadece Admin ve Staff tarafından görülebilir.
   * Maksimum 1000 karakter.
   *
   * @param id - Randevu ID
   * @param dto - Not içeriği
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Oluşturulan not
   */
  @Post(":id/notes")
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Hizmet notu ekleme (Staff/Admin)" })
  @ApiResponse({ status: 201, description: "Not başarıyla eklendi" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  async addServiceNote(
    @Param("id") id: string,
    @Body() dto: AddServiceNoteDto,
    @CurrentUser() user: JwtUser,
  ) {
    // Randevunun var olduğunu kontrol et
    await this.appointmentService.findById(id);

    const noteData: Prisma.ServiceNoteCreateInput = {
      content: dto.content,
      appointment: {
        connect: { id },
      },
      createdBy: {
        connect: { id: user.userId },
      },
    };

    return this.serviceNoteRepository.create(noteData);
  }
}
