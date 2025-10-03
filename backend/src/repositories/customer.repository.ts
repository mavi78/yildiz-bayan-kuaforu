import { Injectable } from '@nestjs/common';
import { Customer, CustomerType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * Customer Repository
 *
 * Müşteri verilerini yöneten repository katmanı.
 * Bu katman Prisma Client'ı kullanarak veritabanı işlemlerini gerçekleştirir.
 *
 * İş Kuralları:
 * - REGISTERED müşteriler userId ile ilişkilidir
 * - GUEST müşteriler userId = null
 * - Telefon numarası ile misafir eşleştirmesi (duplicate önleme)
 *
 * @class CustomerRepository
 */
@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni müşteri oluşturur
   *
   * @param data - Müşteri oluşturma verisi
   * @returns Oluşturulan müşteri
   *
   * @example
   * ```typescript
   * const customer = await repo.create({
   *   type: 'GUEST',
   *   firstName: 'Ahmet',
   *   lastName: 'Yılmaz',
   *   phone: '+905551234567'
   * });
   * ```
   */
  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  /**
   * ID'ye göre müşteri bulur
   *
   * @param id - Müşteri ID
   * @param includeRelations - İlişkileri dahil et (appointments, reviews)
   * @returns Müşteri veya null
   */
  async findById(
    id: string,
    includeRelations = false,
  ): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      include: includeRelations
        ? {
            user: true,
            appointments: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
            reviews: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          }
        : undefined,
    });
  }

  /**
   * Telefon numarasına göre müşteri bulur
   *
   * Not: Misafir randevu oluştururken duplicate kontrolü için kullanılır
   *
   * @param phone - Telefon numarası (E.164 format)
   * @returns Müşteri veya null
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({
      where: { phone },
    });
  }

  /**
   * User ID'ye göre müşteri bulur (kayıtlı müşteriler için)
   *
   * @param userId - User ID
   * @returns Müşteri veya null
   */
  async findByUserId(userId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { userId },
    });
  }

  /**
   * Müşteri bilgilerini günceller
   *
   * @param id - Müşteri ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş müşteri
   */
  async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Tüm misafir müşterileri getirir
   *
   * @param limit - Limit (varsayılan: 100)
   * @param offset - Offset (varsayılan: 0)
   * @returns Misafir müşteri listesi
   */
  async findGuests(limit = 100, offset = 0): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { type: CustomerType.GUEST },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Filtrelere göre müşteri listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Müşteri listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput;
  }): Promise<Customer[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.customer.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  /**
   * Müşteri sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Müşteri sayısı
   */
  async count(where?: Prisma.CustomerWhereInput): Promise<number> {
    return this.prisma.customer.count({ where });
  }

  /**
   * Email'e göre müşteri bulur (kayıtlı müşteriler için)
   *
   * @param email - Email adresi
   * @returns Müşteri veya null
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({
      where: { email },
    });
  }

  /**
   * Müşteriyi soft delete yapar (isActive = false yapabilir veya direk siler)
   *
   * Not: Şu an hard delete. Gerekirse soft delete için isActive alanı eklenebilir.
   *
   * @param id - Müşteri ID
   * @returns Silinen müşteri
   */
  async delete(id: string): Promise<Customer> {
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  /**
   * Müşteri istatistiklerini günceller (denormalized fields)
   *
   * @param id - Müşteri ID
   * @param totalAppointments - Toplam randevu sayısı
   * @param totalSpent - Toplam harcama
   * @returns Güncellenmiş müşteri
   */
  async updateStats(
    id: string,
    totalAppointments: number,
    totalSpent: number,
  ): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: {
        totalAppointments,
        totalSpent,
      },
    });
  }

  /**
   * Müşteri istatistiklerini increment eder
   *
   * @param id - Müşteri ID
   * @param appointmentIncrement - Randevu sayısı artışı
   * @param spentIncrement - Harcama artışı
   * @returns Güncellenmiş müşteri
   */
  async incrementStats(
    id: string,
    appointmentIncrement: number,
    spentIncrement: number,
  ): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: {
        totalAppointments: { increment: appointmentIncrement },
        totalSpent: { increment: spentIncrement },
      },
    });
  }

  /**
   * Misafiri kayıtlı müşteriye dönüştürür
   *
   * @param id - Müşteri ID
   * @param userId - User ID (ilişkilendirilecek)
   * @returns Güncellenmiş müşteri
   */
  async convertToRegistered(id: string, userId: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: {
        type: CustomerType.REGISTERED,
        userId,
      },
    });
  }

  /**
   * Müşteri var mı kontrol eder
   *
   * @param id - Müşteri ID
   * @returns Var ise true, yoksa false
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Telefon numarası kullanımda mı kontrol eder
   *
   * @param phone - Telefon numarası
   * @param excludeId - Hariç tutulacak müşteri ID (update işlemlerinde)
   * @returns Kullanımda ise true
   */
  async isPhoneTaken(phone: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: {
        phone,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}

