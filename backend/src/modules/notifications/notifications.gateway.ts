/**
 * Notifications WebSocket Gateway
 *
 * Socket.io gateway for real-time notification delivery.
 * Supports JWT authentication and user/guest room management.
 *
 * FR-043: Multi-channel notification system
 * FR-044: Admin-configurable notification channels
 * FR-046: Real-time notification delivery via WebSocket
 *
 * @module modules/notifications
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger, UseGuards } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

/**
 * JWT payload yapısı (Socket.io için)
 */
interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
}

/**
 * Socket client metadata
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  trackingCode?: string;
  isGuest?: boolean;
}

/**
 * Notification event payload
 */
export interface NotificationEventPayload {
  eventType: string;
  appointmentId?: string;
  customerId?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Notifications WebSocket Gateway
 *
 * Real-time bildirim gönderimi için WebSocket gateway.
 * JWT authentication ve room management desteği.
 *
 * Rooms:
 * - `user:${userId}` - Kayıtlı kullanıcılar için
 * - `guest:${trackingCode}` - Misafir kullanıcılar için
 *
 * Events:
 * - appointment.created - Randevu oluşturuldu
 * - appointment.confirmed - Randevu onaylandı
 * - appointment.cancelled - Randevu iptal edildi
 * - appointment.reminder - Randevu hatırlatması
 * - payment.reminder - Ödeme hatırlatması
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Gateway initialization
   *
   * Socket.io server hazır olduğunda çağrılır.
   */
  afterInit(server: Server): void {
    this.logger.log("Notifications WebSocket Gateway initialized");
    this.logger.log(`Namespace: /notifications`);
    this.logger.log(
      `CORS origin: ${this.configService.get("FRONTEND_URL") || "http://localhost:3000"}`,
    );
  }

  /**
   * Client bağlantısı kurulduğunda
   *
   * JWT authentication ve room assignment yapar.
   *
   * Query parameters:
   * - token: JWT token (registered users için)
   * - trackingCode: 8-char tracking code (guests için)
   *
   * @param client - Socket client instance
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      const trackingCode = client.handshake.query?.trackingCode as string | undefined;

      // Registered user authentication (JWT)
      if (token && typeof token === "string") {
        await this.authenticateRegisteredUser(client, token);
      }
      // Guest user authentication (tracking code)
      else if (trackingCode) {
        this.authenticateGuestUser(client, trackingCode);
      }
      // No authentication provided
      else {
        this.logger.warn(`Client ${client.id} connected without authentication`);
        client.emit("error", {
          message: "Authentication required. Provide either token or trackingCode.",
        });
        client.disconnect();
        return;
      }

      this.logger.log(`Client connected: ${client.id}`);
      if (client.userId) {
        this.logger.log(`  User: ${client.userEmail} (${client.userRole})`);
      } else if (client.trackingCode) {
        this.logger.log(`  Guest: ${client.trackingCode}`);
      }
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.emit("error", { message: "Connection failed" });
      client.disconnect();
    }
  }

  /**
   * Kayıtlı kullanıcı için JWT authentication
   *
   * Token'ı verify eder ve user bilgilerini socket'e attach eder.
   * User room'una join yapar: `user:${userId}`
   *
   * @param client - Socket client
   * @param token - JWT token
   */
  private async authenticateRegisteredUser(
    client: AuthenticatedSocket,
    token: string,
  ): Promise<void> {
    try {
      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtSecret,
      });

      // Attach user info to socket
      client.userId = payload.sub;
      client.userEmail = payload.email;
      client.userRole = payload.role;
      client.isGuest = false;

      // Join user room
      const userRoom = `user:${payload.sub}`;
      await client.join(userRoom);

      this.logger.debug(`Client ${client.id} joined room: ${userRoom}`);

      // Send authentication success
      client.emit("authenticated", {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        room: userRoom,
      });
    } catch (error) {
      this.logger.error(`JWT authentication failed for client ${client.id}:`, error);
      throw new Error("Invalid JWT token");
    }
  }

  /**
   * Misafir kullanıcı için tracking code authentication
   *
   * Tracking code'u validate eder ve guest room'una join yapar.
   * Guest room: `guest:${trackingCode}`
   *
   * @param client - Socket client
   * @param trackingCode - 8-char alphanumeric tracking code
   */
  private authenticateGuestUser(client: AuthenticatedSocket, trackingCode: string): void {
    // Tracking code validation (8 chars alphanumeric)
    const trackingCodeRegex = /^[A-Z0-9]{8}$/;
    if (!trackingCodeRegex.test(trackingCode)) {
      throw new Error("Invalid tracking code format");
    }

    // Attach guest info to socket
    client.trackingCode = trackingCode;
    client.isGuest = true;

    // Join guest room
    const guestRoom = `guest:${trackingCode}`;
    client.join(guestRoom);

    this.logger.debug(`Client ${client.id} joined guest room: ${guestRoom}`);

    // Send authentication success
    client.emit("authenticated", {
      trackingCode,
      room: guestRoom,
      isGuest: true,
    });
  }

  /**
   * Client bağlantısı kesildiğinde
   *
   * @param client - Socket client instance
   */
  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      this.logger.debug(`  User: ${client.userEmail}`);
    } else if (client.trackingCode) {
      this.logger.debug(`  Guest: ${client.trackingCode}`);
    }
  }

  /**
   * Ping-pong for connection keep-alive
   *
   * Client'tan gelen ping mesajına pong ile cevap verir.
   * Bu sayede connection timeout'u önlenir.
   *
   * @param client - Socket client
   */
  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit("pong", { timestamp: new Date() });
  }

  /**
   * Kayıtlı kullanıcıya bildirim gönder
   *
   * `user:${userId}` room'una event emit eder.
   *
   * @param userId - User ID
   * @param event - Event name (e.g., "appointment.created")
   * @param payload - Notification payload
   */
  sendToUser(userId: string, event: string, payload: NotificationEventPayload): void {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Sent ${event} to user room: ${room}`);
  }

  /**
   * Misafir kullanıcıya bildirim gönder
   *
   * `guest:${trackingCode}` room'una event emit eder.
   *
   * @param trackingCode - 8-char tracking code
   * @param event - Event name
   * @param payload - Notification payload
   */
  sendToGuest(trackingCode: string, event: string, payload: NotificationEventPayload): void {
    const room = `guest:${trackingCode}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Sent ${event} to guest room: ${room}`);
  }

  /**
   * Tüm bağlı client'lara broadcast (admin announcements için)
   *
   * @param event - Event name
   * @param payload - Notification payload
   */
  broadcast(event: string, payload: NotificationEventPayload): void {
    this.server.emit(event, payload);
    this.logger.debug(`Broadcast ${event} to all clients`);
  }

  /**
   * Appointment created notification
   *
   * Randevu oluşturulduğunda müşteriye bildirim gönderir.
   *
   * @param customerId - Customer ID (registered) veya null (guest)
   * @param trackingCode - Tracking code (guest için)
   * @param appointmentData - Randevu bilgileri
   */
  notifyAppointmentCreated(
    customerId: string | null,
    trackingCode: string | null,
    appointmentData: {
      appointmentId: string;
      date: string;
      time: string;
      serviceName: string;
      staffName: string;
    },
  ): void {
    const payload: NotificationEventPayload = {
      eventType: "APPOINTMENT_CREATED",
      appointmentId: appointmentData.appointmentId,
      customerId: customerId || undefined,
      message: `Randevunuz oluşturuldu: ${appointmentData.date} ${appointmentData.time}`,
      data: appointmentData,
      timestamp: new Date(),
    };

    if (customerId) {
      this.sendToUser(customerId, "appointment.created", payload);
    } else if (trackingCode) {
      this.sendToGuest(trackingCode, "appointment.created", payload);
    }
  }

  /**
   * Appointment confirmed notification
   *
   * Randevu onaylandığında müşteriye bildirim gönderir.
   *
   * @param customerId - Customer ID (registered) veya null (guest)
   * @param trackingCode - Tracking code (guest için)
   * @param appointmentData - Randevu bilgileri
   */
  notifyAppointmentConfirmed(
    customerId: string | null,
    trackingCode: string | null,
    appointmentData: {
      appointmentId: string;
      date: string;
      time: string;
      serviceName: string;
    },
  ): void {
    const payload: NotificationEventPayload = {
      eventType: "APPOINTMENT_CONFIRMED",
      appointmentId: appointmentData.appointmentId,
      customerId: customerId || undefined,
      message: `Randevunuz onaylandı: ${appointmentData.date} ${appointmentData.time}`,
      data: appointmentData,
      timestamp: new Date(),
    };

    if (customerId) {
      this.sendToUser(customerId, "appointment.confirmed", payload);
    } else if (trackingCode) {
      this.sendToGuest(trackingCode, "appointment.confirmed", payload);
    }
  }

  /**
   * Appointment cancelled notification
   *
   * Randevu iptal edildiğinde müşteriye bildirim gönderir.
   *
   * @param customerId - Customer ID (registered) veya null (guest)
   * @param trackingCode - Tracking code (guest için)
   * @param appointmentData - Randevu bilgileri
   */
  notifyAppointmentCancelled(
    customerId: string | null,
    trackingCode: string | null,
    appointmentData: {
      appointmentId: string;
      date: string;
      time: string;
      serviceName: string;
      reason?: string;
    },
  ): void {
    const payload: NotificationEventPayload = {
      eventType: "APPOINTMENT_CANCELLED",
      appointmentId: appointmentData.appointmentId,
      customerId: customerId || undefined,
      message: `Randevunuz iptal edildi: ${appointmentData.date} ${appointmentData.time}`,
      data: appointmentData,
      timestamp: new Date(),
    };

    if (customerId) {
      this.sendToUser(customerId, "appointment.cancelled", payload);
    } else if (trackingCode) {
      this.sendToGuest(trackingCode, "appointment.cancelled", payload);
    }
  }

  /**
   * Appointment reminder notification
   *
   * Randevu hatırlatması gönderir (genellikle 1 gün önce).
   *
   * @param customerId - Customer ID (registered only)
   * @param appointmentData - Randevu bilgileri
   */
  notifyAppointmentReminder(
    customerId: string,
    appointmentData: {
      appointmentId: string;
      date: string;
      time: string;
      serviceName: string;
    },
  ): void {
    const payload: NotificationEventPayload = {
      eventType: "APPOINTMENT_REMINDER",
      appointmentId: appointmentData.appointmentId,
      customerId,
      message: `Randevu hatırlatması: Yarın ${appointmentData.time}'de randevunuz var`,
      data: appointmentData,
      timestamp: new Date(),
    };

    this.sendToUser(customerId, "appointment.reminder", payload);
  }

  /**
   * Payment reminder notification
   *
   * Veresiye ödeme hatırlatması gönderir.
   *
   * @param customerId - Customer ID (registered only)
   * @param paymentData - Ödeme bilgileri
   */
  notifyPaymentReminder(
    customerId: string,
    paymentData: {
      paymentId: string;
      amount: number;
      dueDate: string;
      appointmentId: string;
    },
  ): void {
    const payload: NotificationEventPayload = {
      eventType: "PAYMENT_REMINDER",
      appointmentId: paymentData.appointmentId,
      customerId,
      message: `Ödeme hatırlatması: ${paymentData.amount} TL vade tarihi: ${paymentData.dueDate}`,
      data: paymentData,
      timestamp: new Date(),
    };

    this.sendToUser(customerId, "payment.reminder", payload);
  }

  /**
   * Get connected clients count
   *
   * Debugging ve monitoring için bağlı client sayısını döndürür.
   *
   * @returns Bağlı client sayısı
   */
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  /**
   * Get room members count
   *
   * Belirli bir room'daki client sayısını döndürür.
   *
   * @param room - Room name
   * @returns Room'daki client sayısı
   */
  async getRoomMembersCount(room: string): Promise<number> {
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }

  /**
   * Check if user is online
   *
   * Kullanıcının online olup olmadığını kontrol eder.
   *
   * @param userId - User ID
   * @returns User online ise true
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const count = await this.getRoomMembersCount(`user:${userId}`);
    return count > 0;
  }

  /**
   * Check if guest is online
   *
   * Misafir kullanıcının online olup olmadığını kontrol eder.
   *
   * @param trackingCode - Tracking code
   * @returns Guest online ise true
   */
  async isGuestOnline(trackingCode: string): Promise<boolean> {
    const count = await this.getRoomMembersCount(`guest:${trackingCode}`);
    return count > 0;
  }
}
