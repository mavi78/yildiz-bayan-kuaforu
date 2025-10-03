/**
 * Seed Script: Development Veritabanı İçin Başlangıç Verisi
 *
 * Bu script geliştirme ortamı için gerekli başlangıç verilerini oluşturur:
 * - 1 Admin kullanıcı
 * - 2 Personel kullanıcı
 * - 5 Hizmet
 * - Çalışma saatleri (Pzt-Cmt 09:00-19:00)
 *
 * Kullanım: pnpm prisma:seed
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Şifreyi bcrypt ile hashler
 * @param password - Hashlenecek şifre
 * @returns Hashlenmiş şifre
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Admin kullanıcı oluşturur
 */
async function seedAdmin() {
  console.log("🔐 Admin kullanıcı oluşturuluyor...");

  const adminPassword = await hashPassword("Admin123!");

  await prisma.user.upsert({
    where: { email: "admin@yildiz.com" },
    update: {},
    create: {
      email: "admin@yildiz.com",
      phone: "+905551234501",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "Yıldız",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Admin kullanıcı oluşturuldu: admin@yildiz.com / Admin123!");
}

/**
 * Personel kullanıcıları oluşturur
 */
async function seedStaff() {
  console.log("👥 Personel kullanıcıları oluşturuluyor...");

  const staff1Password = await hashPassword("Staff123!");
  const staff2Password = await hashPassword("Staff123!");

  // Personel 1
  await prisma.user.upsert({
    where: { email: "ayse.kaya@yildiz.com" },
    update: {},
    create: {
      email: "ayse.kaya@yildiz.com",
      phone: "+905551234502",
      passwordHash: staff1Password,
      firstName: "Ayşe",
      lastName: "Kaya",
      role: "STAFF",
      isActive: true,
    },
  });

  // Personel 2
  await prisma.user.upsert({
    where: { email: "fatma.demir@yildiz.com" },
    update: {},
    create: {
      email: "fatma.demir@yildiz.com",
      phone: "+905551234503",
      passwordHash: staff2Password,
      firstName: "Fatma",
      lastName: "Demir",
      role: "STAFF",
      isActive: true,
    },
  });

  console.log("✅ Personel kullanıcıları oluşturuldu:");
  console.log("   - ayse.kaya@yildiz.com / Staff123!");
  console.log("   - fatma.demir@yildiz.com / Staff123!");
}

/**
 * Hizmetleri oluşturur
 */
async function seedServices() {
  console.log("💇 Hizmetler oluşturuluyor...");

  const services = [
    {
      name: "Saç Kesimi",
      description: "Profesyonel saç kesimi ve şekillendirme",
      durationMinutes: 45,
      price: 250,
    },
    {
      name: "Saç Boyama",
      description: "Kaliteli boya ile profesyonel saç boyama",
      durationMinutes: 120,
      price: 800,
    },
    {
      name: "Fön",
      description: "Profesyonel fön ve şekillendirme",
      durationMinutes: 30,
      price: 150,
    },
    {
      name: "Manikür",
      description: "El ve tırnak bakımı",
      durationMinutes: 45,
      price: 200,
    },
    {
      name: "Pedikür",
      description: "Ayak ve tırnak bakımı",
      durationMinutes: 60,
      price: 250,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: true,
      },
    });
  }

  console.log("✅ 5 hizmet oluşturuldu");
}

/**
 * Çalışma saatlerini oluşturur (Pazartesi-Cumartesi 09:00-19:00)
 */
async function seedWorkingHours() {
  console.log("🕐 Çalışma saatleri oluşturuluyor...");

  const workingDays = [
    { dayOfWeek: 1, name: "Pazartesi", openTime: "09:00", closeTime: "19:00", isClosed: false }, // Monday
    { dayOfWeek: 2, name: "Salı", openTime: "09:00", closeTime: "19:00", isClosed: false }, // Tuesday
    { dayOfWeek: 3, name: "Çarşamba", openTime: "09:00", closeTime: "19:00", isClosed: false }, // Wednesday
    { dayOfWeek: 4, name: "Perşembe", openTime: "09:00", closeTime: "19:00", isClosed: false }, // Thursday
    { dayOfWeek: 5, name: "Cuma", openTime: "09:00", closeTime: "19:00", isClosed: false }, // Friday
    { dayOfWeek: 6, name: "Cumartesi", openTime: "09:00", closeTime: "19:00", isClosed: false }, // Saturday
    { dayOfWeek: 0, name: "Pazar", openTime: null, closeTime: null, isClosed: true }, // Sunday (closed)
  ];

  for (const day of workingDays) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: {},
      create: {
        dayOfWeek: day.dayOfWeek,
        openTime: day.openTime,
        closeTime: day.closeTime,
        isClosed: day.isClosed,
      },
    });
  }

  console.log("✅ Çalışma saatleri oluşturuldu (Pzt-Cmt 09:00-19:00, Pazar kapalı)");
}

/**
 * Ana seed fonksiyonu
 */
async function main() {
  console.log("🌱 Seed script başlıyor...\n");

  try {
    // Sırasıyla seed işlemlerini çalıştır
    await seedAdmin();
    await seedStaff();
    await seedServices();
    await seedWorkingHours();

    console.log("\n✨ Seed işlemi başarıyla tamamlandı!");
    console.log("\n📝 Test hesapları:");
    console.log("   Admin: admin@yildiz.com / Admin123!");
    console.log("   Personel 1: ayse.kaya@yildiz.com / Staff123!");
    console.log("   Personel 2: fatma.demir@yildiz.com / Staff123!");
  } catch (error) {
    console.error("❌ Seed işlemi sırasında hata:", error);
    throw error;
  }
}

// Script'i çalıştır
main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
