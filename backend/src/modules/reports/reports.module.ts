import { Module } from '@nestjs/common';
import { SharedModule } from '@modules/shared';
import { ReportsController } from './reports.controller';
import { ReportsService } from '@services/reports.service';

/**
 * ReportsModule
 *
 * Raporlama ve veri export modülü. Randevu ve ödeme raporlarını
 * CSV/XLSX formatında export etme işlevlerini sağlar.
 *
 * Controller'lar:
 * - ReportsController: Rapor listeleme ve export endpoint'leri
 *
 * Servisler:
 * - ReportsService: xlsx library ile CSV/XLSX export (research.md pattern'i)
 *
 * Özellikler:
 * - Randevu raporları (tarih, durum, personel filtreleri)
 * - Ödeme raporları (ödeme yöntemi, veresiye takibi)
 * - CSV export: UTF-8 BOM ile Excel uyumluluğu
 * - XLSX export: Buffer-based streaming approach
 * - Admin-only access (role guard)
 *
 * @module ReportsModule
 */
@Module({
  imports: [SharedModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
