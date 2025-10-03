/**
 * Test veri yardımcı fonksiyonları
 *
 * Bu dosya test sırasında kullanılacak örnek verileri sağlar:
 * - Mock kullanıcı verileri
 * - Mock randevu verileri
 * - Mock API response'ları
 */

// Prisma types are imported for type definitions but not used directly in this file

/**
 * Test kullanıcı verileri
 */
export const testUsers = {
  admin: {
    email: "admin@yildizsalon.com",
    phone: "+905551234567",
    passwordHash: "$2b$10$example.hash.for.testing",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN" as const,
    isActive: true,
  },
  staff: {
    email: "staff@yildizsalon.com",
    phone: "+905551234568",
    passwordHash: "$2b$10$example.hash.for.testing",
    firstName: "Staff",
    lastName: "User",
    role: "STAFF" as const,
    isActive: true,
  },
  customer: {
    email: "customer@test.com",
    phone: "+905551234569",
    passwordHash: "$2b$10$example.hash.for.testing",
    firstName: "Test",
    lastName: "Customer",
    role: "CUSTOMER" as const,
    isActive: true,
  },
};

/**
 * Test müşteri verileri
 */
export const testCustomers = {
  registered: {
    type: "REGISTERED" as const,
    firstName: "Test",
    lastName: "Customer",
    email: "customer@test.com",
    phone: "+905551234569",
  },
  guest: {
    type: "GUEST" as const,
    firstName: "Guest",
    lastName: "Customer",
    email: null,
    phone: "+905551234570",
  },
};

/**
 * Test hizmet verileri
 */
export const testServices = {
  haircut: {
    name: "Saç Kesimi",
    description: "Kadın saç kesimi hizmeti",
    durationMinutes: 60,
    price: 150.0,
    isActive: true,
  },
  coloring: {
    name: "Saç Boyama",
    description: "Saç boyama hizmeti",
    durationMinutes: 120,
    price: 300.0,
    isActive: true,
  },
  manicure: {
    name: "Manikür",
    description: "El bakım hizmeti",
    durationMinutes: 45,
    price: 80.0,
    isActive: true,
  },
};

/**
 * Test randevu verileri
 */
export const testAppointments = {
  pending: {
    date: new Date("2024-01-15"),
    time: "10:00",
    status: "PENDING" as const,
    creationMethod: "ONLINE_GUEST" as const,
    trackingCode: "TEST1234",
    notes: "Test randevu notu",
  },
  confirmed: {
    date: new Date("2024-01-16"),
    time: "14:00",
    status: "CONFIRMED" as const,
    creationMethod: "ONLINE_REGISTERED" as const,
    notes: "Onaylanmış test randevusu",
  },
  completed: {
    date: new Date("2024-01-10"),
    time: "16:00",
    status: "COMPLETED" as const,
    creationMethod: "MANUAL" as const,
    notes: "Tamamlanmış test randevusu",
  },
};

/**
 * Test ödeme verileri
 */
export const testPayments = {
  cash: {
    amount: 150.0,
    method: "CASH" as const,
    paidAt: new Date(),
  },
  card: {
    amount: 300.0,
    method: "POS_CARD" as const,
    paidAt: new Date(),
  },
  veresiye: {
    amount: 200.0,
    method: "VERESIYE" as const,
    paidAt: new Date(),
    veresiyeDueDate: new Date("2024-02-01"),
    veresiyeCollateral: "Kimlik fotokopisi",
    veresiyeResponsible: "Staff User",
  },
};

/**
 * Test çalışma saatleri verileri
 */
export const testWorkingHours = [
  { dayOfWeek: 1, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Pazartesi
  { dayOfWeek: 2, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Salı
  { dayOfWeek: 3, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Çarşamba
  { dayOfWeek: 4, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Perşembe
  { dayOfWeek: 5, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Cuma
  { dayOfWeek: 6, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Cumartesi
  { dayOfWeek: 0, isClosed: true }, // Pazar kapalı
];

/**
 * Test API response'ları
 */
export const testApiResponses = {
  success: {
    success: true,
    message: "İşlem başarılı",
    data: {},
  },
  error: {
    success: false,
    message: "Bir hata oluştu",
    error: "VALIDATION_ERROR",
  },
  validationError: {
    success: false,
    message: "Doğrulama hatası",
    errors: [
      {
        field: "email",
        message: "Geçerli bir email adresi giriniz",
      },
    ],
  },
};

/**
 * Test JWT token'ları (mock)
 */
export const testJwtTokens = {
  admin:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AeWlsZHpzYWxvbi5jb20iLCJyb2xlIjoiQURNSU4iLCJqdGkiOiJhZG1pbi1qdGkiLCJpYXQiOjE2NDA5NjQ4MDAsImV4cCI6MTY0MTI2NDgwMH0.example",
  staff:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdGFmZi1pZCIsImVtYWlsIjoic3RhZmZAeWlsZHpzYWxvbi5jb20iLCJyb2xlIjoiU1RBRkYiLCJqdGkiOiJzdGFmZi1qdGkiLCJpYXQiOjE2NDA5NjQ4MDAsImV4cCI6MTY0MTI2NDgwMH0.example",
  customer:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjdXN0b21lci1pZCIsImVtYWlsIjoiY3VzdG9tZXJAdGVzdC5jb20iLCJyb2xlIjoiQ1VTVE9NRVIiLCJqdGkiOiJjdXN0b21lci1qdGkiLCJpYXQiOjE2NDA5NjQ4MDAsImV4cCI6MTY0MTI2NDgwMH0.example",
};

/**
 * Test için rastgele veri oluşturucu fonksiyonlar
 */
export function createRandomPhone(): string {
  const areaCode = "90555";
  const number = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, "0");
  return `+${areaCode}${number}`;
}

export function createRandomEmail(prefix: string = "test"): string {
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${random}@test.com`;
}

export function createRandomTrackingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Test için tarih yardımcı fonksiyonları
 */
export function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function getNextWeek(): Date {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek;
}

export function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}
