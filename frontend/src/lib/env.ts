const requiredEnvVariables = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WS_URL"] as const;

type EnvKeys = (typeof requiredEnvVariables)[number];

type EnvConfig = Record<EnvKeys, string>;

/**
 * Frontend ortam değişkenlerini doğrular ve döndürür.
 * Eksik değişken olması durumunda hata fırlatır.
 */
export function getEnv(): EnvConfig {
  const missing: EnvKeys[] = [];
  const env = {} as EnvConfig;

  for (const key of requiredEnvVariables) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      env[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Eksik environment değişkenleri: ${missing.join(", ")}. Lütfen .env.local dosyasını kontrol edin.`,
    );
  }

  return env;
}

export const env = getEnv();
