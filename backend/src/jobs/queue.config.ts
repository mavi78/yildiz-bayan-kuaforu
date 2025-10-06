import { Queue, QueueOptions } from "bullmq";
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis, { RedisOptions } from "ioredis";

/**
 * BullMQ kuyruk isimleri
 */
export enum QueueName {
  NOTIFICATIONS = "notifications",
  AUDIT_ARCHIVE = "audit-archive",
  VERESIYE_REMINDERS = "veresiye-reminders",
}

/**
 * Notification job payload tipi
 */
export interface NotificationJobPayload {
  notificationId: string;
  eventType: string;
  customerId?: string;
  appointmentId?: string;
  channels: ("email" | "sms" | "socket")[];
}

/**
 * Audit archive job payload tipi
 */
export interface AuditArchiveJobPayload {
  cutoffDate: Date;
}

/**
 * Veresiye reminder job payload tipi
 */
export interface VeresiyeReminderJobPayload {
  paymentId: string;
  customerId: string;
  dueDate: Date;
  amount: number;
  daysUntilDue: number;
}

/**
 * BullMQ Queue Manager Service
 *
 * Redis bağlantısı ve queue yönetimini sağlar.
 * Uygulama başladığında tüm queue'ları oluşturur ve Redis bağlantısını yapılandırır.
 *
 * @remarks
 * - Redis bağlantısı environment variable'lardan alınır (REDIS_HOST, REDIS_PORT)
 * - Varsayılan Redis portu: 6379
 * - Her queue için retry stratejisi ve job limitleri yapılandırılmıştır
 * - Uygulama kapanırken tüm queue'lar ve bağlantılar düzgün kapatılır
 *
 * @example
 * ```typescript
 * // Queue'ya job ekleme
 * const queueManager = new QueueManager(configService);
 * await queueManager.notificationsQueue.add('send-notification', {
 *   notificationId: '123',
 *   eventType: 'appointment.created',
 *   channels: ['email', 'sms']
 * });
 * ```
 */
@Injectable()
export class QueueManager implements OnModuleInit, OnModuleDestroy {
  private redisConnection: Redis;

  /**
   * Bildirim gönderimi için queue
   *
   * @remarks
   * - Retry: 3 deneme, her deneme arasında exponential backoff
   * - Worker timeout: 30 saniye
   * - Concurrency: 10 job aynı anda işlenebilir
   */
  public notificationsQueue: Queue;

  /**
   * Audit log arşivleme için queue
   *
   * @remarks
   * - Cron job ile günlük olarak tetiklenir
   * - Retry: 2 deneme (arşivleme kritik işlem)
   * - Worker timeout: 5 dakika (büyük veri setleri için)
   */
  public auditArchiveQueue: Queue;

  /**
   * Veresiye ödeme hatırlatıcıları için queue
   *
   * @remarks
   * - Cron job ile günlük olarak tetiklenir
   * - Retry: 3 deneme
   * - Worker timeout: 1 dakika
   */
  public veresiyeRemindersQueue: Queue;

  constructor(private readonly configService: ConfigService) {}

  /**
   * NestJS modül başlatıldığında çalışır
   * Redis bağlantısını ve tüm queue'ları yapılandırır
   */
  async onModuleInit() {
    // Redis bağlantısı oluştur
    const redisHost = this.configService.get<string>("REDIS_HOST", "localhost");
    const redisPort = this.configService.get<number>("REDIS_PORT", 6379);
    const redisPassword = this.configService.get<string>("REDIS_PASSWORD");
    const redisDb = this.configService.get<number>("REDIS_DB", 0);

    const redisOptions: RedisOptions = {
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null, // BullMQ için önerilen
      enableReadyCheck: false, // BullMQ için önerilen
      db: redisDb,
    };

    if (redisPassword) {
      redisOptions.password = redisPassword;
    }

    this.redisConnection = new Redis(redisOptions);

    // Genel queue seçenekleri
    const defaultQueueOptions: QueueOptions = {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 86400, // 24 saat sonra başarılı job'ları sil
          count: 1000, // Son 1000 başarılı job'ı sakla
        },
        removeOnFail: {
          age: 604800, // 7 gün sonra başarısız job'ları sil
        },
      },
    };

    // Notifications queue
    this.notificationsQueue = new Queue(QueueName.NOTIFICATIONS, {
      ...defaultQueueOptions,
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
        attempts: 3, // 3 deneme
        backoff: {
          type: "exponential",
          delay: 2000, // İlk retry 2 saniye sonra
        },
      },
    });

    // Audit Archive queue
    this.auditArchiveQueue = new Queue(QueueName.AUDIT_ARCHIVE, {
      ...defaultQueueOptions,
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
        attempts: 2, // 2 deneme (kritik işlem, fazla retry gerekli değil)
      },
    });

    // Veresiye Reminders queue
    this.veresiyeRemindersQueue = new Queue(QueueName.VERESIYE_REMINDERS, {
      ...defaultQueueOptions,
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
        attempts: 3, // 3 deneme
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });

    console.log("[QueueManager] All queues initialized successfully");
  }

  /**
   * NestJS modül kapatılırken çalışır
   * Tüm queue'ları ve Redis bağlantısını düzgün kapatır
   */
  async onModuleDestroy() {
    await this.notificationsQueue.close();
    await this.auditArchiveQueue.close();
    await this.veresiyeRemindersQueue.close();
    await this.redisConnection.quit();

    console.log("[QueueManager] All queues and Redis connection closed");
  }

  /**
   * Queue sağlık durumunu kontrol eder
   *
   * @returns Queue sağlık bilgileri
   */
  async getQueueHealth() {
    const notifications = await this.notificationsQueue.getJobCounts();
    const auditArchive = await this.auditArchiveQueue.getJobCounts();
    const veresiyeReminders = await this.veresiyeRemindersQueue.getJobCounts();

    return {
      notifications,
      auditArchive,
      veresiyeReminders,
      redis: {
        status: this.redisConnection.status,
        host: this.configService.get<string>("REDIS_HOST", "localhost"),
        port: this.configService.get<number>("REDIS_PORT", 6379),
      },
    };
  }
}

/**
 * Queue Manager modülü için provider
 */
export const QueueManagerProvider = {
  provide: QueueManager,
  useClass: QueueManager,
};
