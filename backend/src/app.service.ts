import { Injectable } from "@nestjs/common";

/**
 * Ana uygulama servisi
 *
 * @description
 * Temel uygulama bilgilerini sağlar.
 *
 * @service
 */
@Injectable()
export class AppService {
  /**
   * API bilgilerini döndürür
   *
   * @returns {object} API durumu ve versiyon bilgisi
   */
  getHello(): object {
    return {
      status: "ok",
      message: "Yıldız Bayan Kuaförü API",
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
    };
  }
}
