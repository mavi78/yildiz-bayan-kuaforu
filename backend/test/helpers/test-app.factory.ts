import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ModuleMetadata } from "@nestjs/common/interfaces/modules/module-metadata.interface";
import { Test, TestingModule } from "@nestjs/testing";
import helmet from "helmet";

export interface TestAppOptions {
  /**
   * Test için derlenecek NestJS modulü tanımlaması
   */
  moduleMetadata: ModuleMetadata;
  /**
   * Global prefix değeri, `null` verilirse ayarlanmaz
   */
  globalPrefix?: string | null;
  /**
   * Helmet middleware'inin etkin olup olmayacağı
   */
  enableHelmet?: boolean;
  /**
   * `app.init()` çağrılmadan önce çalıştırılacak opsiyonel hook
   */
  beforeInit?: (app: INestApplication) => Promise<void> | void;
  /**
   * `app.init()` çağrıldıktan sonra çalıştırılacak opsiyonel hook
   */
  afterInit?: (app: INestApplication) => Promise<void> | void;
}

export interface TestAppRef {
  /**
   * Test sırasında kullanılacak NestJS uygulaması
   */
  app: INestApplication;
  /**
   * Derlenen NestJS modül referansı
   */
  module: TestingModule;
  /**
   * Test tamamlandıktan sonra uygulamayı kapatır
   */
  close: () => Promise<void>;
}

/**
 * Testler için NestJS uygulaması oluşturur ve global ayarları uygular.
 *
 * @description
 * - ValidationPipe ile whitelist + transform aktif edilir
 * - Varsayılan olarak `api` global prefix'i atanır
 * - Helmet middleware'i test ile aynı güvenlik davranışını sağlar
 *
 * @param options Test uygulaması oluşturma seçenekleri
 * @returns Test uygulaması ve modül referansı
 */
export async function createTestApp(options: TestAppOptions): Promise<TestAppRef> {
  const {
    moduleMetadata,
    globalPrefix = "api",
    enableHelmet = true,
    beforeInit,
    afterInit,
  } = options;

  const moduleRef = await Test.createTestingModule(moduleMetadata).compile();
  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (enableHelmet) {
    app.use(helmet());
  }

  if (globalPrefix !== null && globalPrefix !== undefined) {
    app.setGlobalPrefix(globalPrefix);
  }

  if (beforeInit) {
    await beforeInit(app);
  }

  await app.init();

  if (afterInit) {
    await afterInit(app);
  }

  return {
    app,
    module: moduleRef,
    close: async () => {
      await app.close();
    },
  };
}
