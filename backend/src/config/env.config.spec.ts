import { validateEnvConfig } from "./env.config";

describe("EnvConfig Validation", () => {
  describe("validateEnvConfig", () => {
    it("geçerli zorunlu değişkenlerle başarılı olmalı", () => {
      const validConfig = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        JWT_SECRET: "test-secret-key-min-32-chars-long",
      };

      expect(() => validateEnvConfig(validConfig)).not.toThrow();
    });

    it("DATABASE_URL eksik olduğunda hata vermeli", () => {
      const invalidConfig = {
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        JWT_SECRET: "test-secret",
      };

      expect(() => validateEnvConfig(invalidConfig)).toThrow();
    });

    it("REDIS_HOST eksik olduğunda hata vermeli", () => {
      const invalidConfig = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_PORT: 6379,
        JWT_SECRET: "test-secret",
      };

      expect(() => validateEnvConfig(invalidConfig)).toThrow();
    });

    it("JWT_SECRET eksik olduğunda hata vermeli", () => {
      const invalidConfig = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
      };

      expect(() => validateEnvConfig(invalidConfig)).toThrow();
    });

    it("opsiyonel değişkenler olmadan çalışmalı", () => {
      const configWithoutOptionals = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        JWT_SECRET: "test-secret-key-min-32-chars-long",
      };

      expect(() => validateEnvConfig(configWithoutOptionals)).not.toThrow();
    });

    it("tüm opsiyonel değişkenlerle çalışmalı", () => {
      const fullConfig = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        REDIS_PASSWORD: "redis-pass",
        JWT_SECRET: "test-secret-key-min-32-chars-long",
        JWT_EXPIRES_IN_ADMIN: "8h",
        JWT_EXPIRES_IN_STAFF: "12h",
        JWT_EXPIRES_IN_CUSTOMER: "7d",
        GMAIL_USER: "test@gmail.com",
        GMAIL_APP_PASSWORD: "app-password",
        ILETI_MERKEZI_API_KEY: "api-key",
        ILETI_MERKEZI_API_SECRET: "api-secret",
        NODE_ENV: "development",
        BACKEND_PORT: 3000,
        FRONTEND_URL: "http://localhost:3001",
        NEXT_PUBLIC_API_URL: "http://localhost:3000",
        NEXT_PUBLIC_WS_URL: "ws://localhost:3000",
      };

      expect(() => validateEnvConfig(fullConfig)).not.toThrow();
    });

    it("REDIS_PORT string olarak verildiğinde number'a dönüştürmeli", () => {
      const configWithStringPort = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: "6379", // string olarak
        JWT_SECRET: "test-secret-key-min-32-chars-long",
      };

      expect(() => validateEnvConfig(configWithStringPort)).not.toThrow();
    });

    it("NODE_ENV geçersiz değer aldığında hata vermeli", () => {
      const invalidNodeEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        JWT_SECRET: "test-secret",
        NODE_ENV: "invalid-env",
      };

      expect(() => validateEnvConfig(invalidNodeEnv)).toThrow();
    });

    it("NODE_ENV development, production, test değerlerini kabul etmeli", () => {
      const baseConfig = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379,
        JWT_SECRET: "test-secret-key-min-32-chars-long",
      };

      ["development", "production", "test"].forEach((env) => {
        expect(() =>
          validateEnvConfig({ ...baseConfig, NODE_ENV: env }),
        ).not.toThrow();
      });
    });
  });
});
