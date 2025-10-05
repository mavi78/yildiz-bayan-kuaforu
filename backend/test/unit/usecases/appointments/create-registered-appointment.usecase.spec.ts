import { ConflictException, BadRequestException } from "@nestjs/common";
import { AppointmentStatus, CreationMethod } from "@prisma/client";
import { CreateRegisteredAppointmentUsecase } from "@usecases/appointments/create-registered-appointment.usecase";
import { AppointmentService } from "@services/appointment.service";

describe("CreateRegisteredAppointmentUsecase", () => {
  let usecase: CreateRegisteredAppointmentUsecase;
  let appointmentService: jest.Mocked<AppointmentService>;

  beforeEach(() => {
    appointmentService = {
      checkWorkingHours: jest.fn(),
      checkConflict: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<AppointmentService>;

    usecase = new CreateRegisteredAppointmentUsecase(appointmentService);
  });

  const baseInput = {
    customerId: "customer-1",
    staffId: "staff-1",
    serviceId: "service-1",
    date: "2025-01-20",
    time: "14:30",
  };

  it("should create registered appointment", async () => {
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(false as any);
    appointmentService.create.mockResolvedValue({ id: "apt-1" } as any);

    const result = await usecase.execute(baseInput);

    expect(result).toEqual({ appointmentId: "apt-1" });

    const createArgs = appointmentService.create.mock.calls[0][0];
    expect(createArgs.customer.connect.id).toBe("customer-1");
    expect(createArgs.staff.connect.id).toBe("staff-1");
    expect(createArgs.service.connect.id).toBe("service-1");
    expect(createArgs.status).toBe(AppointmentStatus.PENDING);
    expect(createArgs.creationMethod).toBe(CreationMethod.ONLINE_REGISTERED);
    expect(createArgs.time).toBe("14:30");
    expect(createArgs.date).toBeInstanceOf(Date);
  });

  it("should throw conflict when time slot occupied", async () => {
    appointmentService.checkWorkingHours.mockResolvedValue(true);
    appointmentService.checkConflict.mockResolvedValue(true as any);

    await expect(usecase.execute(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("should surface working hours validation errors", async () => {
    appointmentService.checkWorkingHours.mockRejectedValue(new BadRequestException("Salon kapalı"));

    await expect(usecase.execute(baseInput)).rejects.toBeInstanceOf(BadRequestException);
  });
});
