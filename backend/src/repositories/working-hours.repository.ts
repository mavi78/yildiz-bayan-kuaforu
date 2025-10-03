import { Injectable } from '@nestjs/common';
import { WorkingHours, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * WorkingHours Repository
 *
 * Salon çalışma saatlerini yöneten repository katmanı.
 * Haftanın her günü için çalışma saatlerini saklar.
 *
 * dayOfWeek: 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
 *
 * @class WorkingHoursRepository
 */
@Injectable()
export class WorkingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Günün çalışma saatlerini getirir
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @returns Çalışma saati veya null
   */
  async findByDayOfWeek(dayOfWeek: number): Promise<WorkingHours | null> {
    return this.prisma.workingHours.findUnique({
      where: { dayOfWeek },
    });
  }

  /**
   * Çalışma saatini oluşturur veya günceller (upsert)
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @param data - Çalışma saati verisi
   * @returns Oluşturulan veya güncellenen çalışma saati
   *
   * @example
   * ```typescript
   * const hours = await repo.upsert(1, {
   *   openTime: '09:00',
   *   closeTime: '19:00',
   *   isClosed: false
   * });
   * ```
   */
  async upsert(
    dayOfWeek: number,
    data: Omit<Prisma.WorkingHoursCreateInput, 'dayOfWeek'>,
  ): Promise<WorkingHours> {
    return this.prisma.workingHours.upsert({
      where: { dayOfWeek },
      update: data,
      create: {
        dayOfWeek,
        ...data,
      },
    });
  }

  /**
   * Tüm çalışma saatlerini getirir
   *
   * @returns Çalışma saati listesi (günlere göre sıralı)
   */
  async findAll(): Promise<WorkingHours[]> {
    return this.prisma.workingHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  /**
   * Çalışma saatini günceller
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş çalışma saati
   */
  async update(
    dayOfWeek: number,
    data: Prisma.WorkingHoursUpdateInput,
  ): Promise<WorkingHours> {
    return this.prisma.workingHours.update({
      where: { dayOfWeek },
      data,
    });
  }

  /**
   * Çalışma saatini oluşturur
   *
   * @param data - Çalışma saati verisi
   * @returns Oluşturulan çalışma saati
   */
  async create(data: Prisma.WorkingHoursCreateInput): Promise<WorkingHours> {
    return this.prisma.workingHours.create({ data });
  }

  /**
   * Günü kapalı olarak işaretler
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @returns Güncellenmiş çalışma saati
   */
  async markClosed(dayOfWeek: number): Promise<WorkingHours> {
    return this.prisma.workingHours.update({
      where: { dayOfWeek },
      data: {
        isClosed: true,
        openTime: null,
        closeTime: null,
      },
    });
  }

  /**
   * Günü açık olarak işaretler
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @param openTime - Açılış saati (HH:mm)
   * @param closeTime - Kapanış saati (HH:mm)
   * @returns Güncellenmiş çalışma saati
   */
  async markOpen(
    dayOfWeek: number,
    openTime: string,
    closeTime: string,
  ): Promise<WorkingHours> {
    return this.prisma.workingHours.update({
      where: { dayOfWeek },
      data: {
        isClosed: false,
        openTime,
        closeTime,
      },
    });
  }

  /**
   * Çalışma saatini siler
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @returns Silinen çalışma saati
   */
  async delete(dayOfWeek: number): Promise<WorkingHours> {
    return this.prisma.workingHours.delete({
      where: { dayOfWeek },
    });
  }

  /**
   * Çalışma saati var mı kontrol eder
   *
   * @param dayOfWeek - Haftanın günü (0-6)
   * @returns Var ise true, yoksa false
   */
  async exists(dayOfWeek: number): Promise<boolean> {
    const count = await this.prisma.workingHours.count({
      where: { dayOfWeek },
    });
    return count > 0;
  }

  /**
   * Açık günleri getirir
   *
   * @returns Açık günlerin çalışma saatleri
   */
  async findOpenDays(): Promise<WorkingHours[]> {
    return this.prisma.workingHours.findMany({
      where: { isClosed: false },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  /**
   * Tüm çalışma saatlerini toplu günceller
   *
   * @param workingHoursData - Günlük çalışma saatleri array
   * @returns Güncellenen kayıt sayısı
   */
  async bulkUpsert(
    workingHoursData: Array<{
      dayOfWeek: number;
      openTime?: string | null;
      closeTime?: string | null;
      isClosed: boolean;
    }>,
  ): Promise<number> {
    let count = 0;
    for (const data of workingHoursData) {
      await this.upsert(data.dayOfWeek, {
        openTime: data.openTime,
        closeTime: data.closeTime,
        isClosed: data.isClosed,
      });
      count++;
    }
    return count;
  }
}

