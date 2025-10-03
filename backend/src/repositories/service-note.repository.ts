import { Injectable } from "@nestjs/common";
import { ServiceNote, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

/**
 * ServiceNote Repository
 *
 * Hizmet notlarını yöneten repository katmanı.
 * Randevu sonrası personel notları (sadece Admin/Staff görebilir, max 1000 karakter).
 *
 * @class ServiceNoteRepository
 */
@Injectable()
export class ServiceNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni hizmet notu oluşturur
   *
   * @param data - Not verisi
   * @returns Oluşturulan not
   */
  async create(data: Prisma.ServiceNoteCreateInput): Promise<ServiceNote> {
    return this.prisma.serviceNote.create({
      data,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Randevuya ait notları getirir (createdAt'e göre sıralı)
   *
   * @param appointmentId - Randevu ID
   * @returns Not listesi
   */
  async findByAppointment(appointmentId: string): Promise<ServiceNote[]> {
    return this.prisma.serviceNote.findMany({
      where: { appointmentId },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * ID'ye göre not bulur
   *
   * @param id - Not ID
   * @returns Not veya null
   */
  async findById(id: string): Promise<ServiceNote | null> {
    return this.prisma.serviceNote.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        appointment: true,
      },
    });
  }

  /**
   * Notu siler
   *
   * @param id - Not ID
   * @returns Silinen not
   */
  async delete(id: string): Promise<ServiceNote> {
    return this.prisma.serviceNote.delete({
      where: { id },
    });
  }

  /**
   * Notu günceller
   *
   * @param id - Not ID
   * @param content - Yeni içerik
   * @returns Güncellenmiş not
   */
  async update(id: string, content: string): Promise<ServiceNote> {
    return this.prisma.serviceNote.update({
      where: { id },
      data: { content },
    });
  }

  /**
   * Not sayısını döndürür
   *
   * @param where - Filtre koşulları
   * @returns Not sayısı
   */
  async count(where?: Prisma.ServiceNoteWhereInput): Promise<number> {
    return this.prisma.serviceNote.count({ where });
  }
}
