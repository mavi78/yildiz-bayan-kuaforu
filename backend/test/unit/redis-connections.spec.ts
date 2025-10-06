/**
 * Redis bağlantı konfigürasyon testleri
 *
 * Bu testler, QueueManager ve NotificationProcessor sınıflarının
 * ConfigService üzerinden gelen parola ve veritabanı numarasını
 * ioredis bağlantı seçeneklerine doğru şekilde aktardığını doğrular.
 */

import { ConfigService } from "@nestjs/config";
import { NotificationProcessor } from "../../src/jobs/notification.processor";
import { QueueManager } from "../../src/jobs/queue.config";
import Redis from "ioredis";

const queueCtorSpy = jest.fn();
const workerCtorSpy = jest.fn();

jest.mock("bullmq", () => {
  return {
    __esModule: true,
    Queue: jest.fn().mockImplementation((name: string, options: unknown) => {
      queueCtorSpy({ name, options });
      return {
        name,
        options,
        getJobCounts: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Worker: jest.fn().mockImplementation((name: string, processor: unknown, options: unknown) => {
      workerCtorSpy({ name, processor, options });
      return {
        name,
        processor,
        options,
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Job: class MockJob {},
  };
});

const redisInstanceSpy = jest.fn();

jest.mock("ioredis", () => {
  const RedisMock = jest.fn().mockImplementation((options: unknown) => {
    redisInstanceSpy(options);
    return {
      options,
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
      status: "ready",
    };
  });

  return {
    __esModule: true,
    default: RedisMock,
  };
});

type ConfigOverrides = Record<string, string | number | undefined>;

function createConfigService(overrides: ConfigOverrides): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key];
      }
      return defaultValue;
    }),
  } as unknown as ConfigService;
}

const RedisMock = Redis as unknown as jest.Mock;

describe("Redis bağlantı konfigürasyonu", () => {
  beforeEach(() => {
    RedisMock.mockClear();
    redisInstanceSpy.mockClear();
    queueCtorSpy.mockClear();
    workerCtorSpy.mockClear();
  });

  it("QueueManager ConfigService'ten gelen parola ve db bilgisini kullanır", async () => {
    const config = createConfigService({
      REDIS_HOST: "redis-host",
      REDIS_PORT: 6380,
      REDIS_PASSWORD: "super-secret",
      REDIS_DB: 2,
    });

    const queueManager = new QueueManager(config);

    await queueManager.onModuleInit();

    expect(RedisMock).toHaveBeenCalledTimes(1);
    const redisOptions = RedisMock.mock.calls[0][0] as Record<string, unknown>;

    expect(redisOptions).toMatchObject({
      host: "redis-host",
      port: 6380,
      password: "super-secret",
      db: 2,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    await queueManager.onModuleDestroy();
  });

  it("QueueManager parola belirtilmediğinde varsayılan ayarlarla bağlantı kurar", async () => {
    const config = createConfigService({
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
      REDIS_PASSWORD: undefined,
      REDIS_DB: undefined,
    });

    const queueManager = new QueueManager(config);

    await queueManager.onModuleInit();

    const redisOptions = RedisMock.mock.calls[0][0] as Record<string, unknown>;

    expect(redisOptions).toMatchObject({
      host: "localhost",
      port: 6379,
      db: 0,
    });
    expect(redisOptions.password).toBeUndefined();

    await queueManager.onModuleDestroy();
  });

  it("NotificationProcessor ConfigService'ten gelen parola ve db bilgisini kullanır", async () => {
    const config = createConfigService({
      REDIS_HOST: "notifications-redis",
      REDIS_PORT: 6390,
      REDIS_PASSWORD: "queue-pass",
      REDIS_DB: 4,
    });

    const notificationRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const notificationService = {
      sendEmail: jest.fn(),
      sendSms: jest.fn(),
      sendSocket: jest.fn(),
    };

    const processor = new NotificationProcessor(
      config,
      notificationRepository as never,
      notificationService as never,
    );

    await processor.onModuleInit();

    const redisOptions = RedisMock.mock.calls[0][0] as Record<string, unknown>;

    expect(redisOptions).toMatchObject({
      host: "notifications-redis",
      port: 6390,
      password: "queue-pass",
      db: 4,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    await processor.onModuleDestroy();
  });
});
