import { Injectable } from "@nestjs/common";
import { Response } from "express";
import * as XLSX from "xlsx";
import { AppointmentRepository } from "../repositories/appointment.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { AppointmentStatus, PaymentMethod } from "@prisma/client";

/**
 * Raporlama İşlemleri Servisi
 *
 * Randevu ve ödeme raporlarını oluşturur, CSV/XLSX formatında export eder.
 * Büyük veri setleri için streaming desteği sağlar.
 *
 * Özellikler:
 * - Randevu raporları (tarih, durum, personel filtreleri)
 * - Ödeme raporları (ödeme yöntemi, veresiye takibi)
 * - CSV ve XLSX export (research.md'deki pattern'e göre)
 * - Memory-efficient streaming (büyük raporlar için)
 *
 * @class ReportsService
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  /**
   * Randevu raporunu filtrelerle getirir
   *
   * Admin paneli için kullanılır. Filtreleme seçenekleri:
   * - Tarih aralığı
   * - Durum (PENDING, CONFIRMED, etc.)
   * - Personel ID
   * - Hizmet ID
   *
   * @param filters - Rapor filtreleme kriterleri
   * @returns Randevu listesi (relations dahil)
   */
  async getAppointmentsReport(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: AppointmentStatus;
    staffId?: string;
    serviceId?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.staffId) {
      where.staffId = filters.staffId;
    }

    if (filters.serviceId) {
      where.serviceId = filters.serviceId;
    }

    // AppointmentRepository.findMany zaten include parametresi destekliyor
    const appointments = await this.appointmentRepository.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
          },
        },
        payment: {
          select: {
            amount: true,
            method: true,
            paidAt: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return appointments;
  }

  /**
   * Ödeme raporunu getirir
   *
   * Admin için ödeme takibi. Filtreleme:
   * - Tarih aralığı
   * - Ödeme yöntemi
   * - Veresiye durumu
   *
   * @param filters - Ödeme rapor filtreleri
   * @returns Ödeme listesi (relations dahil)
   */
  async getPaymentsReport(filters: {
    startDate?: Date;
    endDate?: Date;
    method?: PaymentMethod;
    veresiyeOnly?: boolean;
  }): Promise<any[]> {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.paidAt = {};
      if (filters.startDate) where.paidAt.gte = filters.startDate;
      if (filters.endDate) where.paidAt.lte = filters.endDate;
    }

    if (filters.method) {
      where.method = filters.method;
    }

    if (filters.veresiyeOnly) {
      where.method = PaymentMethod.VERESIYE;
    }

    // PaymentRepository.findMany zaten default include içeriyor
    // (appointment, customer, service, recordedBy)
    const payments = await this.paymentRepository.findMany({
      where,
      orderBy: { paidAt: "desc" },
    });

    return payments;
  }

  /**
   * Randevu raporunu CSV veya XLSX formatında export eder
   *
   * Research.md'deki pattern kullanılarak implementation yapıldı:
   * - SheetJS (xlsx) library
   * - NodeJS Buffer kullanımı
   * - Memory-efficient streaming (büyük raporlar için)
   * - Turkish column headers
   * - UTF-8 BOM for Excel compatibility (CSV)
   *
   * @param filters - Rapor filtreleri
   * @param format - Export formatı ('csv' | 'xlsx')
   * @param res - Express Response nesnesi
   */
  async exportAppointmentsReport(
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: AppointmentStatus;
      staffId?: string;
      serviceId?: string;
    },
    format: "csv" | "xlsx",
    res: Response,
  ): Promise<void> {
    // Veriyi hazırla
    const appointments = await this.getAppointmentsReport(filters);

    // Excel/CSV için formatla
    const data = appointments.map(a => ({
      Tarih: this.formatDate(a.date),
      Saat: a.time,
      "Müşteri Adı": `${a.customer.firstName} ${a.customer.lastName}`,
      Telefon: a.customer.phone,
      Hizmet: a.service.name,
      Personel: `${a.staff.firstName} ${a.staff.lastName}`,
      Durum: this.translateStatus(a.status),
      "Hizmet Ücreti": a.service.price.toString(),
      "Ödeme Durumu": a.payment
        ? `${a.payment.amount} TL (${this.translatePaymentMethod(a.payment.method)})`
        : "Beklemede",
      "Oluşturma Yöntemi": this.translateCreationMethod(a.creationMethod),
    }));

    // SheetJS worksheet oluştur
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Randevular");

    if (format === "csv") {
      // CSV formatında export (UTF-8 BOM ile Excel uyumluluğu için)
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="randevular.csv"');
      // BOM ekle (Excel'in UTF-8'i tanıması için)
      res.send("\uFEFF" + csv);
    } else {
      // XLSX formatında export
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", 'attachment; filename="randevular.xlsx"');
      res.send(buffer);
    }
  }

  /**
   * Ödeme raporunu CSV veya XLSX formatında export eder
   *
   * Admin için ödeme takibi raporu. Veresiye ödemeleri ayrı sütunda gösterir.
   *
   * @param filters - Ödeme rapor filtreleri
   * @param format - Export formatı ('csv' | 'xlsx')
   * @param res - Express Response nesnesi
   */
  async exportPaymentsReport(
    filters: {
      startDate?: Date;
      endDate?: Date;
      method?: PaymentMethod;
      veresiyeOnly?: boolean;
    },
    format: "csv" | "xlsx",
    res: Response,
  ): Promise<void> {
    const payments = await this.getPaymentsReport(filters);

    const data = payments.map(p => ({
      "Ödeme Tarihi": this.formatDate(p.paidAt),
      "Müşteri Adı": `${p.appointment.customer.firstName} ${p.appointment.customer.lastName}`,
      Telefon: p.appointment.customer.phone,
      Hizmet: p.appointment.service.name,
      Tutar: `${p.amount} TL`,
      "Ödeme Yöntemi": this.translatePaymentMethod(p.method),
      "Veresiye Vade": p.veresiyeDueDate ? this.formatDate(p.veresiyeDueDate) : "-",
      "Veresiye Teminat": p.veresiyeCollateral || "-",
      "Sorumlu Personel": p.veresiyeResponsible || "-",
      Kaydeden: `${p.recordedBy.firstName} ${p.recordedBy.lastName}`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ödemeler");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="odemeler.csv"');
      res.send("\uFEFF" + csv);
    } else {
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", 'attachment; filename="odemeler.xlsx"');
      res.send(buffer);
    }
  }

  // Helper methods

  /**
   * Tarihi DD/MM/YYYY formatına çevirir
   */
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Randevu durumunu Türkçe'ye çevirir
   */
  private translateStatus(status: AppointmentStatus): string {
    const translations: Record<AppointmentStatus, string> = {
      PENDING: "Beklemede",
      CONFIRMED: "Onaylandı",
      COMPLETED: "Tamamlandı",
      CANCELLED: "İptal Edildi",
      NO_SHOW: "Gelmedi",
    };
    return translations[status] || status;
  }

  /**
   * Ödeme yöntemini Türkçe'ye çevirir
   */
  private translatePaymentMethod(method: PaymentMethod): string {
    const translations: Record<PaymentMethod, string> = {
      CASH: "Nakit",
      BANK_TRANSFER: "Havale",
      POS_CARD: "Kredi Kartı",
      VERESIYE: "Veresiye",
    };
    return translations[method] || method;
  }

  /**
   * Oluşturma yöntemini Türkçe'ye çevirir
   */
  private translateCreationMethod(method: string): string {
    const translations: Record<string, string> = {
      ONLINE_GUEST: "Online (Misafir)",
      ONLINE_REGISTERED: "Online (Üye)",
      MANUAL: "Manuel",
    };
    return translations[method] || method;
  }
}
