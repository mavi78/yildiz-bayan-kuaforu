/**
 * NotificationChannel Value Object
 *
 * Bildirim kanalı value object'i. Email, SMS ve Socket.io kanallarını temsil eder.
 *
 * Value Object özellikleri:
 * - Immutable (değiştirilemez)
 * - Equality by value (değere göre eşitlik)
 * - Self-validating (kendi kendini doğrular)
 *
 * @module domains/notifications/value-objects
 */

/**
 * Bildirim Kanalları
 *
 * Sistemde desteklenen bildirim kanalları:
 * - EMAIL: Gmail SMTP üzerinden email gönderimi (FR-043)
 * - SMS: İleti Merkezi API üzerinden SMS gönderimi (FR-044)
 * - SOCKET: Socket.io üzerinden gerçek zamanlı bildirim (FR-045)
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SOCKET = 'socket',
}

/**
 * Kanal adından NotificationChannel enum'ına dönüştürme
 *
 * @param channelName - Kanal adı string'i
 * @returns NotificationChannel enum değeri
 * @throws Error - Geçersiz kanal adı
 */
export function toNotificationChannel(channelName: string): NotificationChannel {
  const normalized = channelName.toLowerCase().trim();

  switch (normalized) {
    case 'email':
      return NotificationChannel.EMAIL;
    case 'sms':
      return NotificationChannel.SMS;
    case 'socket':
      return NotificationChannel.SOCKET;
    default:
      throw new Error(
        `Invalid notification channel: ${channelName}. Valid channels are: email, sms, socket`,
      );
  }
}

/**
 * Kanal listesini string array'den NotificationChannel array'e dönüştürür
 *
 * @param channels - Kanal adları array'i
 * @returns NotificationChannel array'i
 * @throws Error - Geçersiz kanal adı varsa
 */
export function toNotificationChannels(channels: string[]): NotificationChannel[] {
  if (!channels || channels.length === 0) {
    throw new Error('At least one notification channel is required');
  }

  return channels.map((channel) => toNotificationChannel(channel));
}

/**
 * NotificationChannel enum değerini string'e dönüştürür
 *
 * @param channel - NotificationChannel enum değeri
 * @returns Kanal adı string'i
 */
export function fromNotificationChannel(channel: NotificationChannel): string {
  return channel.toString();
}

/**
 * NotificationChannel array'ini string array'e dönüştürür
 *
 * @param channels - NotificationChannel array'i
 * @returns Kanal adları string array'i
 */
export function fromNotificationChannels(channels: NotificationChannel[]): string[] {
  return channels.map((channel) => fromNotificationChannel(channel));
}

/**
 * String'in geçerli bir bildirim kanalı olup olmadığını kontrol eder
 *
 * @param channelName - Kontrol edilecek kanal adı
 * @returns Geçerli kanal adıysa true
 */
export function isValidChannel(channelName: string): boolean {
  const normalized = channelName.toLowerCase().trim();
  return normalized === 'email' || normalized === 'sms' || normalized === 'socket';
}

/**
 * Tüm geçerli kanal adlarını döndürür
 *
 * @returns Geçerli kanal adları array'i
 */
export function getAllChannels(): NotificationChannel[] {
  return [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.SOCKET];
}

/**
 * Kanal için insan okunabilir açıklama döndürür
 *
 * @param channel - NotificationChannel enum değeri
 * @returns Türkçe açıklama
 */
export function getChannelDescription(channel: NotificationChannel): string {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return 'E-posta (Gmail SMTP)';
    case NotificationChannel.SMS:
      return 'SMS (İleti Merkezi)';
    case NotificationChannel.SOCKET:
      return 'Gerçek Zamanlı (Socket.io)';
  }
}

/**
 * Kanal için teknik detay döndürür
 *
 * @param channel - NotificationChannel enum değeri
 * @returns Teknik açıklama
 */
export function getChannelDetails(channel: NotificationChannel): string {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return 'Gmail SMTP (smtp.gmail.com:587, TLS enabled)';
    case NotificationChannel.SMS:
      return 'İleti Merkezi REST API with DLR tracking';
    case NotificationChannel.SOCKET:
      return 'Socket.io with JWT authentication and room management';
  }
}
