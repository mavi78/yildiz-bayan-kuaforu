import { BadRequestException, Body, Controller, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
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
  @ApiOperation({
    summary: "Kullanıcı kaydı",
    description: "Davet token'ı ile yeni kullanıcı oluşturur (FR-001, FR-002)",
  })
  @ApiResponse({
    status: 201,
    description: "Kayıt başarılı, JWT token döndürülür",
  })
  @ApiResponse({
    status: 400,
    description: "Geçersiz davet token'ı veya süresi dolmuş",
  })
  @ApiResponse({
    status: 409,
    description: "Email veya telefon numarası zaten kullanımda (FR-004)",
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.registerUsecase.execute(dto);
  }

  /**
   * Kullanıcı girişi (email veya telefon ile)
   */
  @Post("login")
  @ApiOperation({
    summary: "Kullanıcı girişi",
    description: "Email veya telefon numarası ile giriş yapar (FR-005, FR-007, FR-008)",
  })
  @ApiResponse({
    status: 200,
    description: "Giriş başarılı, JWT token döndürülür",
  })
  @ApiResponse({
    status: 401,
    description: "Geçersiz kimlik bilgileri veya hesap kilitli (FR-007)",
  })
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.loginUsecase.execute(dto);
  }

  /**
   * Çıkış - JWT token'ı blacklist'e ekler
   */
  @Post("logout")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Kullanıcı çıkışı",
    description: "Aktif JWT token'ı blacklist'e ekler (FR-008)",
  })
  @ApiResponse({
    status: 200,
    description: "Çıkış başarılı",
  })
  @ApiResponse({
    status: 401,
    description: "Geçersiz veya eksik JWT token",
  })
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
