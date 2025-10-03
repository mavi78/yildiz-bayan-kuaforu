/**
 * Jest test setup dosyası
 *
 * Bu dosya tüm testlerden önce çalışır ve:
 * - Global test konfigürasyonu sağlar
 * - Test veritabanı bağlantısını kurar
 * - Mock'ları ayarlar
 */

import "reflect-metadata";
import { setupTestDb, teardownTestDb, clearTables } from "./helpers/db-helper";

const skipDbSetup = process.env.SKIP_DB_SETUP === "true";

if (skipDbSetup) {
  console.log("⚙️  DB kurulum adımı SKIP_DB_SETUP bayrağı nedeniyle atlanıyor.");
}

// Test timeout'u artır (veritabanı işlemleri için)
jest.setTimeout(30000);

// Global test konfigürasyonu
beforeAll(async () => {
  console.log("🧪 Test ortamı başlatılıyor...");
  if (skipDbSetup) {
    return;
  }
  await setupTestDb();
});

afterAll(async () => {
  console.log("🧹 Test ortamı temizleniyor...");
  if (skipDbSetup) {
    return;
  }
  await teardownTestDb();
});

// Her test öncesi temizlik
beforeEach(async () => {
  // Mock'ları temizle
  jest.clearAllMocks();
  // Veritabanını temizle
  if (skipDbSetup) {
    return;
  }
  await clearTables();
});

// Console.log'ları test sırasında gizle (isteğe bağlı)
if (process.env.NODE_ENV === "test") {
  // console.log = jest.fn();
  // console.warn = jest.fn();
  // console.error = jest.fn();
}
