import { plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from "class-validator";

/**
 * Uygulama environment değişkenleri için doğrulama şeması
 */
class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_HOST!: string;

  @IsNumber()
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN_ADMIN?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN_STAFF?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN_CUSTOMER?: string;

  @IsOptional()
  @IsString()
  GMAIL_USER?: string;

  @IsOptional()
  @IsString()
  GMAIL_APP_PASSWORD?: string;

  @IsOptional()
  @IsString()
  ILETI_MERKEZI_API_KEY?: string;

  @IsOptional()
  @IsString()
  ILETI_MERKEZI_API_SECRET?: string;

  @IsOptional()
  @IsEnum(["development", "production", "test"])
  NODE_ENV?: string;

  @IsOptional()
  @IsNumber()
  BACKEND_PORT?: number;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  NEXT_PUBLIC_API_URL?: string;

  @IsOptional()
  @IsString()
  NEXT_PUBLIC_WS_URL?: string;
}

/**
 * Env değişkenlerini doğrular ve hatalı durumda uygulamayı durdurur
 */
export function validateEnvConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
