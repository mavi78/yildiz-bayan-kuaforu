import { InvitationsController } from "@modules/auth/invitations.controller";
import { InvitationService } from "@services/invitation.service";
import { Role } from "@prisma/client";

const createController = () => {
  const invitationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<InvitationService>;

  const controller = new InvitationsController(invitationService);

  return {
    controller,
    invitationService,
  };
};

describe("InvitationsController", () => {
  it("should create invitation with inviter id", async () => {
    const { controller, invitationService } = createController();
    const dto = {
      email: "staff@example.com",
      role: Role.STAFF,
    };
    const inviterId = "admin-1";
    const createdInvitation = {
      id: "inv-1",
      token: "token-123",
      email: dto.email,
      role: dto.role,
    } as any;

    invitationService.create.mockResolvedValue(createdInvitation);

    const result = await controller.create(dto as any, inviterId);

    expect(invitationService.create).toHaveBeenCalledWith({
      email: dto.email,
      role: dto.role,
      inviterId,
      guestCustomerId: undefined,
    });
    expect(result).toEqual(createdInvitation);
  });

  it("should list invitations with filters", async () => {
    const { controller, invitationService } = createController();
    const query = {
      isUsed: "true",
      role: Role.STAFF,
      skip: "10",
      take: "5",
    };

    const invitations = [{ id: "inv-1" } as any];
    invitationService.findAll.mockResolvedValue(invitations);
    invitationService.count.mockResolvedValue(1);

    const result = await controller.findAll(query as any);

    expect(invitationService.findAll).toHaveBeenCalledWith({
      isUsed: true,
      role: Role.STAFF,
      skip: 10,
      take: 5,
    });
    expect(invitationService.count).toHaveBeenCalledWith({
      isUsed: true,
      role: Role.STAFF,
    });
    expect(result).toEqual({
      data: invitations,
      total: 1,
    });
  });
});
