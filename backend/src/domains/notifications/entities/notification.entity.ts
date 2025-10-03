/**
 * Notification Domain Entity
 *
 * Bildirim domain varlığı. Çoklu kanal (email, SMS, socket) üzerinden
 * müşterilere gönderilen bildirimleri temsil eder.
 *
 * Bu entity, domain katmanında iş mantığını ve doğrulama kurallarını içerir.
 * Veritabanı detaylarından bağımsızdır.
 *
 * @module domains/notifications/entities
 */

import { NotificationChannel } from '../value-objects/channel.vo';

/**
 * Bildirim olay tipleri
 *
 * FR-043 ve FR-044'e göre desteklenen bildirim olayları
 */
export enum NotificationEvent {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
}

/**
 * Teslimat durumu
 *
 * Her kanal için ayrı durum takibi yapılır
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * Bildirim gönderim sonucu
 *
 * Bir kanaldan gönderim yapıldıktan sonra dönen sonuç
 */
export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  sentAt?: Date;
  error?: string;
}

/**
 * Notification entity özellikleri
 */
export interface NotificationProps {
  id?: string;
  eventType: NotificationEvent;
  customerId: string;
  appointmentId?: string;
  channels: NotificationChannel[];
  emailStatus?: DeliveryStatus;
  smsStatus?: DeliveryStatus;
  socketStatus?: DeliveryStatus;
  emailSentAt?: Date;
  smsSentAt?: Date;
  socketSentAt?: Date;
  attemptCount?: number;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Notification Domain Entity
 *
 * Domain-Driven Design prensiplerine göre tasarlanmış bildirim varlığı.
 * İş kurallarını ve doğrulama mantığını içerir.
 *
 * İş Kuralları:
 * - FR-046: Maksimum 3 deneme hakkı
 * - FR-047: Tüm kanallar başarısız olursa yönetici panelinde göster
 * - FR-047a: 30 gün sonra arşivle
 */
export class Notification {
  private readonly _id?: string;
  private readonly _eventType: NotificationEvent;
  private readonly _customerId: string;
  private readonly _appointmentId?: string;
  private readonly _channels: NotificationChannel[];
  private _emailStatus: DeliveryStatus;
  private _smsStatus: DeliveryStatus;
  private _socketStatus: DeliveryStatus;
  private _emailSentAt?: Date;
  private _smsSentAt?: Date;
  private _socketSentAt?: Date;
  private _attemptCount: number;
  private _lastError?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private static readonly MAX_ATTEMPTS = 3; // FR-046

  private constructor(props: NotificationProps) {
    this._id = props.id;
    this._eventType = props.eventType;
    this._customerId = props.customerId;
    this._appointmentId = props.appointmentId;
    this._channels = props.channels;
    this._emailStatus = props.emailStatus ?? DeliveryStatus.PENDING;
    this._smsStatus = props.smsStatus ?? DeliveryStatus.PENDING;
    this._socketStatus = props.socketStatus ?? DeliveryStatus.PENDING;
    this._emailSentAt = props.emailSentAt;
    this._smsSentAt = props.smsSentAt;
    this._socketSentAt = props.socketSentAt;
    this._attemptCount = props.attemptCount ?? 0;
    this._lastError = props.lastError;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  /**
   * Yeni bir bildirim oluşturur
   *
   * @param props - Bildirim özellikleri
   * @returns Notification entity instance
   * @throws Error - Geçersiz özellikler durumunda
   */
  public static create(props: NotificationProps): Notification {
    this.validate(props);
    return new Notification(props);
  }

  /**
   * Mevcut bildirim verilerinden entity yeniden oluşturur (örn: veritabanından)
   *
   * @param props - Bildirim özellikleri
   * @returns Notification entity instance
   */
  public static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  /**
   * Bildirim özelliklerini doğrular
   *
   * @param props - Doğrulanacak özellikler
   * @throws Error - Doğrulama başarısız olursa
   */
  private static validate(props: NotificationProps): void {
    if (!props.eventType || !Object.values(NotificationEvent).includes(props.eventType)) {
      throw new Error(`Invalid event type: ${props.eventType}`);
    }

    if (!props.customerId || props.customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }

    if (!props.channels || props.channels.length === 0) {
      throw new Error('At least one notification channel is required');
    }

    if (props.attemptCount && props.attemptCount > this.MAX_ATTEMPTS) {
      throw new Error(`Attempt count cannot exceed ${this.MAX_ATTEMPTS}`);
    }
  }

  /**
   * Email gönderimi başarılı olarak işaretle
   *
   * @param sentAt - Gönderim zamanı (opsiyonel, varsayılan: şimdi)
   */
  public markEmailSent(sentAt?: Date): void {
    this._emailStatus = DeliveryStatus.SENT;
    this._emailSentAt = sentAt ?? new Date();
    this._updatedAt = new Date();
  }

  /**
   * Email gönderimi başarısız olarak işaretle
   *
   * @param error - Hata mesajı
   */
  public markEmailFailed(error: string): void {
    this._emailStatus = DeliveryStatus.FAILED;
    this._lastError = error;
    this._updatedAt = new Date();
  }

  /**
   * SMS gönderimi başarılı olarak işaretle
   *
   * @param sentAt - Gönderim zamanı (opsiyonel, varsayılan: şimdi)
   */
  public markSmsSent(sentAt?: Date): void {
    this._smsStatus = DeliveryStatus.SENT;
    this._smsSentAt = sentAt ?? new Date();
    this._updatedAt = new Date();
  }

  /**
   * SMS gönderimi başarısız olarak işaretle
   *
   * @param error - Hata mesajı
   */
  public markSmsFailed(error: string): void {
    this._smsStatus = DeliveryStatus.FAILED;
    this._lastError = error;
    this._updatedAt = new Date();
  }

  /**
   * Socket gönderimi başarılı olarak işaretle
   *
   * @param sentAt - Gönderim zamanı (opsiyonel, varsayılan: şimdi)
   */
  public markSocketSent(sentAt?: Date): void {
    this._socketStatus = DeliveryStatus.SENT;
    this._socketSentAt = sentAt ?? new Date();
    this._updatedAt = new Date();
  }

  /**
   * Socket gönderimi başarısız olarak işaretle
   *
   * @param error - Hata mesajı
   */
  public markSocketFailed(error: string): void {
    this._socketStatus = DeliveryStatus.FAILED;
    this._lastError = error;
    this._updatedAt = new Date();
  }

  /**
   * Deneme sayısını artır
   *
   * @throws Error - Maksimum deneme sayısı aşıldıysa
   */
  public incrementAttemptCount(): void {
    if (this._attemptCount >= Notification.MAX_ATTEMPTS) {
      throw new Error(`Maximum attempt count (${Notification.MAX_ATTEMPTS}) reached`);
    }
    this._attemptCount += 1;
    this._updatedAt = new Date();
  }

  /**
   * Gönderim sonucunu işle ve ilgili kanal durumunu güncelle
   *
   * @param result - Gönderim sonucu
   */
  public processResult(result: NotificationResult): void {
    if (result.success) {
      switch (result.channel) {
        case NotificationChannel.EMAIL:
          this.markEmailSent(result.sentAt);
          break;
        case NotificationChannel.SMS:
          this.markSmsSent(result.sentAt);
          break;
        case NotificationChannel.SOCKET:
          this.markSocketSent(result.sentAt);
          break;
      }
    } else {
      switch (result.channel) {
        case NotificationChannel.EMAIL:
          this.markEmailFailed(result.error ?? 'Unknown error');
          break;
        case NotificationChannel.SMS:
          this.markSmsFailed(result.error ?? 'Unknown error');
          break;
        case NotificationChannel.SOCKET:
          this.markSocketFailed(result.error ?? 'Unknown error');
          break;
      }
    }
  }

  /**
   * Bildirimin tekrar denenebilir olup olmadığını kontrol eder
   *
   * @returns Tekrar denenebilirse true (FR-046: max 3 deneme)
   */
  public canRetry(): boolean {
    return this._attemptCount < Notification.MAX_ATTEMPTS;
  }

  /**
   * Tüm kanalların başarısız olup olmadığını kontrol eder (FR-047)
   *
   * @returns Tüm kanallar başarısızsa true
   */
  public hasAllChannelsFailed(): boolean {
    const emailFailed =
      this._channels.includes(NotificationChannel.EMAIL) && this._emailStatus === DeliveryStatus.FAILED;
    const smsFailed =
      this._channels.includes(NotificationChannel.SMS) && this._smsStatus === DeliveryStatus.FAILED;
    const socketFailed =
      this._channels.includes(NotificationChannel.SOCKET) && this._socketStatus === DeliveryStatus.FAILED;

    const activeChannelCount = this._channels.length;
    const failedChannelCount = [emailFailed, smsFailed, socketFailed].filter(Boolean).length;

    return activeChannelCount > 0 && activeChannelCount === failedChannelCount;
  }

  /**
   * En az bir kanalın başarılı olup olmadığını kontrol eder
   *
   * @returns En az bir kanal başarılıysa true
   */
  public hasAnyChannelSucceeded(): boolean {
    return (
      this._emailStatus === DeliveryStatus.SENT ||
      this._smsStatus === DeliveryStatus.SENT ||
      this._socketStatus === DeliveryStatus.SENT
    );
  }

  /**
   * Bildirimin yönetici panelinde gösterilmesi gerekip gerekmediğini kontrol eder
   * FR-047: Tüm kanallar başarısız ve max deneme sayısına ulaşılmış
   *
   * @returns Gösterilmesi gerekiyorsa true
   */
  public shouldShowInAdminPanel(): boolean {
    return this.hasAllChannelsFailed() && !this.canRetry();
  }

  /**
   * Bildirimin arşivlenmesi gerekip gerekmediğini kontrol eder
   * FR-047a: 30 günden eski kayıtlar
   *
   * @returns Arşivlenmesi gerekiyorsa true
   */
  public shouldBeArchived(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this._createdAt < thirtyDaysAgo;
  }

  /**
   * Belirli bir kanalın bu bildirimde aktif olup olmadığını kontrol eder
   *
   * @param channel - Kontrol edilecek kanal
   * @returns Kanal aktifse true
   */
  public hasChannel(channel: NotificationChannel): boolean {
    return this._channels.includes(channel);
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get eventType(): NotificationEvent {
    return this._eventType;
  }

  get customerId(): string {
    return this._customerId;
  }

  get appointmentId(): string | undefined {
    return this._appointmentId;
  }

  get channels(): NotificationChannel[] {
    return [...this._channels]; // Return copy to prevent mutation
  }

  get emailStatus(): DeliveryStatus {
    return this._emailStatus;
  }

  get smsStatus(): DeliveryStatus {
    return this._smsStatus;
  }

  get socketStatus(): DeliveryStatus {
    return this._socketStatus;
  }

  get emailSentAt(): Date | undefined {
    return this._emailSentAt;
  }

  get smsSentAt(): Date | undefined {
    return this._smsSentAt;
  }

  get socketSentAt(): Date | undefined {
    return this._socketSentAt;
  }

  get attemptCount(): number {
    return this._attemptCount;
  }

  get lastError(): string | undefined {
    return this._lastError;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Entity'yi plain object'e dönüştürür
   *
   * @returns Plain object representation
   */
  public toObject(): {
    id?: string;
    eventType: NotificationEvent;
    customerId: string;
    appointmentId?: string;
    channels: string[];
    emailStatus: DeliveryStatus;
    smsStatus: DeliveryStatus;
    socketStatus: DeliveryStatus;
    emailSentAt?: Date;
    smsSentAt?: Date;
    socketSentAt?: Date;
    attemptCount: number;
    lastError?: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this._id,
      eventType: this._eventType,
      customerId: this._customerId,
      appointmentId: this._appointmentId,
      channels: this._channels.map((c) => c.toString()),
      emailStatus: this._emailStatus,
      smsStatus: this._smsStatus,
      socketStatus: this._socketStatus,
      emailSentAt: this._emailSentAt,
      smsSentAt: this._smsSentAt,
      socketSentAt: this._socketSentAt,
      attemptCount: this._attemptCount,
      lastError: this._lastError,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
