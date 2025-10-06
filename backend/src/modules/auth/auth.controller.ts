import { BadRequestException, Body, Controller, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RegisterUsecase, RegisterResult } from "@usecases/auth/register.usecase";
import { LoginUsecase } from "@usecases/auth/login.usecase";
import { LogoutUsecase, LogoutResult } from "@usecases/auth/logout.usecase";
import { LoginResult, AuthService } from "@services/auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Roles } from "@common/decorators/roles.decorator";
import { RolesGuard } from "@common/guards/roles.guard";

/**
 * Kimlik doğrulama endpoint'leri
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUsecase: RegisterUsecase,
    private readonly loginUsecase: LoginUsecase,
    private readonly logoutUsecase: LogoutUsecase,
    private readonly authService: AuthService,
  ) {}

  /**
   * Davet token'ı ile kullanıcı kaydı
   */
  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.registerUsecase.execute(dto);
  }

  /**
   * Kullanıcı girişi (email veya telefon ile)
   */
  @Post("login")
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.loginUsecase.execute(dto);
  }

  /**
   * Çıkış - JWT token'ı blacklist'e ekler
   */
  @Post("logout")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  async logout(@Headers("authorization") authorization?: string): Promise<LogoutResult> {
    if (!authorization) {
      throw new BadRequestException("Authorization header is required");
    }

    const token = this.extractTokenFromHeader(authorization);

    if (!token) {
      throw new BadRequestException("Bearer token bulunamadı");
    }

    return this.logoutUsecase.execute({ token });
  }

  /**
   * Admin force logout - herhangi bir kullanıcının oturumunu sonlandır (FR-009)
   */
  @Post("admin/users/:userId/force-logout")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  async forceLogout(@Param("userId") userId: string): Promise<{ success: boolean; message: string }> {
    await this.authService.forceLogout(userId);

    return {
      success: true,
      message: `Kullanıcı ${userId} zorla logout edildi. Tüm aktif oturumları sonlandırıldı.`,
    };
  }

  /**
   * Authorization header'dan Bearer token'ı çıkarır
   */
  private extractTokenFromHeader(header: string): string | null {
    const parts = header.split(" ");

    if (parts.length === 2) {
      const [scheme, token] = parts;
      if (/^Bearer$/i.test(scheme) && token) {
        return token;
      }
    }

    return null;
  }
}
