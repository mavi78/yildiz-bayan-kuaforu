import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Role, CustomerType } from "@prisma/client";
import { CustomerService } from "@services/customer.service";
import { ConvertGuestToRegisteredUsecase } from "@usecases/customers/convert-guest-to-registered.usecase";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { RolesGuard } from "@common/guards/roles.guard";
import { CreateGuestCustomerDto, UpdateCustomerDto, InviteGuestDto } from "./dto";

interface JwtUser {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Müşteri yönetimi endpoint'leri
 *
 * Bu controller aşağıdaki işlevleri sağlar:
 * - Manuel misafir müşteri oluşturma (Staff/Admin)
 * - Müşteri listesi ve detay görüntüleme
 * - Müşteri bilgilerini güncelleme
 * - Misafir müşteriyi kayıtlı müşteriye dönüştürme (davetiye gönderme)
 */
@ApiTags("customers")
@Controller("customers")
export class CustomersController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly convertGuestUsecase: ConvertGuestToRegisteredUsecase,
  ) {}

  /**
   * Manuel misafir müşteri oluşturma (Staff/Admin)
   *
   * Walk-in müşteriler için manuel misafir kaydı oluşturur.
   *
   * @param body - Misafir müşteri bilgileri
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Oluşturulan müşteri
   */
  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Manuel misafir müşteri oluştur (Staff/Admin)" })
  @ApiResponse({ status: 201, description: "Müşteri başarıyla oluşturuldu" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  @ApiResponse({ status: 403, description: "Yetkisiz erişim" })
  async createGuestCustomer(@Body() body: CreateGuestCustomerDto, @CurrentUser() user: JwtUser) {
    const customer = await this.customerService.createGuest({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      notes: body.notes,
    });

    return {
      id: customer.id,
      type: customer.type,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      birthDate: customer.birthDate,
      notes: customer.notes,
      totalAppointments: customer.totalAppointments,
      totalSpent: customer.totalSpent,
      createdAt: customer.createdAt,
    };
  }

  /**
   * Müşteri listesi (filtreleme ve arama)
   *
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @param type - Filtre: müşteri tipi (REGISTERED, GUEST)
   * @param search - Arama: ad, soyad, telefon, email
   * @param limit - Sayfalama: limit (varsayılan: 50)
   * @param offset - Sayfalama: offset (varsayılan: 0)
   * @returns Müşteri listesi
   */
  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Müşteri listesi (filtreleme ve arama)" })
  @ApiResponse({ status: 200, description: "Müşteri listesi döndürüldü" })
  @ApiResponse({ status: 403, description: "Yetkisiz erişim" })
  async getCustomers(
    @CurrentUser() user: JwtUser,
    @Query("type") type?: CustomerType,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const customers = await this.customerService.findAll({
      type,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      data: customers.map(c => ({
        id: c.id,
        type: c.type,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        birthDate: c.birthDate,
        totalAppointments: c.totalAppointments,
        totalSpent: c.totalSpent,
        createdAt: c.createdAt,
      })),
      meta: {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /**
   * Müşteri detayı
   *
   * @param id - Müşteri ID
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Müşteri detayı (ilişkilerle birlikte)
   */
  @Get(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Müşteri detayı" })
  @ApiResponse({ status: 200, description: "Müşteri detayı döndürüldü" })
  @ApiResponse({ status: 404, description: "Müşteri bulunamadı" })
  @ApiResponse({ status: 403, description: "Yetkisiz erişim" })
  async getCustomerById(@Param("id") id: string, @CurrentUser() user: JwtUser) {
    const customer: any = await this.customerService.findById(id, true);

    return {
      id: customer.id,
      type: customer.type,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      birthDate: customer.birthDate,
      notes: customer.notes,
      totalAppointments: customer.totalAppointments,
      totalSpent: customer.totalSpent,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      // İlişkiler (varsa)
      ...(customer.appointments && { appointments: customer.appointments }),
      ...(customer.reviews && { reviews: customer.reviews }),
    };
  }

  /**
   * Müşteri bilgilerini güncelleme
   *
   * @param id - Müşteri ID
   * @param body - Güncellenecek alanlar
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Güncellenmiş müşteri
   */
  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Müşteri bilgilerini güncelle" })
  @ApiResponse({ status: 200, description: "Müşteri başarıyla güncellendi" })
  @ApiResponse({ status: 400, description: "Geçersiz istek" })
  @ApiResponse({ status: 404, description: "Müşteri bulunamadı" })
  @ApiResponse({ status: 403, description: "Yetkisiz erişim" })
  async updateCustomer(
    @Param("id") id: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() user: JwtUser,
  ) {
    const customer = await this.customerService.update(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      notes: body.notes,
    });

    return {
      id: customer.id,
      type: customer.type,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      birthDate: customer.birthDate,
      notes: customer.notes,
      totalAppointments: customer.totalAppointments,
      totalSpent: customer.totalSpent,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Misafir müşteriyi kayıtlı müşteriye dönüştürme (davetiye gönderme)
   *
   * Misafir müşteriye davetiye gönderir. Müşteri davetiyeyi kabul edip kaydolduğunda
   * otomatik olarak kayıtlı müşteriye dönüşür.
   *
   * @param id - Müşteri ID (GUEST olmalı)
   * @param body - Davet bilgileri
   * @param user - JWT'den çıkarılan kullanıcı bilgisi
   * @returns Davet bilgileri (link, email body)
   */
  @Post(":id/invite")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Misafir müşteriyi kayıtlı müşteriye dönüştürme (davetiye gönder)",
  })
  @ApiResponse({ status: 200, description: "Davetiye başarıyla oluşturuldu" })
  @ApiResponse({
    status: 400,
    description: "Geçersiz istek (müşteri zaten kayıtlı veya email yok)",
  })
  @ApiResponse({ status: 404, description: "Müşteri bulunamadı" })
  @ApiResponse({ status: 403, description: "Yetkisiz erişim" })
  async inviteGuest(
    @Param("id") id: string,
    @Body() body: InviteGuestDto,
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.convertGuestUsecase.execute({
      customerId: id,
      inviterId: user.userId,
      inviterName: body.inviterName,
      salonName: body.salonName,
      baseUrl: body.baseUrl,
    });

    return {
      invitationId: result.invitationId,
      token: result.token,
      invitationLink: result.invitationLink,
      emailBody: result.emailBody,
    };
  }
}
