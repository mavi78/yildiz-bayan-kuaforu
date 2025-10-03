import { PrismaClient } from "@prisma/client";

/**
 * Test veritabanı yardımcı fonksiyonları (şema bağımsız)
 *
 * Bu dosya test sırasında veritabanı işlemlerini kolaylaştırır:
 * - Test veritabanı bağlantısı (ayrı DB: yildiz_salon_test)
 * - Tüm tabloları güvenli şekilde temizleme
 * - Bağlantıyı kapatma
 *
 * Not: Bu yardımcılar, modeller tanımlanmadan da (T018 öncesi) çalışır.
 */

let prisma: PrismaClient | null = null;

function deriveTestDbUrlFrom(databaseUrl?: string): string {
  if (!databaseUrl) {
    return "postgresql://postgres:postgres@localhost:5432/yildiz_salon_test?schema=public";
  }

  try {
    const url = new URL(databaseUrl);
    // Veritabanı adını test DB ile değiştir
    url.pathname = "/yildiz_salon_test";
    if (!url.searchParams.has("schema")) {
      url.searchParams.set("schema", "public");
    }
    return url.toString();
  } catch {
    return "postgresql://postgres:postgres@localhost:5432/yildiz_salon_test?schema=public";
  }
}

/**
 * Test veritabanı bağlantısını başlatır.
 * Test ortamında ayrı bir veritabanı kullanır (yildiz_salon_test).
 */
export async function setupTestDb(): Promise<PrismaClient> {
  if (!prisma) {
    const url = process.env.TEST_DATABASE_URL || deriveTestDbUrlFrom(process.env.DATABASE_URL);

    prisma = new PrismaClient({
      datasources: { db: { url } },
    });

    await prisma.$connect();
  }

  return prisma;
}

/**
 * Tüm tabloları temizler (test verilerini siler).
 * Güvenlik: Yalnızca NODE_ENV=test iken çalışır (veya ALLOW_DB_CLEAR_IN_NON_TEST=true ise).
 */
export async function clearTables(): Promise<void> {
  if (!prisma) {
    throw new Error("Veritabanı bağlantısı kurulmamış. Önce setupTestDb() çağırın.");
  }

  if (process.env.NODE_ENV !== "test" && process.env.ALLOW_DB_CLEAR_IN_NON_TEST !== "true") {
    throw new Error("clearTables() sadece test ortamında çalıştırılabilir. (NODE_ENV=test)");
  }

  // public şemasındaki tüm tabloları bul
  const tables = (await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  )) as Array<{ tablename: string }>;

  if (!tables || tables.length === 0) {
    return; // Tablolar henüz yoksa (T018 öncesi) sessizce çık
  }

  const tableList = tables.map(t => `"public"."${t.tablename}"`).join(", ");

  // FK kontrollerini gevşet, truncate, sonra geri al
  await prisma.$executeRawUnsafe("SET session_replication_role = replica;");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT;");
}

/**
 * Test veritabanı bağlantısını kapatır.
 */
export async function teardownTestDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
