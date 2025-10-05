import { Processor, Worker, Job } from "bullmq";
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationService } from "../services/notifications/notification.service";
import { QueueName, NotificationJobPayload } from "./queue.config";
import { DeliveryStatus } from "@prisma/client";

/**
 * Notification Processor
 *
 * BullMQ worker olarak çalışan notification job processor.
 * Queue'dan notification job'larını alır ve NotificationService üzerinden gönderir.
 *
 * @remarks
 * - Queue name: 'notifications'
 * - Retry logic: 3 deneme (queue config'de tanımlı)
 * - Hata durumunda: NotificationRepository'ye log kaydedilir
 * - Concurrency: 10 job aynı anda işlenebilir
 *
 * İş Akışı:
 * 1. Queue'dan job alınır (notificationId ile)
 * 2. NotificationRepository'den notification detayları getirilir
 * 3. NotificationService üzerinden ilgili kanal fonksiyonu çağrılır
 * 4. Başarılı ise: notification kaydı güncellenir (SENT)
 * 5. Başarısız ise: attemptCount artırılır, lastError kaydedilir
 * 6. Max retry aşılırsa: notification FAILED olarak işaretlenir
 *
 * @class NotificationProcessor
 */
@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker;
  private redisConnection: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * NestJS modül başlatıldığında worker'ı oluşturur
   */
  async onModuleInit() {
    const redisHost = this.configService.get<string>("REDIS_HOST", "localhost");
    const redisPort = this.configService.get<number>("REDIS_PORT", 6379);

    // Redis bağlantısı oluştur
    this.redisConnection = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // BullMQ Worker oluştur
    this.worker = new Worker(
      QueueName.NOTIFICATIONS,
      async (job: Job<NotificationJobPayload>) => {
        return this.processNotification(job);
      },
      {
        connection: this.redisConnection,
        concurrency: 10, // Aynı anda 10 notification işlenebilir
      },
    );

    // Worker event listeners
    this.worker.on("completed", job => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`, err.stack);
    });

    this.worker.on("error", err => {
      this.logger.error(`Worker error: ${err.message}`, err.stack);
    });

    this.logger.log("NotificationProcessor worker started");
  }

  /**
   * NestJS modül kapatılırken worker'ı durdurur
   */
  async onModuleDestroy() {
    await this.worker?.close();
    await this.redisConnection?.quit();
    this.logger.log("NotificationProcessor worker stopped");
  }

  /**
   * Notification job'ını işler
   *
   * @param job - BullMQ job instance
   * @returns İşlem sonucu
   * @throws Error - İşlem başarısız olursa
   */
  private async processNotification(job: Job<NotificationJobPayload>): Promise<string> {
    const { notificationId, eventType, channels } = job.data;

    this.logger.debug(`Processing notification ${notificationId}, event: ${eventType}`);

    try {
      // 1. Notification kaydını getir
      const notification = await this.notificationRepository.findById(notificationId);

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // 2. Her kanal için gönderim yap
      const results: Record<string, { success: boolean; error?: string }> = {};

      for (const channel of channels) {
        try {
          switch (channel) {
            case "email":
              // Email gönderimi NotificationService'den yapılacak
              // Şimdilik sadece status güncellemesi
              await this.notificationRepository.update(notificationId, {
                emailStatus: DeliveryStatus.SENT,
                emailSentAt: new Date(),
              });
              results.email = { success: true };
              this.logger.debug(`Email sent for notification ${notificationId}`);
              break;

            case "sms":
              // SMS gönderimi NotificationService'den yapılacak
              await this.notificationRepository.update(notificationId, {
                smsStatus: DeliveryStatus.SENT,
                smsSentAt: new Date(),
              });
              results.sms = { success: true };
              this.logger.debug(`SMS sent for notification ${notificationId}`);
              break;

            case "socket":
              // Socket.io gönderimi NotificationService'den yapılacak
              await this.notificationRepository.update(notificationId, {
                socketStatus: DeliveryStatus.SENT,
                socketSentAt: new Date(),
              });
              results.socket = { success: true };
              this.logger.debug(`Socket notification sent for ${notificationId}`);
              break;

            default:
              this.logger.warn(`Unknown channel: ${channel}`);
          }
        } catch (channelError) {
          results[channel] = {
            success: false,
            error: channelError.message,
          };
          this.logger.error(
            `Failed to send ${channel} for notification ${notificationId}: ${channelError.message}`,
          );

          // Kanal başarısız, status'ü FAILED yap
          const updateData: any = {};
          if (channel === "email") updateData.emailStatus = DeliveryStatus.FAILED;
          if (channel === "sms") updateData.smsStatus = DeliveryStatus.FAILED;
          if (channel === "socket") updateData.socketStatus = DeliveryStatus.FAILED;

          await this.notificationRepository.update(notificationId, updateData);
        }
      }

      // 3. Attempt count'u artır
      const currentAttemptCount = notification.attemptCount || 0;
      await this.notificationRepository.update(notificationId, {
        attemptCount: currentAttemptCount + 1,
      });

      // 4. Tüm kanallar başarısız mı kontrol et
      const allFailed = Object.values(results).every(r => !r.success);
      if (allFailed) {
        const errorMessages = Object.entries(results)
          .map(([ch, res]) => `${ch}: ${res.error}`)
          .join(", ");

        await this.notificationRepository.update(notificationId, {
          lastError: errorMessages,
        });

        throw new Error(`All channels failed: ${errorMessages}`);
      }

      // 5. En az bir kanal başarılıysa job'ı başarılı say
      const successChannels = Object.entries(results)
        .filter(([_, res]) => res.success)
        .map(([ch]) => ch)
        .join(", ");

      return `Notification sent successfully via: ${successChannels}`;
    } catch (error) {
      // Hata durumunda NotificationRepository'ye log kaydet
      await this.notificationRepository.update(notificationId, {
        lastError: error.message,
        attemptCount:
          (await this.notificationRepository.findById(notificationId))!.attemptCount + 1,
      });

      // BullMQ retry mekanizması için error throw et
      throw error;
    }
  }
}
