const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");

const moduleNameMapperConfig = pathsToModuleNameMapper(compilerOptions.paths || {}, {
  prefix: "<rootDir>/",
});

const tsTransform = {
  "^.+\\.ts$": [
    "ts-jest",
    {
      diagnostics: false,
    },
  ],
};

const baseProjectConfig = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: moduleNameMapperConfig,
  transform: tsTransform,
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleFileExtensions: ["js", "json", "ts"],
  clearMocks: true,
  restoreMocks: true,
};

/**
 * Jest konfigürasyonu - Backend test ortamı
 *
 * Bu konfigürasyon:
 * - TypeScript desteği sağlar
 * - Path mapping'i destekler (@/ alias'ları)
 * - Test coverage raporları oluşturur
 * - E2E testleri için ayrı konfigürasyon sağlar
 */
module.exports = {
  // Test ortamı
  passWithNoTests: true,
  // Test dosyalarının konumu
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],

  // Coverage konfigürasyonu
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.interface.ts",
    "!src/**/*.enum.ts",
    "!src/main.ts",
    "!src/**/*.module.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout (30 saniye)
  testTimeout: 30000,

  // Setup dosyaları
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],

  // Module file extensions
  moduleFileExtensions: ["js", "json", "ts"],

  // Test klasörleri
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],

  // E2E testleri için ayrı konfigürasyon
  projects: [
    {
      ...baseProjectConfig,
      displayName: "unit",
      testMatch: [
        "<rootDir>/src/**/*.spec.ts",
        "<rootDir>/test/unit/**/*.spec.ts",
      ],
    },
    {
      ...baseProjectConfig,
      displayName: "integration",
      testMatch: ["<rootDir>/test/integration/**/*.spec.ts"],
    },
    {
      ...baseProjectConfig,
      displayName: "e2e",
      testMatch: ["<rootDir>/test/e2e/**/*.spec.ts"],
    },
  ],

  // Verbose output
  verbose: true,
};
