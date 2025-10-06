import { BadRequestException } from "@nestjs/common";
import { AppointmentService } from "@services/appointment.service";
import { AppointmentRepository } from "@repositories/appointment.repository";
import { WorkingHoursRepository } from "@repositories/working-hours.repository";
import { SpecialWorkingDayRepository } from "@repositories/special-working-day.repository";
import { ServiceRepository } from "@repositories/service.repository";

const buildDate = (value: string): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

describe("AppointmentService", () => {
  let appointmentRepository: jest.Mocked<AppointmentRepository>;
  let workingHoursRepository: jest.Mocked<WorkingHoursRepository>;
  let specialWorkingDayRepository: jest.Mocked<SpecialWorkingDayRepository>;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let service: AppointmentService;

  beforeEach(() => {
    appointmentRepository = {
      findConflicts: jest.fn(),
      findById: jest.fn(),
      findByTrackingCode: jest.fn(),
      isTrackingCodeTaken: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      findPending: jest.fn(),
      findByCustomer: jest.fn(),
      findByStaff: jest.fn(),
    } as unknown as jest.Mocked<AppointmentRepository>;

    workingHoursRepository = {
      findByDayOfWeek: jest.fn(),
    } as unknown as jest.Mocked<WorkingHoursRepository>;

    specialWorkingDayRepository = {
      findByDate: jest.fn(),
    } as unknown as jest.Mocked<SpecialWorkingDayRepository>;

    serviceRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ServiceRepository>;

    service = new AppointmentService(
      appointmentRepository,
      workingHoursRepository,
      specialWorkingDayRepository,
      serviceRepository,
    );
  });
  it("özel gün açıksa çalışma saati doğrulaması başarılı olmalı", async () => {
    const date = new Date("2025-05-12T12:00:00.000Z");

    specialWorkingDayRepository.findByDate.mockResolvedValue({
      id: "special-1",
      date: buildDate("2025-05-12"),
      isClosed: false,
      openTime: "09:00",
      closeTime: "18:00",
    } as any);

    const result = await service.checkWorkingHours(date, "10:00");

    expect(result).toBe(true);
    expect(specialWorkingDayRepository.findByDate).toHaveBeenCalledWith(buildDate("2025-05-12"));
    expect(workingHoursRepository.findByDayOfWeek).not.toHaveBeenCalled();
  });

  it("özel gün kapalıysa hata fırlatmalı", async () => {
    const date = new Date("2025-05-12T12:00:00.000Z");

    specialWorkingDayRepository.findByDate.mockResolvedValue({
      id: "special-2",
      date: buildDate("2025-05-12"),
      isClosed: true,
      description: "Bakım günü",
    } as any);

    await expect(service.checkWorkingHours(date, "11:00")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("özel gün yoksa normal çalışma saatlerini kullanmalı", async () => {
    const date = new Date("2025-05-13T12:00:00.000Z");

    specialWorkingDayRepository.findByDate.mockResolvedValue(null);
    workingHoursRepository.findByDayOfWeek.mockResolvedValue({
      dayOfWeek: 2,
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    } as any);

    const result = await service.checkWorkingHours(date, "16:30");

    expect(result).toBe(true);
    expect(workingHoursRepository.findByDayOfWeek).toHaveBeenCalledWith(2);
  });

  it("çalışma saatleri dışında randevuya izin vermemeli", async () => {
    const date = new Date("2025-05-13T12:00:00.000Z");

    specialWorkingDayRepository.findByDate.mockResolvedValue(null);
    workingHoursRepository.findByDayOfWeek.mockResolvedValue({
      dayOfWeek: 2,
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    } as any);

    await expect(service.checkWorkingHours(date, "18:00")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("takip kodu benzersiz olana kadar denemeye devam etmeli", async () => {
    appointmentRepository.isTrackingCodeTaken.mockResolvedValueOnce(true).mockResolvedValue(false);

    const code = await service.generateTrackingCode();

    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    expect(appointmentRepository.isTrackingCodeTaken).toHaveBeenCalledTimes(2);
  });

  it("müsait slotlardan çakışanları dışlamalı", async () => {
    const appointmentDate = new Date("2025-05-15T00:00:00.000Z");

    serviceRepository.findById.mockResolvedValue({
      id: "service-1",
      durationMinutes: 60,
    } as any);

    specialWorkingDayRepository.findByDate.mockResolvedValue(null);
    workingHoursRepository.findByDayOfWeek.mockResolvedValue({
      dayOfWeek: appointmentDate.getDay(),
      isClosed: false,
      openTime: "09:00",
      closeTime: "13:00",
    } as any);

    appointmentRepository.findConflicts
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValue(0);

    const slots = await service.findAvailableSlots(appointmentDate, "staff-1", "service-1");

    expect(slots).toEqual(["09:00", "11:00", "12:00"]);
    expect(appointmentRepository.findConflicts).toHaveBeenCalledTimes(4);
    expect(appointmentRepository.findConflicts.mock.calls.map(([, , time]) => time)).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
    ]);
  });
});
