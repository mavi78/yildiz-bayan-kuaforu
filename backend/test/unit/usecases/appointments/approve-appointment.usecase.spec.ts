import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { ApproveAppointmentUsecase } from '@usecases/appointments/approve-appointment.usecase';
import { AppointmentService } from '@services/appointment.service';
import { NotificationService } from '@services/notifications/notification.service';

describe('ApproveAppointmentUsecase', () => {
  let appointmentService: jest.Mocked<AppointmentService>;
  let notificationService: jest.Mocked<NotificationService>;
  let usecase: ApproveAppointmentUsecase;

  const pendingAppointment = {
    id: 'apt-1',
    staffId: 'staff-1',
    date: new Date('2025-01-21T00:00:00.000Z'),
    time: '15:00',
    status: AppointmentStatus.PENDING,
  } as any;

  beforeEach(() => {
    appointmentService = {
      findById: jest.fn().mockResolvedValue(pendingAppointment),
      checkConflict: jest.fn().mockResolvedValue(false as any),
      updateStatus: jest.fn().mockResolvedValue({
        ...pendingAppointment,
        status: AppointmentStatus.CONFIRMED,
      }),
    } as unknown as jest.Mocked<AppointmentService>;

    notificationService = {
      sendAppointmentConfirmed: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    usecase = new ApproveAppointmentUsecase(
      appointmentService,
      notificationService,
    );
  });

  it('should approve appointment when no conflict', async () => {
    const result = await usecase.execute({ appointmentId: 'apt-1' });

    expect(result.appointmentId).toBe('apt-1');
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    expect(result.appointment).toEqual(
      expect.objectContaining({ id: 'apt-1', status: AppointmentStatus.CONFIRMED }),
    );
    expect(appointmentService.updateStatus).toHaveBeenCalledWith(
      'apt-1',
      AppointmentStatus.CONFIRMED,
    );
    expect(notificationService.sendAppointmentConfirmed).toHaveBeenCalled();
  });

  it('should throw conflict when slot occupied without override', async () => {
    appointmentService.checkConflict.mockResolvedValue(true as any);

    await expect(
      usecase.execute({ appointmentId: 'apt-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should require justification when override requested', async () => {
    appointmentService.checkConflict.mockResolvedValue(true as any);

    await expect(
      usecase.execute({ appointmentId: 'apt-1', override: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should approve with override when justification provided', async () => {
    appointmentService.checkConflict.mockResolvedValue(true as any);

    const result = await usecase.execute({
      appointmentId: 'apt-1',
      override: true,
      justification: 'VIP müşteri için çifte rezervasyon onayı',
    });

    expect(appointmentService.updateStatus).toHaveBeenCalled();
    expect(notificationService.sendAppointmentConfirmed).toHaveBeenCalled();
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
  });
});
