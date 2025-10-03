import "reflect-metadata";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

// Jest global setup for NestJS tests
// Turkish JSDoc: Bu dosya testler başlamadan önce global ayarları yükler.

jest.setTimeout(30_000);

global.console = {
  ...console,
  // Test çıktılarında gereksiz gürültüyü azaltmak için log seviyelerini yeniden tanımlayabilirsiniz.
  warn: (...args: unknown[]) => console.warn("[JEST WARN]", ...args),
  error: (...args: unknown[]) => console.error("[JEST ERROR]", ...args),
};

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

process.on("unhandledRejection", reason => {
  console.error("[JEST ERROR] Unhandled rejection yakalandı", reason);
});

process.on("uncaughtException", error => {
  console.error("[JEST ERROR] Uncaught exception yakalandı", error);
});
