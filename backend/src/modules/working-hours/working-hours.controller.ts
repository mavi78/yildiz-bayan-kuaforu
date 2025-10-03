import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { WorkingHoursRepository } from "../../repositories/working-hours.repository";
import { SpecialWorkingDayRepository } from "../../repositories/special-working-day.repository";
import { UpdateWorkingHoursDto, CreateSpecialDayDto } from "./dto";

/**
 * Working Hours Controller
 *
 * Salon çalışma saatleri yönetimi için HTTP endpoint'leri sağlar.
 *
 * Endpoint'ler:
 * - GET /working-hours - Tüm çalışma saatlerini getir (public)
 * - PUT /admin/working-hours - Çalışma saatlerini güncelle (Admin only)
 * - GET /special-working-days - Özel günleri getir (public)
 * - POST /admin/special-working-days - Özel gün ekle (Admin only)
 * - DELETE /admin/special-working-days/:id - Özel gün sil (Admin only)
 *
 * İş Kuralları:
 * - WorkingHours: Haftanın her günü için çalışma saatleri (FR-055)
 * - SpecialWorkingDay: Tatiller ve özel günler için override (FR-057)
 * - Priority: SpecialWorkingDay > WorkingHours (FR-059a)
 *
 * @class WorkingHoursController
 */
@Controller()
export class WorkingHoursController {
  constructor(
    private readonly workingHoursRepository: WorkingHoursRepository,
    private readonly specialWorkingDayRepository: SpecialWorkingDayRepository,
  ) {}

  /**
   * Tüm çalışma saatlerini getirir (public)
   *
   * GET /working-hours
   *
   * Haftanın 7 günü için çalışma saatlerini döner.
   * Frontend'de randevu formu için kullanılır (FR-055).
   *
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     { "dayOfWeek": 0, "openTime": null, "closeTime": null, "isClosed": true }, // Pazar
   *     { "dayOfWeek": 1, "openTime": "09:00", "closeTime": "19:00", "isClosed": false }, // Pazartesi
   *     ...
   *   ]
   * }
   *
   * @returns Çalışma saatleri listesi (günlere göre sıralı)
   *
   * @example
   * ```bash
   * GET /working-hours
   * # Public endpoint, no auth required
   * ```
   */
  @Get("working-hours")
  @HttpCode(HttpStatus.OK)
  async getWorkingHours() {
    const workingHours = await this.workingHoursRepository.findAll();
    return {
      success: true,
      data: workingHours,
    };
  }

  /**
   * Çalışma saatlerini toplu olarak günceller (Admin only)
   *
   * PUT /admin/working-hours
   *
   * Haftanın tüm günleri için çalışma saatlerini bir seferde günceller.
   * Admin panelinde kullanılır (FR-055).
   *
   * Body:
   * {
   *   "workingHours": [
   *     { "dayOfWeek": 0, "isClosed": true },
   *     { "dayOfWeek": 1, "openTime": "09:00", "closeTime": "19:00", "isClosed": false },
   *     { "dayOfWeek": 2, "openTime": "09:00", "closeTime": "19:00", "isClosed": false },
   *     { "dayOfWeek": 3, "openTime": "09:00", "closeTime": "19:00", "isClosed": false },
   *     { "dayOfWeek": 4, "openTime": "09:00", "closeTime": "19:00", "isClosed": false },
   *     { "dayOfWeek": 5, "openTime": "09:00", "closeTime": "19:00", "isClosed": false },
   *     { "dayOfWeek": 6, "openTime": "09:00", "closeTime": "17:00", "isClosed": false }
   *   ]
   * }
   *
   * İş Kuralları:
   * - Array uzunluğu 7 olmalı (her gün için)
   * - dayOfWeek benzersiz olmalı (0-6)
   * - isClosed=false ise openTime ve closeTime zorunlu
   * - openTime < closeTime kontrolü
   *
   * @param dto - Çalışma saatleri array (7 gün)
   * @returns Güncellenen çalışma saatleri
   *
   * @example
   * ```bash
   * PUT /admin/working-hours
   * Authorization: Bearer <admin-token>
   * Body: { "workingHours": [...] }
   * ```
   */
  @Put("admin/working-hours")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async updateWorkingHours(@Body() dto: UpdateWorkingHoursDto) {
    // Validasyon: dayOfWeek benzersiz mi?
    const dayOfWeekSet = new Set(dto.workingHours.map(wh => wh.dayOfWeek));
    if (dayOfWeekSet.size !== 7) {
      throw new BadRequestException("Each dayOfWeek (0-6) must appear exactly once");
    }

    // Validasyon: openTime < closeTime kontrolü
    for (const wh of dto.workingHours) {
      if (!wh.isClosed) {
        if (!wh.openTime || !wh.closeTime) {
          throw new BadRequestException(
            `Day ${wh.dayOfWeek}: openTime and closeTime are required when isClosed=false`,
          );
        }
        if (wh.openTime >= wh.closeTime) {
          throw new BadRequestException(`Day ${wh.dayOfWeek}: openTime must be before closeTime`);
        }
      }
    }

    // Toplu güncelleme (upsert)
    await this.workingHoursRepository.bulkUpsert(
      dto.workingHours.map(wh => ({
        dayOfWeek: wh.dayOfWeek,
        openTime: wh.isClosed ? null : wh.openTime,
        closeTime: wh.isClosed ? null : wh.closeTime,
        isClosed: wh.isClosed,
      })),
    );

    // Güncellenmiş verileri getir
    const updatedWorkingHours = await this.workingHoursRepository.findAll();
    return {
      success: true,
      message: "Working hours updated successfully",
      data: updatedWorkingHours,
    };
  }

  /**
   * Özel günleri getirir (public)
   *
   * GET /special-working-days
   *
   * Gelecekteki özel günleri (tatiller, özel etkinlikler) döner.
   * Frontend'de randevu formu için kullanılır (FR-057).
   *
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "...",
   *       "date": "2025-01-01",
   *       "isClosed": true,
   *       "description": "Yılbaşı Tatili"
   *     },
   *     {
   *       "id": "...",
   *       "date": "2025-12-31",
   *       "openTime": "09:00",
   *       "closeTime": "15:00",
   *       "isClosed": false,
   *       "description": "Yılbaşı Arifesi"
   *     }
   *   ]
   * }
   *
   * @returns Gelecekteki özel günler (tarih sırasıyla)
   *
   * @example
   * ```bash
   * GET /special-working-days
   * # Public endpoint, no auth required
   * ```
   */
  @Get("special-working-days")
  @HttpCode(HttpStatus.OK)
  async getSpecialWorkingDays() {
    const specialDays = await this.specialWorkingDayRepository.findUpcoming();
    return {
      success: true,
      data: specialDays,
    };
  }

  /**
   * Yeni özel gün oluşturur (Admin only)
   *
   * POST /admin/special-working-days
   *
   * Tatil veya özel etkinlik için çalışma saati tanımlar.
   * SpecialWorkingDay, WorkingHours'a göre önceliklidir (FR-057).
   *
   * Body:
   * {
   *   "date": "2025-05-01",
   *   "isClosed": true,
   *   "description": "İşçi Bayramı"
   * }
   *
   * İş Kuralları:
   * - Tarih gelecekte olmalı
   * - Tarih benzersiz olmalı (duplicate kontrolü)
   * - isClosed=false ise openTime ve closeTime zorunlu
   * - openTime < closeTime kontrolü
   *
   * @param dto - Özel gün verisi
   * @param user - JWT token'dan alınan mevcut kullanıcı (Admin)
   * @returns Oluşturulan özel gün
   *
   * @example
   * ```bash
   * POST /admin/special-working-days
   * Authorization: Bearer <admin-token>
   * Body: {
   *   "date": "2025-05-01",
   *   "isClosed": true,
   *   "description": "İşçi Bayramı"
   * }
   * ```
   */
  @Post("admin/special-working-days")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.CREATED)
  async createSpecialDay(@Body() dto: CreateSpecialDayDto, @CurrentUser() user: any) {
    const date = new Date(dto.date);

    // Validasyon: Geçmiş tarih kontrolü
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      throw new BadRequestException("Date cannot be in the past");
    }

    // Validasyon: Duplicate kontrolü
    const exists = await this.specialWorkingDayRepository.existsByDate(date);
    if (exists) {
      throw new BadRequestException("Special working day already exists for this date");
    }

    // Validasyon: openTime < closeTime kontrolü
    if (!dto.isClosed) {
      if (!dto.openTime || !dto.closeTime) {
        throw new BadRequestException("openTime and closeTime are required when isClosed=false");
      }
      if (dto.openTime >= dto.closeTime) {
        throw new BadRequestException("openTime must be before closeTime");
      }
    }

    // Oluştur
    const specialDay = await this.specialWorkingDayRepository.create({
      date,
      openTime: dto.isClosed ? null : dto.openTime,
      closeTime: dto.isClosed ? null : dto.closeTime,
      isClosed: dto.isClosed,
      description: dto.description,
      createdBy: {
        connect: { id: user.userId },
      },
    });

    return {
      success: true,
      message: "Special working day created successfully",
      data: specialDay,
    };
  }

  /**
   * Özel günü siler (Admin only)
   *
   * DELETE /admin/special-working-days/:id
   *
   * Mevcut bir özel günü sistemden kaldırır.
   *
   * @param id - Özel gün ID
   * @returns Silme başarı mesajı
   *
   * @example
   * ```bash
   * DELETE /admin/special-working-days/clx1234567890
   * Authorization: Bearer <admin-token>
   * ```
   */
  @Delete("admin/special-working-days/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async deleteSpecialDay(@Param("id") id: string) {
    // Validasyon: Özel gün var mı?
    const specialDay = await this.specialWorkingDayRepository.findById(id);
    if (!specialDay) {
      throw new BadRequestException("Special working day not found");
    }

    // Sil
    await this.specialWorkingDayRepository.delete(id);

    return {
      success: true,
      message: "Special working day deleted successfully",
    };
  }
}
