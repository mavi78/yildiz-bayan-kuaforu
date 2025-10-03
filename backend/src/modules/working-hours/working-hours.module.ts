import { Module } from "@nestjs/common";
import { SharedModule } from "@modules/shared";
import { WorkingHoursController } from "./working-hours.controller";

/**
 * WorkingHoursModule
 *
 * Salon çalışma saatleri yönetimi modülü. Normal çalışma saatleri ve
 * özel günler (tatiller, etkinlikler) için CRUD işlevlerini sağlar.
 *
 * Controller'lar:
 * - WorkingHoursController: 5 HTTP endpoint (2 public, 3 admin)
 *
 * Özellikler:
 * - WorkingHours: Haftanın her günü için çalışma saatleri (FR-055)
 * - SpecialWorkingDay: Tatiller için override (FR-057)
 * - Priority: SpecialWorkingDay > WorkingHours (FR-059a)
 * - Public endpoints: Randevu formunda kullanım için
 * - Admin endpoints: Toplu güncelleme + özel gün yönetimi
 *
 * Public Endpoints:
 * - GET /working-hours - Tüm çalışma saatleri
 * - GET /special-working-days - Gelecekteki özel günler
 *
 * Admin Endpoints:
 * - PUT /admin/working-hours - Toplu güncelleme (7 gün)
 * - POST /admin/special-working-days - Özel gün ekle
 * - DELETE /admin/special-working-days/:id - Özel gün sil
 *
 * @module WorkingHoursModule
 */
@Module({
  imports: [SharedModule],
  controllers: [WorkingHoursController],
  providers: [],
  exports: [],
})
export class WorkingHoursModule {}
