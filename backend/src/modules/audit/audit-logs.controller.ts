import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditLogRepository } from "../../repositories/audit-log.repository";
import { AuditLogFiltersDto } from "./dto";
import { Prisma } from "@prisma/client";

/**
 * Audit Logs Controller
 *
 * Denetim kayıtlarını görüntüleme ve filtreleme için HTTP endpoint'leri sağlar.
 *
 * Endpoint'ler:
 * - GET /admin/audit-logs - Denetim kayıtları listesi (filtrelenmiş, sayfalandırılmış)
 *
 * İş Kuralları:
 * - Sadece Admin erişebilir (FR-060)
 * - 90 gün sonra kayıtlar arşivlenir (FR-062)
 * - Hash chain ile bütünlük koruması (FR-063)
 * - Sayfalama desteği (varsayılan: 50 kayıt/sayfa, max: 100)
 *
 * Güvenlik:
 * - JWT authentication gerekli
 * - ADMIN rolü zorunlu
 *
 * @class AuditLogsController
 */
@Controller("admin/audit-logs")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Denetim kayıtlarını filtrelerle getirir (Admin only)
   *
   * GET /admin/audit-logs?page=1&limit=50&action=appointment.override
   *
   * Query parametreleri:
   * - action: Aksiyon tipi (optional)
   * - actorId: İşlemi yapan kullanıcı ID (optional)
   * - targetEntity: Hedef entity tipi (optional)
   * - targetId: Hedef entity ID (optional)
   * - startDate: Başlangıç tarihi (ISO 8601, optional)
   * - endDate: Bitiş tarihi (ISO 8601, optional)
   * - page: Sayfa numarası (varsayılan: 1)
   * - limit: Sayfa başına kayıt (varsayılan: 50, max: 100)
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "clxyz123",
   *       "timestamp": "2025-10-03T10:30:00.000Z",
   *       "action": "appointment.override",
   *       "actor": { "firstName": "Ayşe", "lastName": "Yılmaz", "email": "admin@yildiz.com" },
   *       "targetEntity": "Appointment",
   *       "targetId": "clxyz456",
   *       "details": { "before": {...}, "after": {...} },
   *       "justification": "Müşteri özel talep etti",
   *       "hash": "abc123...",
   *       "previousHash": "def456..."
   *     }
   *   ],
   *   "pagination": {
   *     "page": 1,
   *     "limit": 50,
   *     "total": 523,
   *     "totalPages": 11
   *   }
   * }
   * ```
   *
   * @param filters - Denetim kaydı filtreleri ve pagination parametreleri
   * @returns Filtrelenmiş ve sayfalandırılmış denetim kayıtları
   *
   * @example
   * ```bash
   * # Tüm kayıtlar (ilk 50)
   * GET /admin/audit-logs
   *
   * # Belirli bir aksiyon tipi
   * GET /admin/audit-logs?action=payment.update
   *
   * # Belirli bir kullanıcının işlemleri
   * GET /admin/audit-logs?actorId=clxyz789
   *
   * # Belirli bir randevunun değişiklik geçmişi
   * GET /admin/audit-logs?targetEntity=Appointment&targetId=clxyz456
   *
   * # Tarih aralığı filtresi
   * GET /admin/audit-logs?startDate=2025-01-01&endDate=2025-12-31
   *
   * # Sayfalama
   * GET /admin/audit-logs?page=2&limit=100
   * ```
   */
  @Get()
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(@Query() filters: AuditLogFiltersDto) {
    const { page = 1, limit = 50, ...filterParams } = filters;

    // Build Prisma where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (filterParams.action) {
      where.action = filterParams.action;
    }

    if (filterParams.actorId) {
      where.actorId = filterParams.actorId;
    }

    if (filterParams.targetEntity) {
      where.targetEntity = filterParams.targetEntity;
    }

    if (filterParams.targetId) {
      where.targetId = filterParams.targetId;
    }

    if (filterParams.startDate || filterParams.endDate) {
      where.timestamp = {};
      if (filterParams.startDate) {
        where.timestamp.gte = filterParams.startDate;
      }
      if (filterParams.endDate) {
        where.timestamp.lte = filterParams.endDate;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Fetch data and count in parallel
    const [logs, total] = await Promise.all([
      this.auditLogRepository.findMany({
        skip,
        take,
        where,
        orderBy: { timestamp: "desc" }, // En yeni kayıtlar önce
      }),
      this.auditLogRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
