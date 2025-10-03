import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ConvertGuestToRegisteredUsecase } from '@usecases/customers/convert-guest-to-registered.usecase';
import { CustomerService } from '@services/customer.service';
import { InvitationService } from '@services/invitation.service';

describe('ConvertGuestToRegisteredUsecase', () => {
  let customerService: jest.Mocked<CustomerService>;
  let invitationService: jest.Mocked<InvitationService>;
  let usecase: ConvertGuestToRegisteredUsecase;

  beforeEach(() => {
    customerService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CustomerService>;

    invitationService = {
      create: jest.fn(),
      generateInvitationLink: jest.fn(),
      generateEmailBody: jest.fn(),
    } as unknown as jest.Mocked<InvitationService>;

    usecase = new ConvertGuestToRegisteredUsecase(
      customerService,
      invitationService,
    );
  });

  it('should create invitation for guest customer with email', async () => {
    customerService.findById.mockResolvedValue({
      id: 'guest-1',
      type: 'GUEST',
      email: 'guest@example.com',
      firstName: 'Ada',
      lastName: 'Yılmaz',
    } as any);

    invitationService.create.mockResolvedValue({
      id: 'inv-1',
      token: 'token-123',
      email: 'guest@example.com',
      role: Role.CUSTOMER,
    } as any);

    invitationService.generateInvitationLink.mockReturnValue(
      'http://localhost:3000/register?token=token-123',
    );

    invitationService.generateEmailBody.mockReturnValue('<html>Davetiye</html>');

    const result = await usecase.execute({
      customerId: 'guest-1',
      inviterId: 'staff-1',
      salonName: 'Yıldız Bayan Kuaförü',
    });

    expect(invitationService.create).toHaveBeenCalledWith({
      email: 'guest@example.com',
      role: Role.CUSTOMER,
      inviterId: 'staff-1',
      guestCustomerId: 'guest-1',
    });
    expect(result.invitationLink).toContain('token-123');
    expect(result.invitationId).toBe('inv-1');
    expect(result.emailBody).toBe('<html>Davetiye</html>');
  });

  it('should throw when customer has no email', async () => {
    customerService.findById.mockResolvedValue({
      id: 'guest-1',
      type: 'GUEST',
      email: null,
    } as any);

    await expect(
      usecase.execute({ customerId: 'guest-1', inviterId: 'staff-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw when customer already registered', async () => {
    customerService.findById.mockResolvedValue({
      id: 'customer-1',
      type: 'REGISTERED',
      email: 'user@example.com',
    } as any);

    await expect(
      usecase.execute({ customerId: 'customer-1', inviterId: 'staff-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
