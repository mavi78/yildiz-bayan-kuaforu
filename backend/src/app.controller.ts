import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";

/**
 * Ana uygulama controller'ı
 *
 * @description
 * Health check ve temel bilgi endpoint'lerini sağlar.
 *
 * @controller /api
 */
@ApiTags("health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint'i
   *
   * @description
   * Uygulamanın çalışır durumda olduğunu doğrular.
   * Load balancer ve monitoring sistemleri için kullanılır.
   *
   * @returns {object} API durumu ve versiyon bilgisi
   */
  @Get()
  @ApiOperation({ summary: "Health check" })
  @ApiResponse({
    status: 200,
    description: "API çalışıyor",
    schema: {
      example: {
        status: "ok",
        message: "Yıldız Bayan Kuaförü API",
        version: "0.1.0",
      },
    },
  })
  getHello(): object {
    return this.appService.getHello();
  }
}
