import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PaymentService } from "../../services/payment.service";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaymentMethod } from "@prisma/client";

/**
 * Payments Controller
 *
 * Offline ödeme yönetimi için HTTP endpoint'leri sağlar.
 *
 * Endpoint'ler:
 * - POST /payments - Ödeme kaydı oluştur (Staff/Admin)
 * - GET /payments - Ödeme listesi (role-based filtering)
 * - GET /payments/veresiye - Veresiye ödemeler listesi (Staff/Admin)
 * - PATCH /payments/:id - Ödeme güncelle (Staff/Admin)
 *
 * İş Kuralları:
 * - VERESIYE ödemeler için vade, teminat, sorumlu zorunlu (FR-040)
 * - Veresiye hatırlatmaları: -3 gün, 0 gün, +N gün (FR-042a)
 * - Ödeme create/update audit log tetikler (FR-039a)
 *
 * @class PaymentsController
 */
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Yeni ödeme kaydı oluşturur (Staff/Admin only)
   *
   * POST /payments
   *
   * İş Kuralları:
   * - Randevu başına sadece 1 ödeme kaydı (unique constraint)
   * - VERESIYE ise: dueDate, collateral, responsible zorunlu (FR-040)
   * - Amount > 0 kontrolü
   *
   * @param dto - Ödeme verisi
   * @param user - JWT token'dan alınan mevcut kullanıcı
   * @returns Oluşturulan ödeme
   *
   * @example
   * ```bash
   * POST /payments
   * Body:
   * {
   *   "appointmentId": "apt-id-123",
   *   "amount": 150.00,
   *   "method": "CASH",
   *   "paidAt": "2025-10-03T14:30:00.000Z"
   * }
   * ```
   */
  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("STAFF", "ADMIN")
  @HttpCode(HttpStatus.CREATED)
  async recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser() user: any) {
    const payment = await this.paymentService.recordPayment({
      appointmentId: dto.appointmentId,
      amount: dto.amount,
      method: dto.method,
      paidAt: new Date(dto.paidAt),
      recordedById: user.userId,
      veresiyeDueDate: dto.veresiyeDueDate ? new Date(dto.veresiyeDueDate) : undefined,
      veresiyeCollateral: dto.veresiyeCollateral,
      veresiyeResponsible: dto.veresiyeResponsible,
    });

    // TODO: Audit log entegrasyonu eklenecek (FR-039a)
    // await this.auditLogService.log({
    //   action: 'payment.create',
    //   actorId: user.userId,
    //   targetEntity: 'Payment',
    //   targetId: payment.id,
    //   details: { amount: payment.amount, method: payment.method }
    // });

    return {
      success: true,
      data: payment,
      message: "Ödeme başarıyla kaydedildi.",
    };
  }

  /**
   * Ödeme listesini getirir (role-based filtering)
   *
   * GET /payments?method=CASH&startDate=2025-01-01&endDate=2025-12-31
   *
   * Filtreler:
   * - method: PaymentMethod (CASH, BANK_TRANSFER, POS_CARD, VERESIYE)
   * - startDate: Başlangıç tarihi (ISO 8601)
   * - endDate: Bitiş tarihi (ISO 8601)
   *
   * Role-based access:
   * - ADMIN: Tüm ödemeler
   * - STAFF: Kendi kaydettiği ödemeler (TODO: implement)
   * - CUSTOMER: Kendi randevularına ait ödemeler (TODO: implement)
   *
   * @param method - Ödeme yöntemi filtresi (opsiyonel)
   * @param startDate - Başlangıç tarihi (opsiyonel)
   * @param endDate - Bitiş tarihi (opsiyonel)
   * @param user - JWT token'dan alınan mevcut kullanıcı
   * @returns Ödeme listesi
   *
   * @example
   * ```bash
   * GET /payments?method=VERESIYE&startDate=2025-01-01&endDate=2025-12-31
   * ```
   */
  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("STAFF", "ADMIN", "CUSTOMER")
  async findAll(
    @Query("method") method?: PaymentMethod,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @CurrentUser() user?: any,
  ) {
    // Tarih aralığı filtresi varsa
    if (startDate && endDate) {
      const payments = await this.paymentService.findByDateRange(
        new Date(startDate),
        new Date(endDate),
      );

      // Method filtresi uygula
      const filteredPayments = method
        ? payments.filter((p) => p.method === method)
        : payments;

      return {
        success: true,
        data: filteredPayments,
        count: filteredPayments.length,
      };
    }

    // Sadece method filtresi varsa (TODO: repository'ye method filtreli findMany eklenebilir)
    // Şu an için basit implementasyon
    return {
      success: true,
      data: [],
      message: "Lütfen tarih aralığı belirtin (startDate, endDate).",
    };
  }

  /**
   * Veresiye ödemeleri listeler (Staff/Admin only)
   *
   * GET /payments/veresiye?overdue=true
   *
   * Query parametreleri:
   * - overdue: true ise sadece vadesi geçmişleri getir
   * - upcoming: true ise vadesi yaklaşanları getir (3 gün içinde)
   *
   * @param overdue - Vadesi geçmiş filtresi
   * @param upcoming - Vadesi yaklaşan filtresi
   * @returns Veresiye ödeme listesi
   *
   * @example
   * ```bash
   * GET /payments/veresiye?overdue=true
   * ```
   */
  @Get("veresiye")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("STAFF", "ADMIN")
  async findVeresiye(
    @Query("overdue") overdue?: string,
    @Query("upcoming") upcoming?: string,
  ) {
    let payments;
    let message = "";

    if (overdue === "true") {
      payments = await this.paymentService.findVeresiyeOverdue();
      message = "Vadesi geçmiş veresiye ödemeler.";
    } else if (upcoming === "true") {
      payments = await this.paymentService.findUpcomingVeresiye(3);
      message = "Vadesi yaklaşan veresiye ödemeler (3 gün içinde).";
    } else {
      payments = await this.paymentService.findAllVeresiye();
      message = "Tüm veresiye ödemeler.";
    }

    return {
      success: true,
      data: payments,
      count: payments.length,
      message,
    };
  }

  /**
   * Ödeme bilgilerini günceller (Staff/Admin only)
   *
   * PATCH /payments/:id
   *
   * Kullanım senaryoları:
   * - Veresiye ödemeyi kapatma (method değiştirme)
   * - Vade tarihini uzatma
   * - Tutar düzeltme
   *
   * @param id - Ödeme ID
   * @param dto - Güncellenecek alanlar
   * @param user - JWT token'dan alınan mevcut kullanıcı
   * @returns Güncellenmiş ödeme
   *
   * @example
   * ```bash
   * PATCH /payments/payment-id-123
   * Body:
   * {
   *   "method": "CASH",
   *   "veresiyeDueDate": null,
   *   "veresiyeCollateral": null,
   *   "veresiyeResponsible": null
   * }
   * ```
   */
  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("STAFF", "ADMIN")
  @HttpCode(HttpStatus.OK)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: any,
  ) {
    const payment = await this.paymentService.updatePayment(id, {
      amount: dto.amount,
      method: dto.method,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      veresiyeDueDate: dto.veresiyeDueDate ? new Date(dto.veresiyeDueDate) : null,
      veresiyeCollateral: dto.veresiyeCollateral,
      veresiyeResponsible: dto.veresiyeResponsible,
    });

    // TODO: Audit log entegrasyonu eklenecek (FR-039a)
    // await this.auditLogService.log({
    //   action: 'payment.update',
    //   actorId: user.userId,
    //   targetEntity: 'Payment',
    //   targetId: payment.id,
    //   details: { changes: dto }
    // });

    return {
      success: true,
      data: payment,
      message: "Ödeme başarıyla güncellendi.",
    };
  }

  /**
   * Ödeme istatistiklerini getirir (Admin only)
   *
   * GET /payments/stats/summary
   *
   * İstatistikler:
   * - Ödeme yöntemi dağılımı
   * - Veresiye özeti (toplam, vadesi geçmiş, yaklaşan)
   * - Toplam ödeme tutarı
   *
   * @returns İstatistik bilgisi
   *
   * @example
   * ```bash
   * GET /payments/stats/summary
   * ```
   */
  @Get("stats/summary")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async getStatistics() {
    const [methodDistribution, veresiyeSummary, totalAmount] = await Promise.all([
      this.paymentService.getPaymentMethodDistribution(),
      this.paymentService.getVeresiyeSummary(),
      this.paymentService.getTotalAmount(),
    ]);

    return {
      success: true,
      data: {
        methodDistribution,
        veresiyeSummary,
        totalAmount,
      },
    };
  }
}
