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

// Test timeout'u artır (veritabanı işlemleri için)
jest.setTimeout(30000);

// Global test konfigürasyonu
beforeAll(async () => {
  console.log("🧪 Test ortamı başlatılıyor...");
  await setupTestDb();
});

afterAll(async () => {
  console.log("🧹 Test ortamı temizleniyor...");
  await teardownTestDb();
});

// Her test öncesi temizlik
beforeEach(async () => {
  // Mock'ları temizle
  jest.clearAllMocks();
  // Veritabanını temizle
  await clearTables();
});

// Console.log'ları test sırasında gizle (isteğe bağlı)
if (process.env.NODE_ENV === "test") {
  // console.log = jest.fn();
  // console.warn = jest.fn();
  // console.error = jest.fn();
}
