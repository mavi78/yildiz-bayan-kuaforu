import { BadRequestException, ConflictException } from "@nestjs/common";
import { CustomerType } from "@prisma/client";
import { CustomerService } from "@services/customer.service";
import { CustomerRepository } from "@repositories/customer.repository";

describe("CustomerService", () => {
  let repository: jest.Mocked<CustomerRepository>;
  let service: CustomerService;

  beforeEach(() => {
    repository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      isPhoneTaken: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      convertToRegistered: jest.fn(),
      incrementStats: jest.fn(),
      findByUserId: jest.fn(),
      findGuests: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateStats: jest.fn(),
    } as unknown as jest.Mocked<CustomerRepository>;

    service = new CustomerService(repository);
  });

  it("misafir müşteri mevcutsa aynı kaydı döndürmeli", async () => {
    const guest = { id: "guest-1", type: CustomerType.GUEST } as any;
    repository.findByPhone.mockResolvedValue(guest);

    const result = await service.createGuest({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "+905551234567",
    });

    expect(result).toBe(guest);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("telefon numarası kayıtlı müşteriye aitse hata fırlatmalı", async () => {
    repository.findByPhone.mockResolvedValue({
      id: "customer-1",
      type: CustomerType.REGISTERED,
    } as any);

    await expect(
      service.createGuest({
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "+905551234567",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("yeni misafir müşteri oluşturmalı", async () => {
    repository.findByPhone.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: "guest-2" } as any);

    const result = await service.createGuest({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "+905551234568",
      email: "ayse@example.com",
    });

    expect(result.id).toBe("guest-2");
    expect(repository.create).toHaveBeenCalledWith({
      type: CustomerType.GUEST,
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "+905551234568",
      email: "ayse@example.com",
      birthDate: undefined,
      notes: undefined,
    });
  });

  it("kayıtlı müşteri oluştururken telefon ve email çakışmalarını kontrol etmeli", async () => {
    repository.isPhoneTaken.mockResolvedValue(false);
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: "customer-2" } as any);

    const result = await service.createRegistered({
      userId: "user-1",
      firstName: "Mehmet",
      lastName: "Demir",
      phone: "+905551234570",
      email: "mehmet@example.com",
    });

    expect(result.id).toBe("customer-2");
    expect(repository.create).toHaveBeenCalledWith({
      type: CustomerType.REGISTERED,
      user: { connect: { id: "user-1" } },
      firstName: "Mehmet",
      lastName: "Demir",
      phone: "+905551234570",
      email: "mehmet@example.com",
      birthDate: undefined,
      notes: undefined,
    });
  });

  it("kayıtlı müşteri oluştururken telefon kullanımdaysa hata fırlatmalı", async () => {
    repository.isPhoneTaken.mockResolvedValue(true);

    await expect(
      service.createRegistered({
        userId: "user-1",
        firstName: "Mehmet",
        lastName: "Demir",
        phone: "+905551234570",
        email: "mehmet@example.com",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("misafir olmayan müşteriyi kayıtlıya dönüştürmeye çalışırsa hata fırlatmalı", async () => {
    repository.findById.mockResolvedValue({
      id: "customer-3",
      type: CustomerType.REGISTERED,
    } as any);

    await expect(service.convertGuestToRegistered("customer-3", "user-2")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("randevusu olan müşteri silinememeli", async () => {
    repository.findById.mockResolvedValue({
      id: "customer-4",
      type: CustomerType.GUEST,
      appointments: [{ id: "apt-1" }],
    } as any);

    await expect(service.delete("customer-4")).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
