import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Customer, CustomerType } from '@prisma/client';
import { CustomerRepository } from '../repositories/customer.repository';

/**
 * Customer Service (İş Mantığı Katmanı)
 *
 * Müşteri yönetimi iş kurallarını uygular.
 * Repository katmanını kullanarak veritabanı işlemlerini gerçekleştirir.
 *
 * İş Kuralları:
 * - Misafir müşteri oluştururken telefon numarasına göre duplicate kontrolü
 * - Kayıtlı müşteri oluştururken userId zorunlu
 * - Misafiri kayıtlı müşteriye dönüştürme işlemi
 * - Müşteri istatistikleri yönetimi (denormalized fields)
 *
 * @class CustomerService
 */
@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  /**
   * Yeni misafir müşteri oluşturur
   *
   * İş Kuralı: Aynı telefon numarasına sahip misafir varsa, onu döndürür (duplicate önleme)
   * FR-019a: Telefon numarasına göre misafir eşleştirmesi
   *
   * @param data - Misafir müşteri bilgileri
   * @returns Oluşturulan veya mevcut misafir müşteri
   *
   * @throws {BadRequestException} Geçersiz telefon formatı
   *
   * @example
   * ```typescript
   * const guest = await customerService.createGuest({
   *   firstName: 'Ayşe',
   *   lastName: 'Yılmaz',
   *   phone: '+905551234567'
   * });
   * ```
   */
  async createGuest(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    birthDate?: Date;
    notes?: string;
  }): Promise<Customer> {
    // Telefon formatını doğrula
    this.validatePhoneFormat(data.phone);

    // Aynı telefona sahip misafir var mı kontrol et
    const existingGuest = await this.customerRepository.findByPhone(data.phone);
    if (existingGuest && existingGuest.type === CustomerType.GUEST) {
      return existingGuest; // Mevcut misafiri döndür (duplicate önleme)
    }

    // Kayıtlı müşteri varsa hata fırlat
    if (existingGuest && existingGuest.type === CustomerType.REGISTERED) {
      throw new ConflictException(
        'Bu telefon numarası kayıtlı bir müşteriye ait. Lütfen kayıtlı müşteri girişi yapın.',
      );
    }

    // Yeni misafir oluştur
    return this.customerRepository.create({
      type: CustomerType.GUEST,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate,
      notes: data.notes,
    });
  }

  /**
   * Yeni kayıtlı müşteri oluşturur (User ile ilişkilendirilmiş)
   *
   * İş Kuralı: userId zorunludur, telefon ve email unique olmalı
   *
   * @param data - Kayıtlı müşteri bilgileri
   * @returns Oluşturulan kayıtlı müşteri
   *
   * @throws {ConflictException} Telefon veya email zaten kullanımda
   * @throws {BadRequestException} userId eksik veya geçersiz telefon formatı
   *
   * @example
   * ```typescript
   * const customer = await customerService.createRegistered({
   *   userId: 'cuid123',
   *   firstName: 'Mehmet',
   *   lastName: 'Demir',
   *   phone: '+905551234568',
   *   email: 'mehmet@example.com'
   * });
   * ```
   */
  async createRegistered(data: {
    userId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    birthDate?: Date;
    notes?: string;
  }): Promise<Customer> {
    // userId zorunlu kontrolü
    if (!data.userId) {
      throw new BadRequestException(
        'Kayıtlı müşteri için userId zorunludur.',
      );
    }

    // Telefon formatını doğrula
    this.validatePhoneFormat(data.phone);

    // Email formatını doğrula
    this.validateEmailFormat(data.email);

    // Telefon kullanımda mı kontrol et
    const phoneExists = await this.customerRepository.isPhoneTaken(data.phone);
    if (phoneExists) {
      throw new ConflictException('Bu telefon numarası zaten kullanımda.');
    }

    // Email kullanımda mı kontrol et
    const existingEmail = await this.customerRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictException('Bu email adresi zaten kullanımda.');
    }

    // Kayıtlı müşteri oluştur
    return this.customerRepository.create({
      type: CustomerType.REGISTERED,
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate,
      notes: data.notes,
    });
  }

  /**
   * Telefon numarasına göre müşteri bulur
   *
   * @param phone - Telefon numarası (E.164 format)
   * @returns Müşteri veya null
   *
   * @example
   * ```typescript
   * const customer = await customerService.findByPhone('+905551234567');
   * ```
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    this.validatePhoneFormat(phone);
    return this.customerRepository.findByPhone(phone);
  }

  /**
   * ID'ye göre müşteri bulur
   *
   * @param id - Müşteri ID
   * @param includeRelations - İlişkileri dahil et (appointments, reviews)
   * @returns Müşteri
   *
   * @throws {NotFoundException} Müşteri bulunamadı
   */
  async findById(
    id: string,
    includeRelations = false,
  ): Promise<Customer> {
    const customer = await this.customerRepository.findById(
      id,
      includeRelations,
    );

    if (!customer) {
      throw new NotFoundException(`Müşteri bulunamadı: ${id}`);
    }

    return customer;
  }

  /**
   * Misafir müşteriyi kayıtlı müşteriye dönüştürür
   *
   * İş Kuralı: Sadece GUEST tipindeki müşteriler dönüştürülebilir
   * FR-021, FR-022: Admin davet oluşturur, müşteri kaydolunca bu method çağrılır
   *
   * @param customerId - Müşteri ID (GUEST)
   * @param userId - İlişkilendirilecek User ID
   * @returns Güncellenmiş müşteri (REGISTERED)
   *
   * @throws {NotFoundException} Müşteri bulunamadı
   * @throws {BadRequestException} Müşteri zaten kayıtlı
   *
   * @example
   * ```typescript
   * const customer = await customerService.convertGuestToRegistered(
   *   'guest-id',
   *   'user-id'
   * );
   * ```
   */
  async convertGuestToRegistered(
    customerId: string,
    userId: string,
  ): Promise<Customer> {
    const customer = await this.findById(customerId);

    // Zaten kayıtlı mı kontrol et
    if (customer.type === CustomerType.REGISTERED) {
      throw new BadRequestException('Müşteri zaten kayıtlı durumda.');
    }

    // Misafiri kayıtlı müşteriye dönüştür
    return this.customerRepository.convertToRegistered(customerId, userId);
  }

  /**
   * Müşteri bilgilerini günceller
   *
   * @param id - Müşteri ID
   * @param data - Güncellenecek alanlar
   * @returns Güncellenmiş müşteri
   *
   * @throws {NotFoundException} Müşteri bulunamadı
   * @throws {ConflictException} Telefon veya email çakışması
   */
  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      birthDate?: Date;
      notes?: string;
    },
  ): Promise<Customer> {
    // Müşteri var mı kontrol et
    await this.findById(id);

    // Telefon güncellenmişse, duplicate kontrolü
    if (data.phone) {
      this.validatePhoneFormat(data.phone);
      const phoneExists = await this.customerRepository.isPhoneTaken(
        data.phone,
        id,
      );
      if (phoneExists) {
        throw new ConflictException('Bu telefon numarası zaten kullanımda.');
      }
    }

    // Email güncellenmişse, format kontrolü
    if (data.email) {
      this.validateEmailFormat(data.email);
    }

    return this.customerRepository.update(id, data);
  }

  /**
   * Müşteri listesini getirir (filtreleme ve sayfalama ile)
   *
   * @param options - Listeleme seçenekleri
   * @returns Müşteri listesi
   */
  async findAll(options?: {
    type?: CustomerType;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Customer[]> {
    const { type, search, limit = 50, offset = 0 } = options || {};

    return this.customerRepository.findMany({
      where: {
        ...(type && { type }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Müşteri istatistiklerini günceller
   *
   * Bu method randevu tamamlandığında veya ödeme alındığında çağrılır.
   *
   * @param customerId - Müşteri ID
   * @param appointmentIncrement - Randevu sayısı artışı
   * @param spentIncrement - Harcama artışı
   * @returns Güncellenmiş müşteri
   *
   * @throws {NotFoundException} Müşteri bulunamadı
   */
  async updateStats(
    customerId: string,
    appointmentIncrement: number,
    spentIncrement: number,
  ): Promise<Customer> {
    await this.findById(customerId); // Müşteri var mı kontrol
    return this.customerRepository.incrementStats(
      customerId,
      appointmentIncrement,
      spentIncrement,
    );
  }

  /**
   * Müşteriyi siler (soft delete yerine hard delete)
   *
   * Dikkat: Bu işlem geri alınamaz. Sadece randevusu olmayan müşteriler silinebilir.
   *
   * @param id - Müşteri ID
   * @returns Silinen müşteri
   *
   * @throws {NotFoundException} Müşteri bulunamadı
   * @throws {BadRequestException} Müşterinin randevuları var
   */
  async delete(id: string): Promise<Customer> {
    const customer = await this.findById(id, true);

    // Randevu kontrolü
    if (customer.appointments && customer.appointments.length > 0) {
      throw new BadRequestException(
        'Randevusu olan müşteri silinemez. Önce randevuları silin veya iptal edin.',
      );
    }

    return this.customerRepository.delete(id);
  }

  /**
   * Müşteri sayısını döndürür
   *
   * @param type - Müşteri tipi filtresi (opsiyonel)
   * @returns Müşteri sayısı
   */
  async count(type?: CustomerType): Promise<number> {
    return this.customerRepository.count(type ? { type } : undefined);
  }

  /**
   * User ID'ye göre müşteri bulur (kayıtlı müşteriler için)
   *
   * @param userId - User ID
   * @returns Müşteri veya null
   */
  async findByUserId(userId: string): Promise<Customer | null> {
    return this.customerRepository.findByUserId(userId);
  }

  /**
   * Tüm misafir müşterileri getirir
   *
   * @param limit - Limit (varsayılan: 100)
   * @param offset - Offset (varsayılan: 0)
   * @returns Misafir müşteri listesi
   */
  async findGuests(limit = 100, offset = 0): Promise<Customer[]> {
    return this.customerRepository.findGuests(limit, offset);
  }

  // ============================================================================
  // Yardımcı Methodlar (Private)
  // ============================================================================

  /**
   * Telefon numarası formatını doğrular
   *
   * Format: E.164 (+90XXXXXXXXXX)
   *
   * @param phone - Telefon numarası
   * @throws {BadRequestException} Geçersiz format
   */
  private validatePhoneFormat(phone: string): void {
    const phoneRegex = /^\+90[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException(
        'Geçersiz telefon formatı. Format: +90XXXXXXXXXX',
      );
    }
  }

  /**
   * Email formatını doğrular
   *
   * @param email - Email adresi
   * @throws {BadRequestException} Geçersiz format
   */
  private validateEmailFormat(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Geçersiz email formatı.');
    }
  }
}

