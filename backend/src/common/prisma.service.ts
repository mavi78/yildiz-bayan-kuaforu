/**
 * Prisma Service
 *
 * NestJS için Prisma Client servis wrapper'ı.
 * Prisma Client'ı dependency injection sistemi ile kullanılabilir hale getirir.
 *
 * @module common
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service
 *
 * Prisma Client'ı NestJS lifecycle'ına entegre eder.
 * - OnModuleInit: Uygulama başladığında veritabanı bağlantısı açılır
 * - OnModuleDestroy: Uygulama kapandığında bağlantı kapatılır
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * PrismaService constructor
   *
   * Prisma Client'ı production ayarları ile yapılandırır:
   * - log: Query, error, warn logları aktif
   */
  constructor() {
    super({
      log: ['query', 'error', 'warn'],
    });
  }

  /**
   * Modül başlatıldığında veritabanı bağlantısı açılır
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Modül kapatıldığında veritabanı bağlantısı güvenli şekilde kapatılır
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Veritabanı bağlantısını temizler
   *
   * Test ortamları için kullanışlıdır.
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    // Transaction içinde tüm tabloları temizle
    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(
            `TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
          );
        } catch (error) {
          console.log(`Could not truncate ${tablename}`, error);
        }
      }
    }
  }
}
