import { Injectable } from '@nestjs/common';
import { SpecialWorkingDay, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * SpecialWorkingDay Repository
 *
 * Özel günler için çalışma saatlerini yöneten repository katmanı.
 * Tatiller, özel etkinlikler gibi günler için çalışma saatlerini saklar.
 *
 * Öncelik: SpecialWorkingDay > WorkingHours (FR-057)
 *
 * @class SpecialWorkingDayRepository
 */
@Injectable()
export class SpecialWorkingDayRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tarihe göre özel gün bulur
   *
   * @param date - Tarih
   * @returns Özel gün veya null
   */
  async findByDate(date: Date): Promise<SpecialWorkingDay | null> {
    return this.prisma.specialWorkingDay.findUnique({
      where: { date },
    });
  }

  /**
   * Yeni özel gün oluşturur
   *
   * @param data - Özel gün verisi
   * @returns Oluşturulan özel gün
   *
   * @example
   * ```typescript
   * const specialDay = await repo.create({
   *   date: new Date('2025-01-01'),
   *   isClosed: true,
   *   description: 'Yılbaşı Tatili',
   *   createdBy: { connect: { id: adminId } }
   * });
   * ```
   */
  async create(
    data: Prisma.SpecialWorkingDayCreateInput,
  ): Promise<SpecialWorkingDay> {
    return this.prisma.specialWorkingDay.create({ data });
  }

  /**
   * Özel günü siler
   *
   * @param id - Özel gün ID
   * @returns Silinen özel gün
   */
  async delete(id: string): Promise<SpecialWorkingDay> {
    return this.prisma.specialWorkingDay.delete({
      where: { id },
    });
  }

  /**
   * Gelecekteki özel günleri getirir
   *
   * @param limit - Limit (varsayılan: 50)
   * @returns Özel gün listesi
   */
  async findUpcoming(limit = 50): Promise<SpecialWorkingDay[]> {
    return this.prisma.specialWorkingDay.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: { date: 'asc' },
      take: limit,
    });
  }

  /**
   * Tarih aralığındaki özel günleri getirir
   *
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns Özel gün listesi
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<SpecialWorkingDay[]> {
    return this.prisma.specialWorkingDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Özel günü günceller
   *
   * @param id - Özel gün ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş özel gün
   */
  async update(
    id: string,
    data: Prisma.SpecialWorkingDayUpdateInput,
  ): Promise<SpecialWorkingDay> {
    return this.prisma.specialWorkingDay.update({
      where: { id },
      data,
    });
  }

  /**
   * ID'ye göre özel gün bulur
   *
   * @param id - Özel gün ID
   * @returns Özel gün veya null
   */
  async findById(id: string): Promise<SpecialWorkingDay | null> {
    return this.prisma.specialWorkingDay.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Tüm özel günleri getirir
   *
   * @param includeRelations - İlişkileri dahil et
   * @returns Özel gün listesi
   */
  async findAll(includeRelations = false): Promise<SpecialWorkingDay[]> {
    return this.prisma.specialWorkingDay.findMany({
      orderBy: { date: 'desc' },
      include: includeRelations
        ? {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          }
        : undefined,
    });
  }

  /**
   * Özel gün var mı kontrol eder
   *
   * @param date - Tarih
   * @returns Var ise true, yoksa false
   */
  async existsByDate(date: Date): Promise<boolean> {
    const count = await this.prisma.specialWorkingDay.count({
      where: { date },
    });
    return count > 0;
  }

  /**
   * Geçmiş özel günleri temizler
   *
   * @param beforeDate - Bu tarihten önceki kayıtlar silinir
   * @returns Silinen kayıt sayısı
   */
  async deleteOldRecords(beforeDate: Date): Promise<number> {
    const result = await this.prisma.specialWorkingDay.deleteMany({
      where: {
        date: {
          lt: beforeDate,
        },
      },
    });
    return result.count;
  }

  /**
   * Özel gün sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Özel gün sayısı
   */
  async count(where?: Prisma.SpecialWorkingDayWhereInput): Promise<number> {
    return this.prisma.specialWorkingDay.count({ where });
  }
}

