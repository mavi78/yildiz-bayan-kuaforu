/**
 * Register Usecase
 *
 * Davet ile kullanıcı kaydı (registration) iş akışı.
 * Davet doğrulama → email/phone benzersizlik kontrolü → kullanıcı oluşturma → davet kullanıldı işaretleme → JWT token üretimi.
 *
 * @module usecases/auth
 */

import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { InvitationService } from "../../services/invitation.service";
import { UserRepository } from "../../repositories/user.repository";
import { AuthService } from "../../services/auth.service";
import { CustomerService } from "../../services/customer.service";

/**
 * Kayıt için gerekli kullanıcı bilgileri
 */
export interface RegisterInput {
  token: string; // Davet token'ı
  firstName: string;
  lastName: string;
  phone: string; // Format: +90XXXXXXXXXX
  password: string; // Minimum 8 karakter
}

/**
 * Kayıt sonucu
 */
export interface RegisterResult {
  access_token: string;
  expires_in: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
}

/**
 * Register Usecase
 *
 * Kullanım akışı:
 * 1. Token ile davet doğrulama (geçerli mi, kullanılmış mı, süresi dolmuş mu)
 * 2. Email ve telefon numarası benzersizlik kontrolü
 * 3. Şifre hash'leme ve kullanıcı oluşturma
 * 4. Daveti kullanıldı olarak işaretleme
 * 5. JWT token üretimi ve döndürme
 *
 * İş kuralları:
 * - Sadece geçerli davet token'ı ile kayıt olunabilir
 * - Email ve telefon numarası sistemde benzersiz olmalı
 * - Kullanıcının rolü davet ile belirlenir (Admin hariç)
 * - Kayıt sonrası davet tekrar kullanılamaz
 * - Kayıt sonrası kullanıcı aktif durumda olur
 * - JWT token otomatik üretilir ve döndürülür
 */
@Injectable()
export class RegisterUsecase {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
    private readonly customerService: CustomerService,
  ) {}

  /**
   * Yeni kullanıcı kaydı oluşturur
   *
   * @param input - Kayıt bilgileri (token, firstName, lastName, phone, password)
   * @returns JWT token ve kullanıcı bilgileri
   * @throws BadRequestException - Davet geçersizse veya süresi dolmuşsa
   * @throws ConflictException - Email veya telefon numarası zaten kullanılıyorsa
   */
  async execute(input: RegisterInput): Promise<RegisterResult> {
    // 1. Davet doğrulama
    const validation = await this.invitationService.validateNotExpired(input.token);

    if (!validation.isValid) {
      throw new BadRequestException(validation.reason || "Davet geçersiz veya süresi dolmuş");
    }

    const invitation = validation.invitation!;

    // 2. Email benzersizlik kontrolü (davet email'i kullanılacak)
    const existingUserByEmail = await this.userRepository.findByEmail(invitation.email);

    if (existingUserByEmail) {
      throw new ConflictException(`${invitation.email} email adresi zaten kullanılıyor`);
    }

    // 3. Telefon numarası benzersizlik kontrolü
    const existingUserByPhone = await this.userRepository.findByPhone(input.phone);

    if (existingUserByPhone) {
      throw new ConflictException(`${input.phone} telefon numarası zaten kullanılıyor`);
    }

    // 4. Şifre hash'leme
    const passwordHash = await this.authService.hashPassword(input.password);

    // 5. Kullanıcı oluşturma
    const user = await this.userRepository.create({
      email: invitation.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: invitation.role,
    });

    // 6. Eğer davet bir guest customer için ise, guest customer'ı registered'a dönüştür (FR-022)
    if (invitation.guestCustomerId) {
      await this.customerService.convertGuestToRegistered(invitation.guestCustomerId, user.id);
    }

    // 7. Daveti kullanıldı olarak işaretleme
    await this.invitationService.markUsed(input.token);

    // 8. JWT token üretimi
    const loginResult = await this.authService.login({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });

    return loginResult;
  }

  /**
   * Davet bilgilerini getirir (kayıt formunu önceden doldurmak için)
   *
   * Frontend registration sayfasında davet email'ini göstermek için kullanılabilir.
   *
   * @param token - Davet token'ı
   * @returns Davet bilgileri (email, role, expiry)
   * @throws BadRequestException - Davet geçersizse
   */
  async getInvitationDetails(token: string): Promise<{
    email: string;
    role: Role;
    expiresAt: Date;
    remainingHours: number;
  }> {
    const validation = await this.invitationService.validateNotExpired(token);

    if (!validation.isValid) {
      throw new BadRequestException(validation.reason || "Davet geçersiz veya süresi dolmuş");
    }

    const invitation = validation.invitation!;
    const remainingHours = this.invitationService.getRemainingHours(invitation);

    return {
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      remainingHours,
    };
  }

  /**
   * Şifre güçlülük kontrolü yapar
   *
   * Frontend validation için kullanılabilir.
   *
   * Minimum gereksinimler:
   * - En az 8 karakter
   * - En az 1 büyük harf
   * - En az 1 küçük harf
   * - En az 1 rakam
   *
   * @param password - Kontrol edilecek şifre
   * @returns Şifre geçerliyse true
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Şifre en az 8 karakter olmalıdır");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Şifre en az 1 büyük harf içermelidir");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Şifre en az 1 küçük harf içermelidir");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Şifre en az 1 rakam içermelidir");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Telefon numarası format doğrulaması yapar
   *
   * E.164 formatı: +90XXXXXXXXXX
   *
   * @param phone - Telefon numarası
   * @returns Geçerliyse true
   */
  validatePhoneFormat(phone: string): {
    isValid: boolean;
    error?: string;
  } {
    // E.164 formatı: +90XXXXXXXXXX
    const phoneRegex = /^\+90[1-9][0-9]{9}$/;

    if (!phoneRegex.test(phone)) {
      return {
        isValid: false,
        error: "Geçersiz telefon formatı. Beklenen format: +90XXXXXXXXXX (Türkiye)",
      };
    }

    // Operatör kodu kontrolü (5XX mobil, diğerleri sabit hat)
    const operatorCode = phone.charAt(3);

    if (operatorCode !== "5") {
      return {
        isValid: false,
        error: "Sadece mobil telefon numaraları kabul edilir (+905XXXXXXXXX)",
      };
    }

    return {
      isValid: true,
    };
  }
}
