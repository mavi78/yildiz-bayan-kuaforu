import { ConflictException } from "@nestjs/common";
import { AppointmentStatus, CreationMethod } from "@prisma/client";
import { CreateManualAppointmentUsecase } from "@usecases/appointments/create-manual-appointment.usecase";
import { CustomerService } from "@services/customer.service";
import { AppointmentService } from "@services/appointment.service";
import { NotificationService } from "@services/notifications/notification.service";

describe("CreateManualAppointmentUsecase", () => {
  let customerService: jest.Mocked<CustomerService>;
  let appointmentService: jest.Mocked<AppointmentService>;
  let notificationService: jest.Mocked<NotificationService>;
  let usecase: CreateManualAppointmentUsecase;

  beforeEach(() => {
    customerService = {
      findByPhone: jest.fn(),
      createGuest: jest.fn(),
    } as unknown as jest.Mocked<CustomerService>;

    appointmentService = {
      checkWorkingHours: jest.fn(),
      checkConflict: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<AppointmentService>;

    notificationService = {
      sendAppointmentConfirmed: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    usecase = new CreateManualAppointmentUsecase(
      customerService,
      appointmentService,
      notificationService,
    );
  });

  const baseInput = {
    staffId: "staff-1",
    serviceId: "service-1",
    firstName: "Zeynep",
    lastName: "Kara",
    phone: "+905551111111",
    date: "2025-01-22",
    time: "11:30",
  };

  it("should reuse existing customer if found by phone", async () => {
    customerService.findByPhone.mockResolvedValue({ id: "customer-1" } as any);
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(false as any);
    appointmentService.create.mockResolvedValue({
      id: "apt-1",
      status: AppointmentStatus.CONFIRMED,
    } as any);

    const result = await usecase.execute(baseInput);

    expect(result.appointmentId).toBe("apt-1");
    expect(customerService.createGuest).not.toHaveBeenCalled();
    const createArgs = appointmentService.create.mock.calls[0][0];
    expect(createArgs.creationMethod).toBe(CreationMethod.MANUAL);
    expect(createArgs.status).toBe(AppointmentStatus.CONFIRMED);
    expect(notificationService.sendAppointmentConfirmed).toHaveBeenCalled();
  });

  it("should create guest when customer not found", async () => {
    customerService.findByPhone.mockResolvedValue(null);
    customerService.createGuest.mockResolvedValue({ id: "guest-1" } as any);
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(false as any);
    appointmentService.create.mockResolvedValue({ id: "apt-2" } as any);

    await usecase.execute(baseInput);

    expect(customerService.createGuest).toHaveBeenCalledWith({
      firstName: "Zeynep",
      lastName: "Kara",
      phone: "+905551111111",
    });
  });

  it("should throw conflict when slot occupied", async () => {
    customerService.findByPhone.mockResolvedValue({ id: "customer-1" } as any);
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(true as any);

    await expect(usecase.execute(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });
});
