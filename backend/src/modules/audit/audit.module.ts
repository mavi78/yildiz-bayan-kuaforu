import { Module } from "@nestjs/common";
import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogRepository } from "../../repositories/audit-log.repository";
import { PrismaService } from "../../common/prisma.service";

/**
 * Audit Module
 *
 * Denetim kayıtları (Audit Logs) modülü.
 *
 * Sağlanan özellikler:
 * - Denetim kayıtlarını görüntüleme (Admin only)
 * - Filtreleme ve sayfalama desteği
 * - Hash chain doğrulaması (arkaplan job'ında)
 * - 90 gün sonra arşivleme (background job)
 *
 * Controller'lar:
 * - AuditLogsController: GET /admin/audit-logs
 *
 * Repository'ler:
 * - AuditLogRepository: Denetim kayıtları veri erişimi
 *
 * @module AuditModule
 */
@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogRepository, PrismaService],
  exports: [AuditLogRepository],
})
export class AuditModule {}
