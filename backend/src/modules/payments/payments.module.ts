import { Module } from "@nestjs/common";
import { SharedModule } from "@modules/shared";
import { PaymentsController } from "./payments.controller";

/**
 * PaymentsModule
 *
 * Offline ödeme yönetimi modülü. Ödeme kaydı oluşturma, listeleme,
 * güncelleme ve veresiye (deferred payment) yönetimi işlevlerini sağlar.
 *
 * Controller'lar:
 * - PaymentsController: Ödeme CRUD işlemleri, veresiye yönetimi
 *
 * Özellikler:
 * - VERESIYE ödemeler için vade, teminat, sorumlu zorunlu (FR-040)
 * - Veresiye hatırlatmaları: -3 gün, 0 gün, +N gün (FR-042a)
 * - Ödeme create/update audit log tetikler (FR-039a)
 *
 * @module PaymentsModule
 */
@Module({
  imports: [SharedModule],
  controllers: [PaymentsController],
  providers: [],
  exports: [],
})
export class PaymentsModule {}
