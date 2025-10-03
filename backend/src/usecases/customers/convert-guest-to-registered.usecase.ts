import { BadRequestException, Injectable } from "@nestjs/common";
import { CustomerType, Role } from "@prisma/client";
import { CustomerService } from "@services/customer.service";
import { InvitationService } from "@services/invitation.service";

export interface ConvertGuestToRegisteredInput {
  customerId: string;
  inviterId: string;
  inviterName?: string;
  salonName?: string;
  baseUrl?: string;
}

export interface ConvertGuestToRegisteredResult {
  invitationId: string;
  token: string;
  invitationLink: string;
  emailBody: string;
}

/**
 * Misafir müşteriyi davetiye ile kayıtlı müşteriye dönüştürme usecase'i.
 *
 * Müşterinin email adresi mevcutsa davet oluşturur, davet linkini üretir ve
 * email içeriğini hazırlar. Misafir müşteriye özel davet süreci T060 kapsamında
 * bu sınıf tarafından yönetilir.
 *
 * @class ConvertGuestToRegisteredUsecase
 */
@Injectable()
export class ConvertGuestToRegisteredUsecase {
  constructor(
    private readonly customerService: CustomerService,
    private readonly invitationService: InvitationService,
  ) {}

  /**
   * Misafir müşteriye davet gönderir.
   *
   * @param payload - Davet oluşturma verileri
   * @returns Davet bilgileri ve email içeriği
   *
   * @throws {BadRequestException} Müşteri misafir değilse veya email adresi yoksa
   */
  async execute(payload: ConvertGuestToRegisteredInput): Promise<ConvertGuestToRegisteredResult> {
    const customer = await this.customerService.findById(payload.customerId);

    if (customer.type !== CustomerType.GUEST) {
      throw new BadRequestException("Sadece misafir durumundaki müşteriler davet edilebilir.");
    }

    if (!customer.email) {
      throw new BadRequestException(
        "Davetiye gönderebilmek için müşterinin email adresi gereklidir.",
      );
    }

    const invitation = await this.invitationService.create({
      email: customer.email,
      role: Role.CUSTOMER,
      inviterId: payload.inviterId,
      guestCustomerId: customer.id,
    });

    const invitationLink = this.invitationService.generateInvitationLink(
      invitation.token,
      payload.baseUrl,
    );

    const emailBody = this.invitationService.generateEmailBody(
      payload.inviterName || "Yıldız Bayan Kuaförü",
      payload.salonName || "Yıldız Bayan Kuaförü",
      invitationLink,
    );

    return {
      invitationId: invitation.id,
      token: invitation.token,
      invitationLink,
      emailBody,
    };
  }
}
