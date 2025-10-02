import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { validateEnvConfig } from "./env.config";

/**
 * ConfigModule - Environment değişkenlerini doğrular ve global olarak sağlar.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../.env",
      validate: validateEnvConfig,
    }),
  ],
})
export class ConfigModule {}
