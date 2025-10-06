import { PrismaClient } from "@prisma/client";
import { setupTestDb, clearTables, teardownTestDb } from "../../helpers/db-helper";

describe("DB Helper Functions", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Test ortamını ayarla
    process.env.NODE_ENV = "test";
    prisma = await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe("setupTestDb", () => {
    it("test veritabanı bağlantısı kurmalı", async () => {
      expect(prisma).toBeDefined();
      expect(prisma).toBeInstanceOf(PrismaClient);
    });

    it("veritabanı bağlantısı çalışıyor olmalı", async () => {
      // Basit bir sorgu ile bağlantıyı test et
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it("aynı instance'ı döndürmeli (singleton)", async () => {
      const prisma2 = await setupTestDb();
      expect(prisma2).toBe(prisma);
    });
  });

  describe("clearTables", () => {
    it("test ortamında çalışmalı", async () => {
      process.env.NODE_ENV = "test";
      await expect(clearTables()).resolves.not.toThrow();
    });

    it("test dışı ortamda hata vermeli", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await expect(clearTables()).rejects.toThrow(
        "clearTables() sadece test ortamında çalıştırılabilir",
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("ALLOW_DB_CLEAR_IN_NON_TEST bayrağı ile test dışı ortamda çalışmalı", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      process.env.ALLOW_DB_CLEAR_IN_NON_TEST = "true";

      await expect(clearTables()).resolves.not.toThrow();

      process.env.NODE_ENV = originalEnv;
      delete process.env.ALLOW_DB_CLEAR_IN_NON_TEST;
    });

    it("bağlantı kurulmamışsa hata vermeli", async () => {
      await teardownTestDb();

      await expect(clearTables()).rejects.toThrow(
        "Veritabanı bağlantısı kurulmamış",
      );

      // Bağlantıyı tekrar kur
      prisma = await setupTestDb();
    });
  });

  describe("teardownTestDb", () => {
    it("veritabanı bağlantısını kapatmalı", async () => {
      await teardownTestDb();

      // Bağlantı kapalı, yeni sorgu yapılamaz
      await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow();

      // Bağlantıyı tekrar kur
      prisma = await setupTestDb();
    });

    it("birden fazla çağrıda hata vermemeli", async () => {
      await teardownTestDb();
      await expect(teardownTestDb()).resolves.not.toThrow();

      // Bağlantıyı tekrar kur
      prisma = await setupTestDb();
    });
  });

  describe("Test Database URL Derivation", () => {
    it("DATABASE_URL yoksa default test URL kullanmalı", async () => {
      const originalUrl = process.env.DATABASE_URL;
      const originalTestUrl = process.env.TEST_DATABASE_URL;

      delete process.env.DATABASE_URL;
      delete process.env.TEST_DATABASE_URL;

      await teardownTestDb();
      const testPrisma = await setupTestDb();

      expect(testPrisma).toBeDefined();

      process.env.DATABASE_URL = originalUrl;
      process.env.TEST_DATABASE_URL = originalTestUrl;
      prisma = testPrisma;
    });

    it("TEST_DATABASE_URL varsa onu kullanmalı", async () => {
      const originalTestUrl = process.env.TEST_DATABASE_URL;
      process.env.TEST_DATABASE_URL =
        "postgresql://testuser:testpass@localhost:5432/custom_test_db";

      await teardownTestDb();
      const testPrisma = await setupTestDb();

      expect(testPrisma).toBeDefined();

      process.env.TEST_DATABASE_URL = originalTestUrl;
      prisma = testPrisma;
    });
  });
});
