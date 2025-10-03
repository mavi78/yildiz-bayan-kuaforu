import { Module } from "@nestjs/common";
import { SharedModule } from "@modules/shared";
import { CustomersController } from "./customers.controller";
import { ReviewsController } from "./reviews.controller";
import { ConvertGuestToRegisteredUsecase } from "@usecases/customers/convert-guest-to-registered.usecase";

/**
 * CustomersModule
 *
 * Müşteri yönetimi modülü. Manuel misafir müşteri oluşturma, müşteri listesi,
 * detay görüntüleme, güncenleme, misafir müşteriyi kayıtlı müşteriye
 * dönüştürme (davetiye gönderme) ve müşteri yorumları yönetimi işlevlerini sağlar.
 *
 * Controller'lar:
 * - CustomersController: Müşteri CRUD işlemleri
 * - ReviewsController: Yorum oluşturma, onaylama, silme
 *
 * @module CustomersModule
 */
@Module({
  imports: [SharedModule],
  controllers: [CustomersController, ReviewsController],
  providers: [ConvertGuestToRegisteredUsecase],
  exports: [ConvertGuestToRegisteredUsecase],
})
export class CustomersModule {}
