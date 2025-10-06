import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PaymentRepository } from "../repositories/payment.repository";
import { QueueManager, VeresiyeReminderJobPayload } from "./queue.config";

/**
 * Veresiye Reminder Job
 *
 * Veresiye (deferred payment) ödemelerinin vade tarihlerine göre hatırlatıcı bildirimleri gönderen cron job.
 *
 * @remarks
 * - Çalışma zamanı: Her gün saat 09:00'da
 * - Hatırlatıcı zamanlamaları (FR-042a):
 *   - -3 gün: Vade tarihinden 3 gün önce uyarı
 *   - 0 gün: Vade tarihinde uyarı
 *   - +N gün: Vade tarihinden sonra her gün uyarı (gecikmiş ödemeler)
 * - Müşteri tercihleri (FR-042b): Admin, müşteri bazlı hatırlatıcıları kapatabilir
 *
 * İş Akışı:
 * 1. Veresiye ödemeleri getir:
 *    - 3 gün sonra vadesi dolacak olanlar (-3 days)
 *    - Bugün vadesi dolan olanlar (0 days)
 *    - Vadesi geçmiş olanlar (+N days, overdue)
 * 2. Müşteri tercihlerini kontrol et (Customer.notes içinde)
 * 3. Her ödeme için notification queue'ya job ekle
 * 4. NotificationProcessor job'ları işleyecek ve bildirim gönderecek
 *
 * @class VeresiyeReminderJob
 */
@Injectable()
export class VeresiyeReminderJob {
  private readonly logger = new Logger(VeresiyeReminderJob.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly queueManager: QueueManager,
  ) {}

  /**
   * Cron job: Her gün saat 09:00'da çalışır
   *
   * @Cron('0 9 * * *') - 09:00:00 daily
   */
  @Cron("0 9 * * *", {
    name: "veresiye-reminder-job",
    timeZone: "Europe/Istanbul",
  })
  async handleVeresiyeReminders() {
    this.logger.log("Starting veresiye reminder job...");

    try {
      // 1. 3 gün sonra vadesi dolacak ödemeler
      await this.processUpcomingPayments(3);

      // 2. Bugün vadesi dolan ödemeler
      await this.processDueTodayPayments();

      // 3. Vadesi geçmiş ödemeler
      await this.processOverduePayments();

      this.logger.log("Veresiye reminder job completed successfully");
    } catch (error) {
      this.logger.error(`Veresiye reminder job failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * N gün sonra vadesi dolacak ödemeleri işler
   *
   * @param daysAhead - Kaç gün sonra (varsayılan: 3)
   */
  private async processUpcomingPayments(daysAhead = 3) {
    this.logger.log(`Processing payments due in ${daysAhead} days...`);

    const upcomingPayments = await this.paymentRepository.findUpcomingVeresiye(daysAhead);

    if (upcomingPayments.length === 0) {
      this.logger.log(`No payments due in ${daysAhead} days`);
      return;
    }

    this.logger.log(`Found ${upcomingPayments.length} payments due in ${daysAhead} days`);

    for (const payment of upcomingPayments) {
      await this.queueReminderNotification(payment, -daysAhead);
    }
  }

  /**
   * Bugün vadesi dolan ödemeleri işler
   */
  private async processDueTodayPayments() {
    this.logger.log("Processing payments due today...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueTodayPayments = await this.paymentRepository.findMany({
      where: {
        method: "VERESIYE",
        veresiyeDueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (dueTodayPayments.length === 0) {
      this.logger.log("No payments due today");
      return;
    }

    this.logger.log(`Found ${dueTodayPayments.length} payments due today`);

    for (const payment of dueTodayPayments) {
      await this.queueReminderNotification(payment, 0);
    }
  }

  /**
   * Vadesi geçmiş ödemeleri işler
   */
  private async processOverduePayments() {
    this.logger.log("Processing overdue payments...");

    const overduePayments = await this.paymentRepository.findOverdue();

    if (overduePayments.length === 0) {
      this.logger.log("No overdue payments");
      return;
    }

    this.logger.log(`Found ${overduePayments.length} overdue payments`);

    for (const payment of overduePayments) {
      const daysOverdue = this.calculateDaysOverdue(payment.veresiyeDueDate!);
      await this.queueReminderNotification(payment, daysOverdue);
    }
  }

  /**
   * Hatırlatıcı bildirimini queue'ya ekler
   *
   * @param payment - Ödeme kaydı
   * @param daysUntilDue - Vade tarihine kalan gün sayısı (negatif: önce, 0: bugün, pozitif: geçmiş)
   */
  private async queueReminderNotification(payment: any, daysUntilDue: number) {
    // Müşteri tercihlerini kontrol et (FR-042b)
    if (this.isReminderDisabled(payment.appointment?.customer)) {
      this.logger.debug(
        `Reminder disabled for customer ${payment.appointment?.customer?.id}, skipping payment ${payment.id}`,
      );
      return;
    }

    const payload: VeresiyeReminderJobPayload = {
      paymentId: payment.id,
      customerId: payment.appointment?.customer?.id,
      dueDate: payment.veresiyeDueDate!,
      amount: Number(payment.amount),
      daysUntilDue,
    };

    await this.queueManager.veresiyeRemindersQueue.add("send-veresiye-reminder", payload, {
      jobId: `veresiye-reminder-${payment.id}-${this.getDateString()}`,
      removeOnComplete: true, // Başarılı job'ları hemen sil
    });

    this.logger.debug(`Queued reminder for payment ${payment.id}, daysUntilDue: ${daysUntilDue}`);
  }

  /**
   * Müşteri için hatırlatıcının kapatılıp kapatılmadığını kontrol eder
   *
   * FR-042b: Admin müşteri bazlı hatırlatıcıları kapatabilir.
   * Şimdilik Customer.notes içinde "DISABLE_VERESIYE_REMINDERS" kontrolü.
   * Gelecekte NotificationPreferences table'a taşınabilir.
   *
   * @param customer - Müşteri kaydı
   * @returns Hatırlatıcı kapatılmışsa true
   */
  private isReminderDisabled(customer: any): boolean {
    if (!customer) return false;

    // Customer.notes içinde DISABLE_VERESIYE_REMINDERS flag'i var mı kontrol et
    if (customer.notes && typeof customer.notes === "string") {
      return customer.notes.includes("DISABLE_VERESIYE_REMINDERS");
    }

    return false;
  }

  /**
   * Vade tarihinden bugüne kadar geçen gün sayısını hesaplar
   *
   * @param dueDate - Vade tarihi
   * @returns Geçen gün sayısı (pozitif değer)
   */
  private calculateDaysOverdue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Bugünün tarihini YYYY-MM-DD formatında döndürür
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
