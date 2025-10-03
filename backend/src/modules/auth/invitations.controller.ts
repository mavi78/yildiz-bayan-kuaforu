import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { InvitationService } from "@services/invitation.service";
import { Roles } from "@common/decorators/roles.decorator";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { RolesGuard } from "@common/guards/roles.guard";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { ListInvitationsQueryDto } from "./dto/list-invitations.dto";

/**
 * Yönetici davet işlemleri controller'ı
 */
@ApiTags("invitations")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(Role.ADMIN)
@Controller("admin/invitations")
export class InvitationsController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Yeni personel veya müşteri daveti oluşturur
   */
  @Post()
  async create(@Body() dto: CreateInvitationDto, @CurrentUser("userId") inviterId: string) {
    return this.invitationService.create({
      email: dto.email,
      role: dto.role,
      inviterId,
      guestCustomerId: dto.guestCustomerId,
    });
  }

  /**
   * Davet listesini döndürür
   */
  @Get()
  async findAll(@Query() query: ListInvitationsQueryDto) {
    const { isUsed, role, skip, take } = query;

    const [data, total] = await Promise.all([
      this.invitationService.findAll({ isUsed, role, skip, take }),
      this.invitationService.count({ isUsed, role }),
    ]);

    return {
      data,
      total,
    };
  }
}
