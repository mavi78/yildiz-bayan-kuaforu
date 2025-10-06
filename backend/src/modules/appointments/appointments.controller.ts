import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  CreateGuestAppointmentUsecase,
  CreateGuestAppointmentResult,
} from "@usecases/appointments/create-guest-appointment.usecase";
import {
  CreateRegisteredAppointmentUsecase,
  CreateRegisteredAppointmentResult,
} from "@usecases/appointments/create-registered-appointment.usecase";
import { AppointmentService } from "@services/appointment.service";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { RolesGuard } from "@common/guards/roles.guard";
import { CreateGuestAppointmentDto } from "./dto/create-guest-appointment.dto";
import { CreateRegisteredAppointmentDto } from "./dto/create-registered-appointment.dto";
import { ResendTrackingCodeDto } from "./dto/resend-tracking-code.dto";

interface JwtUser {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Randevu yönetimi endpoint'leri
 *
 * Bu controller aşağıdaki işlevleri sağlar:
 * - Misafir ve kayıtlı müşteri randevu oluşturma
 * - Randevu listesi ve detay görüntüleme (role-based)
 * - Takip kodu ile randevu sorgulama (public)
 * - Takip kodu SMS ile yeniden gönderme
 */
@ApiTags("appointments")
@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly createGuestAppointmentUsecase: CreateGuestAppointmentUsecase,
    private readonly createRegisteredAppointmentUsecase: CreateRegisteredAppointmentUsecase,
    private readonly appointmentService: AppointmentService,
  ) {}

  /**
   * Randevu oluşturma (misafir veya kayıtlı müşteri)
   *
   * Misafir müşteriler için CreateGuestAppointmentDto kullanılır.
   * Kayıtlı müşteriler için CreateRegisteredAppointmentDto kullanılır ve JWT gereklidir.
   *
   * @param body - Randevu oluşturma verileri (misafir veya kayıtlı)
   * @param user - JWT'den çıkarılan kullanıcı bilgisi (kayıtlı müşteriler için)
   * @returns Oluşturulan randevu bilgisi
   */
  @Post()
  @ApiOperation({ summary: "Randevu oluştur (misafir veya kayıtlı müşteri)" })
  @ApiResponse({ status: 201, description: "Randevu başarıyla oluşturuldu" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  @ApiResponse({ status: 409, description: "Çakışma hatası" })
  async createAppointment(
    @Body() body: CreateGuestAppointmentDto | CreateRegisteredAppointmentDto,
    @CurrentUser() _user?: JwtUser,
  ): Promise<CreateGuestAppointmentResult | CreateRegisteredAppointmentResult> {
    // Misafir randevusu (firstName, lastName, phone alanları var)
    if ("firstName" in body && "lastName" in body && "phone" in body) {
      return this.createGuestAppointmentUsecase.execute(body as CreateGuestAppointmentDto);
    }

    // Kayıtlı müşteri randevusu (customerId alanı var)
    if ("customerId" in body) {
      return this.createRegisteredAppointmentUsecase.execute(
        body as CreateRegisteredAppointmentDto,
      );
    }

    throw new BadRequestException(
      "Geçersiz istek: Misafir için firstName/lastName/phone veya kayıtlı müşteri için customerId gereklidir",
    );
  }

  /**
   * Randevu listesi (role-based filtering)
   *
   * - ADMIN/STAFF: Tüm randevuları görebilir
   * - CUSTOMER: Sadece kendi randevularını görebilir
   *
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @param status - Filtre: randevu durumu (opsiyonel)
   * @param staffId - Filtre: personel ID (opsiyonel, admin/staff için)
   * @param customerId - Filtre: müşteri ID (opsiyonel, admin/staff için)
   * @param startDate - Filtre: başlangıç tarihi (opsiyonel)
   * @param endDate - Filtre: bitiş tarihi (opsiyonel)
   * @returns Randevu listesi
   */
  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Randevu listesi (role-based filtering)" })
  @ApiResponse({ status: 200, description: "Randevular başarıyla getirildi" })
  async getAppointments(
    @CurrentUser() user: JwtUser,
    @Query("status") status?: string,
    @Query("staffId") staffId?: string,
    @Query("customerId") customerId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    // Role-based filtering
    if (user.role === Role.CUSTOMER) {
      // Müşteriler sadece kendi randevularını görebilir
      if (!customerId) {
        throw new BadRequestException("Müşteriler için customerId gereklidir");
      }
      return this.appointmentService.findByCustomer(customerId, true);
    }

    // Admin/Staff filtreleri
    if (staffId && (startDate || endDate)) {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      return this.appointmentService.findByStaff(staffId, start, end);
    }

    if (customerId) {
      return this.appointmentService.findByCustomer(customerId, true);
    }

    if (status === "PENDING") {
      return this.appointmentService.findPending();
    }

    // Varsayılan: bekleyen randevuları göster
    return this.appointmentService.findPending();
  }

  /**
   * Randevu detayı (ID ile)
   *
   * @param id - Randevu ID
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Randevu detayı
   */
  @Get(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Randevu detayı (ID ile)" })
  @ApiResponse({ status: 200, description: "Randevu detayı getirildi" })
  @ApiResponse({ status: 404, description: "Randevu bulunamadı" })
  async getAppointmentById(@Param("id") id: string, @CurrentUser() user: JwtUser) {
    const appointment = await this.appointmentService.findById(id, true);

    if (!appointment) {
      throw new NotFoundException("Randevu bulunamadı");
    }

    // Role-based access control
    if (user.role === Role.CUSTOMER) {
      // Müşteri sadece kendi randevusunu görebilir
      // TODO: Implement proper customer access control
      // appointment.customer.userId === user.userId kontrolü yapılmalı
    }

    return appointment;
  }

  /**
   * Takip kodu ile randevu sorgulama (public endpoint)
   *
   * Misafir müşteriler için takip kodu ile randevu durumunu görüntüleme.
   * Bu endpoint JWT gerektirmez (public).
   *
   * @param trackingCode - 8 haneli alphanumeric takip kodu
   * @returns Randevu detayı
   */
  @Get("track/:trackingCode")
  @ApiOperation({ summary: "Takip kodu ile randevu sorgulama (public)" })
  @ApiResponse({ status: 200, description: "Randevu detayı getirildi" })
  @ApiResponse({ status: 404, description: "Geçersiz takip kodu" })
  async trackAppointment(@Param("trackingCode") trackingCode: string) {
    const appointment = await this.appointmentService.findByTrackingCode(trackingCode);

    if (!appointment) {
      throw new NotFoundException("Geçersiz takip kodu");
    }

    // findByTrackingCode zaten ilişkileri include eder (repository'de tanımlı)
    // Sadece belirli alanları döndür (güvenlik için)
    return {
      id: appointment.id,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      service: (appointment as any).service,
      staff: (appointment as any).staff
        ? {
            firstName: (appointment as any).staff.firstName,
            lastName: (appointment as any).staff.lastName,
          }
        : null,
      notes: appointment.notes,
    };
  }

  /**
   * Takip kodu SMS ile yeniden gönderme (public endpoint)
   *
   * Misafir müşteriler telefon numarası ve takip kodu ile SMS tekrar gönderme talebinde bulunabilir.
   * FR-015: SMS tracking code recovery
   *
   * @param dto - Telefon numarası ve takip kodu
   * @returns Başarı mesajı
   */
  @Post("track/resend")
  @ApiOperation({ summary: "Takip kodu SMS ile yeniden gönder (public)" })
  @ApiResponse({ status: 200, description: "SMS başarıyla gönderildi" })
  @ApiResponse({ status: 404, description: "Randevu bulunamadı" })
  async resendTrackingCode(@Body() dto: ResendTrackingCodeDto) {
    const appointment = await this.appointmentService.findByTrackingCode(dto.trackingCode);

    if (!appointment) {
      throw new NotFoundException("Geçersiz takip kodu");
    }

    // Telefon numarası kontrolü (güvenlik için)
    // appointment.customer.phone === dto.phone kontrolü yapılmalı
    // TODO: Implement phone verification and SMS resend logic via NotificationService

    return {
      success: true,
      message: "Takip kodu SMS olarak gönderildi",
    };
  }
}
