import { BadRequestException, Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RegisterUsecase, RegisterResult } from "@usecases/auth/register.usecase";
import { LoginUsecase } from "@usecases/auth/login.usecase";
import { LogoutUsecase, LogoutResult } from "@usecases/auth/logout.usecase";
import { LoginResult } from "@services/auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

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
