import { Controller, Get, Query, UseGuards, Res, HttpCode, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ReportsService } from "../../services/reports.service";
import { AppointmentReportFiltersDto, PaymentReportFiltersDto, ExportFormatQueryDto } from "./dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

/**
 * Reports Controller
 *
 * Raporlama ve veri export işlemleri için HTTP endpoint'leri sağlar.
 *
 * Endpoint'ler:
 * - GET /reports/appointments - Randevu raporu (filtrelenmiş liste)
 * - GET /reports/payments - Ödeme raporu (Admin only)
 * - GET /reports/export - Rapor export (CSV/XLSX, Admin only)
 *
 * İş Kuralları:
 * - Tüm raporlar Admin erişimi gerektirir
 * - Export işlemleri memory-efficient streaming kullanır (büyük veri setleri için)
 * - CSV export UTF-8 BOM içerir (Excel uyumluluğu için)
 *
 * @class ReportsController
 */
@Controller("reports")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Randevu raporunu filtrelerle getirir (Admin only)
   *
   * GET /reports/appointments?startDate=2025-01-01&endDate=2025-12-31&status=CONFIRMED
   *
   * Query parametreleri:
   * - startDate: Başlangıç tarihi (ISO 8601, optional)
   * - endDate: Bitiş tarihi (ISO 8601, optional)
   * - status: Randevu durumu (optional)
   * - staffId: Personel ID filtresi (optional)
   * - serviceId: Hizmet ID filtresi (optional)
   *
   * @param filters - Rapor filtreleri
   * @returns Randevu listesi
   *
   * @example
   * ```bash
   * GET /reports/appointments?startDate=2025-01-01&endDate=2025-01-31&status=COMPLETED
   * Authorization: Bearer <admin-token>
   * ```
   */
  @Get("appointments")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async getAppointmentsReport(@Query() filters: AppointmentReportFiltersDto) {
    const appointments = await this.reportsService.getAppointmentsReport(filters);
    return {
      success: true,
      data: appointments,
      count: appointments.length,
    };
  }

  /**
   * Ödeme raporunu filtrelerle getirir (Admin only)
   *
   * GET /reports/payments?startDate=2025-01-01&method=VERESIYE
   *
   * Query parametreleri:
   * - startDate: Başlangıç tarihi (ISO 8601, optional)
   * - endDate: Bitiş tarihi (ISO 8601, optional)
   * - method: Ödeme yöntemi (optional)
   * - veresiyeOnly: Sadece veresiye ödemeler (boolean, optional)
   *
   * @param filters - Ödeme rapor filtreleri
   * @returns Ödeme listesi
   *
   * @example
   * ```bash
   * GET /reports/payments?veresiyeOnly=true
   * Authorization: Bearer <admin-token>
   * ```
   */
  @Get("payments")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async getPaymentsReport(@Query() filters: PaymentReportFiltersDto) {
    const payments = await this.reportsService.getPaymentsReport(filters);
    return {
      success: true,
      data: payments,
      count: payments.length,
    };
  }

  /**
   * Randevu raporunu CSV veya XLSX formatında export eder (Admin only)
   *
   * GET /reports/export?format=xlsx&startDate=2025-01-01&endDate=2025-12-31
   *
   * Query parametreleri:
   * - format: Export formatı (csv | xlsx, required)
   * - startDate, endDate, status, staffId, serviceId: Rapor filtreleri (optional)
   *
   * Response:
   * - Content-Type: text/csv veya application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   * - Content-Disposition: attachment; filename="randevular.{format}"
   *
   * Not: CSV export UTF-8 BOM içerir (Excel'in Türkçe karakterleri doğru göstermesi için)
   *
   * @param formatQuery - Export formatı (csv | xlsx)
   * @param filters - Randevu rapor filtreleri
   * @param res - Express Response nesnesi (file download için)
   *
   * @example
   * ```bash
   * GET /reports/export?format=xlsx&startDate=2025-01-01&status=COMPLETED
   * Authorization: Bearer <admin-token>
   * # Browser'da dosya indirme başlar: randevular.xlsx
   * ```
   */
  @Get("export")
  @Roles("ADMIN")
  async exportReport(
    @Query() formatQuery: ExportFormatQueryDto,
    @Query() filters: AppointmentReportFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.reportsService.exportAppointmentsReport(filters, formatQuery.format, res);
  }

  /**
   * Ödeme raporunu CSV veya XLSX formatında export eder (Admin only)
   *
   * GET /reports/export/payments?format=csv&veresiyeOnly=true
   *
   * Query parametreleri:
   * - format: Export formatı (csv | xlsx, required)
   * - startDate, endDate, method, veresiyeOnly: Ödeme rapor filtreleri (optional)
   *
   * Response:
   * - Content-Type: text/csv veya application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   * - Content-Disposition: attachment; filename="odemeler.{format}"
   *
   * @param formatQuery - Export formatı (csv | xlsx)
   * @param filters - Ödeme rapor filtreleri
   * @param res - Express Response nesnesi (file download için)
   *
   * @example
   * ```bash
   * GET /reports/export/payments?format=xlsx&method=VERESIYE
   * Authorization: Bearer <admin-token>
   * # Browser'da dosya indirme başlar: odemeler.xlsx
   * ```
   */
  @Get("export/payments")
  @Roles("ADMIN")
  async exportPaymentsReport(
    @Query() formatQuery: ExportFormatQueryDto,
    @Query() filters: PaymentReportFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.reportsService.exportPaymentsReport(filters, formatQuery.format, res);
  }
}
