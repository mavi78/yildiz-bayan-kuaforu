import { ConflictException, BadRequestException } from '@nestjs/common';
import { AppointmentStatus, CreationMethod } from '@prisma/client';
import { CreateGuestAppointmentUsecase } from '@usecases/appointments/create-guest-appointment.usecase';
import { CustomerService } from '@services/customer.service';
import { AppointmentService } from '@services/appointment.service';

describe('CreateGuestAppointmentUsecase', () => {
  let usecase: CreateGuestAppointmentUsecase;
  let customerService: jest.Mocked<CustomerService>;
  let appointmentService: jest.Mocked<AppointmentService>;

  beforeEach(() => {
    customerService = {
      createGuest: jest.fn(),
    } as unknown as jest.Mocked<CustomerService>;

    appointmentService = {
      checkWorkingHours: jest.fn(),
      checkConflict: jest.fn(),
      generateTrackingCode: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<AppointmentService>;

    usecase = new CreateGuestAppointmentUsecase(
      customerService,
      appointmentService,
    );
  });

  const baseInput = {
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    phone: '+905551234567',
    serviceId: 'service-1',
    staffId: 'staff-1',
    date: '2025-01-15',
    time: '10:00',
  };

  it('should create guest appointment and return tracking code', async () => {
    customerService.createGuest.mockResolvedValue({ id: 'customer-1' } as any);
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(false as any);
    appointmentService.generateTrackingCode.mockResolvedValue('TRACK123');
    appointmentService.create.mockResolvedValue({ id: 'apt-1' } as any);

    const result = await usecase.execute(baseInput);

    expect(result).toEqual({
      appointmentId: 'apt-1',
      customerId: 'customer-1',
      trackingCode: 'TRACK123',
    });

    expect(customerService.createGuest).toHaveBeenCalledWith({
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      phone: '+905551234567',
    });

    const createArgs = appointmentService.create.mock.calls[0][0];
    expect(createArgs.customer.connect.id).toBe('customer-1');
    expect(createArgs.staff.connect.id).toBe('staff-1');
    expect(createArgs.service.connect.id).toBe('service-1');
    expect(createArgs.status).toBe(AppointmentStatus.PENDING);
    expect(createArgs.creationMethod).toBe(CreationMethod.ONLINE_GUEST);
    expect(createArgs.trackingCode).toBe('TRACK123');
    expect(createArgs.time).toBe('10:00');
    expect(createArgs.date).toBeInstanceOf(Date);
  });

  it('should throw conflict exception when staff has conflict', async () => {
    customerService.createGuest.mockResolvedValue({ id: 'customer-1' } as any);
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(true as any);

    await expect(usecase.execute(baseInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should propagate working hours validation errors', async () => {
    customerService.createGuest.mockResolvedValue({ id: 'customer-1' } as any);
    appointmentService.checkWorkingHours.mockRejectedValue(
      new BadRequestException('Salon kapalı'),
    );

    await expect(usecase.execute(baseInput)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
