/**
 * Bcrypt Service
 *
 * Bcrypt kütüphanesi için wrapper servis.
 * Şifre hash'leme ve doğrulama işlemlerini yönetir.
 *
 * @module services
 */

import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

/**
 * Bcrypt Service
 *
 * Şifre güvenliği için bcrypt algoritmasını kullanır.
 * Salt rounds: 10 (2^10 = 1024 iterasyon)
 */
@Injectable()
export class BcryptService {
  private readonly saltRounds = 10;

  /**
   * Plain text şifreyi hash'ler
   *
   * Bcrypt algoritması ile şifreyi hash'ler.
   * Her hash işlemi benzersiz bir salt üretir.
   *
   * @param plainPassword - Ham şifre
   * @returns Hash'lenmiş şifre
   */
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  /**
   * Plain text şifreyi hash ile karşılaştırır
   *
   * Timing attack'lere karşı güvenlidir.
   *
   * @param plainPassword - Ham şifre
   * @param hashedPassword - Hash'lenmiş şifre
   * @returns Şifre eşleşirse true
   */
  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Hash'in yeniden hash'lenmesi gerekip gerekmediğini kontrol eder
   *
   * Salt rounds değiştiğinde eski hash'lerin güncellenmesi için kullanılır.
   *
   * @param hashedPassword - Hash'lenmiş şifre
   * @returns Yeniden hash'lenmesi gerekiyorsa true
   */
  async needsRehash(hashedPassword: string): Promise<boolean> {
    try {
      const rounds = await bcrypt.getRounds(hashedPassword);
      return rounds < this.saltRounds;
    } catch {
      return true;
    }
  }
}
