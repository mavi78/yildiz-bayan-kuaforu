import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { SharedModule } from "@modules/shared";
import { AuthController } from "./auth.controller";
import { InvitationsController } from "./invitations.controller";
import { RegisterUsecase } from "@usecases/auth/register.usecase";
import { LoginUsecase } from "@usecases/auth/login.usecase";
import { LogoutUsecase } from "@usecases/auth/logout.usecase";
import { AuthService } from "@services/auth.service";
import { RolesGuard } from "@common/guards/roles.guard";
import { JwtStrategy } from "@common/guards/jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "8h",
        },
      }),
    }),
  ],
  controllers: [AuthController, InvitationsController],
  providers: [AuthService, RegisterUsecase, LoginUsecase, LogoutUsecase, RolesGuard, JwtStrategy],
  exports: [AuthService, RegisterUsecase, LoginUsecase, LogoutUsecase, JwtStrategy],
})
export class AuthModule {}
