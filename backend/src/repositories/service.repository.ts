import { Injectable } from "@nestjs/common";
import { Service, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * Service Repository
 *
 * Salon hizmetlerini yöneten repository katmanı.
 * Saç kesimi, boyama, manikür gibi hizmetlerin veritabanı işlemlerini gerçekleştirir.
 *
 * @class ServiceRepository
 */
@Injectable()
export class ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tüm aktif hizmetleri getirir
   *
   * @param includeInactive - Pasif hizmetleri de dahil et
   * @returns Hizmet listesi
   */
  async findAll(includeInactive = false): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * ID'ye göre hizmet bulur
   *
   * @param id - Hizmet ID
   * @returns Hizmet veya null
   */
  async findById(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { id },
    });
  }

  /**
   * Yeni hizmet oluşturur
   *
   * @param data - Hizmet oluşturma verisi
   * @returns Oluşturulan hizmet
   *
   * @example
   * ```typescript
   * const service = await repo.create({
   *   name: 'Saç Kesimi',
   *   description: 'Kadın saç kesimi hizmeti',
   *   durationMinutes: 60,
   *   price: 150.00,
   *   isActive: true
   * });
   * ```
   */
  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    return this.prisma.service.create({ data });
  }

  /**
   * Hizmet bilgilerini günceller
   *
   * @param id - Hizmet ID
   * @param data - Güncellenecek veriler
   * @returns Güncellenmiş hizmet
   */
  async update(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data,
    });
  }

  /**
   * Hizmeti soft delete yapar (isActive = false)
   *
   * @param id - Hizmet ID
   * @returns Güncellenmiş hizmet
   */
  async softDelete(id: string): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Hizmeti aktif hale getirir
   *
   * @param id - Hizmet ID
   * @returns Güncellenmiş hizmet
   */
  async activate(id: string): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Filtrelere göre hizmet listesi getirir
   *
   * @param params - Query parametreleri
   * @returns Hizmet listesi
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ServiceWhereInput;
    orderBy?: Prisma.ServiceOrderByWithRelationInput;
  }): Promise<Service[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.service.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  /**
   * Hizmet sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Hizmet sayısı
   */
  async count(where?: Prisma.ServiceWhereInput): Promise<number> {
    return this.prisma.service.count({ where });
  }

  /**
   * İsme göre hizmet arar
   *
   * @param name - Hizmet adı (kısmi eşleşme)
   * @returns Hizmet listesi
   */
  async searchByName(name: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Hizmet var mı kontrol eder
   *
   * @param id - Hizmet ID
   * @returns Var ise true, yoksa false
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.service.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Hizmet fiyatını günceller
   *
   * @param id - Hizmet ID
   * @param price - Yeni fiyat
   * @returns Güncellenmiş hizmet
   */
  async updatePrice(id: string, price: number): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: { price },
    });
  }

  /**
   * Hizmet süresini günceller
   *
   * @param id - Hizmet ID
   * @param durationMinutes - Yeni süre (dakika)
   * @returns Güncellenmiş hizmet
   */
  async updateDuration(id: string, durationMinutes: number): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: { durationMinutes },
    });
  }

  /**
   * Hizmeti hard delete yapar
   *
   * Not: Sadece randevusu olmayan hizmetler silinebilir
   *
   * @param id - Hizmet ID
   * @returns Silinen hizmet
   */
  async delete(id: string): Promise<Service> {
    return this.prisma.service.delete({
      where: { id },
    });
  }
}
