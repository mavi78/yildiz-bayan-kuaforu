import { Module } from "@nestjs/common";
import { SharedModule } from "@modules/shared";
import { CustomersController } from "./customers.controller";
import { ConvertGuestToRegisteredUsecase } from "@usecases/customers/convert-guest-to-registered.usecase";

/**
 * CustomersModule
 *
 * Müşteri yönetimi modülü. Manuel misafir müşteri oluşturma, müşteri listesi,
 * detay görüntüleme, güncelleme ve misafir müşteriyi kayıtlı müşteriye
 * dönüştürme (davetiye gönderme) işlevlerini sağlar.
 *
 * @module CustomersModule
 */
@Module({
  imports: [SharedModule],
  controllers: [CustomersController],
  providers: [ConvertGuestToRegisteredUsecase],
  exports: [ConvertGuestToRegisteredUsecase],
})
export class CustomersModule {}
