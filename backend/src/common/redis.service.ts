/**
 * Redis Service
 *
 * Redis bağlantısı ve işlemleri için wrapper servis.
 * JWT blacklist, session cache ve diğer cache işlemleri için kullanılır.
 *
 * @module common
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Service
 *
 * IORedis kütüphanesi için NestJS uyumlu wrapper.
 * Bağlantı yönetimi, lifecycle hooks ve helper methodlar içerir.
 *
 * Kullanım alanları:
 * - JWT blacklist (logout)
 * - Session cache
 * - Rate limiting cache
 * - Job queue
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly prefix: string = 'yildiz:';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Module başlatıldığında Redis'e bağlan
   */
  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB', 0);

    this.client = new Redis({
      host,
      port,
      password,
      db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Bağlantı olaylarını logla
    this.client.on('connect', () => {
      console.log(`[Redis] Connected to ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    this.client.on('close', () => {
      console.log('[Redis] Connection closed');
    });
  }

  /**
   * Module kapatıldığında Redis bağlantısını kapat
   */
  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Key'e prefix ekler
   *
   * Namespace collision'ı önlemek için tüm key'lere prefix eklenir.
   *
   * @param key - Ham key
   * @returns Prefix'li key (örn: "yildiz:blacklist:jti123")
   */
  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * JWT ID'yi blacklist'e ekler
   *
   * Logout işlemi için kullanılır.
   * TTL, token'ın expiry zamanına ayarlanır.
   *
   * @param jti - JWT ID
   * @param ttl - Time to live (saniye cinsinden)
   */
  async addToBlacklist(jti: string, ttl: number): Promise<void> {
    const key = this.prefixKey(`blacklist:${jti}`);
    await this.client.set(key, '1', 'EX', ttl);
  }

  /**
   * JWT ID'nin blacklist'te olup olmadığını kontrol eder
   *
   * JWT Strategy'de token doğrulama sırasında kullanılır.
   *
   * @param jti - JWT ID
   * @returns Blacklist'te ise true
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = this.prefixKey(`blacklist:${jti}`);
    const result = await this.client.get(key);
    return result !== null;
  }

  /**
   * String değer set eder
   *
   * @param key - Key
   * @param value - Değer
   * @param ttl - TTL (saniye, opsiyonel)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key);

    if (ttl) {
      await this.client.set(prefixedKey, value, 'EX', ttl);
    } else {
      await this.client.set(prefixedKey, value);
    }
  }

  /**
   * String değer getirir
   *
   * @param key - Key
   * @returns Değer veya null (key yoksa)
   */
  async get(key: string): Promise<string | null> {
    const prefixedKey = this.prefixKey(key);
    return this.client.get(prefixedKey);
  }

  /**
   * Key siler
   *
   * @param key - Key
   * @returns Silinen key sayısı
   */
  async del(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key);
    return this.client.del(prefixedKey);
  }

  /**
   * JSON objesini set eder
   *
   * @param key - Key
   * @param value - JSON objesi
   * @param ttl - TTL (saniye, opsiyonel)
   */
  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttl);
  }

  /**
   * JSON objesini getirir
   *
   * @param key - Key
   * @returns Parse edilmiş obje veya null
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Key'in var olup olmadığını kontrol eder
   *
   * @param key - Key
   * @returns Varsa true
   */
  async exists(key: string): Promise<boolean> {
    const prefixedKey = this.prefixKey(key);
    const result = await this.client.exists(prefixedKey);
    return result === 1;
  }

  /**
   * Key'in kalan TTL'ini döndürür
   *
   * @param key - Key
   * @returns TTL (saniye cinsinden), -1 (expire yok), -2 (key yok)
   */
  async ttl(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key);
    return this.client.ttl(prefixedKey);
  }

  /**
   * Key'e TTL set eder
   *
   * @param key - Key
   * @param ttl - TTL (saniye cinsinden)
   * @returns Başarılı ise true
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const prefixedKey = this.prefixKey(key);
    const result = await this.client.expire(prefixedKey, ttl);
    return result === 1;
  }

  /**
   * Pattern'e uyan key'leri arar
   *
   * ⚠️ Production'da dikkatli kullanılmalı (büyük dataset'lerde yavaş)
   *
   * @param pattern - Redis pattern (örn: "session:*")
   * @returns Eşleşen key'ler
   */
  async keys(pattern: string): Promise<string[]> {
    const prefixedPattern = this.prefixKey(pattern);
    const keys = await this.client.keys(prefixedPattern);

    // Prefix'i kaldır
    return keys.map((key) => key.replace(this.prefix, ''));
  }

  /**
   * Tüm key'leri siler (pattern'e uyan)
   *
   * ⚠️ Tehlikeli! Sadece test/development ortamlarında kullanılmalı
   *
   * @param pattern - Redis pattern (örn: "test:*")
   * @returns Silinen key sayısı
   */
  async flushPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    const prefixedKeys = keys.map((key) => this.prefixKey(key));
    return this.client.del(...prefixedKeys);
  }

  /**
   * Tüm veritabanını temizler
   *
   * ⚠️ Tehlikeli! Sadece test ortamlarında kullanılmalı
   */
  async flushAll(): Promise<void> {
    await this.client.flushdb();
  }

  /**
   * Redis connection health check
   *
   * @returns Bağlantı sağlıklı ise true
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Ham Redis client'ı döndürür
   *
   * Özel Redis komutları için kullanılabilir.
   * Genel kullanımda bu service'in helper methodları tercih edilmeli.
   *
   * @returns IORedis client instance
   */
  getClient(): Redis {
    return this.client;
  }
}
