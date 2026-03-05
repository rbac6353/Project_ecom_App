import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@core/database/entities';

/**
 * Real-time Notifications Gateway
 * 
 * Handles WebSocket connections for real-time notification updates
 * Clients can subscribe to receive notifications instantly
 */
@WebSocketGateway({
  cors: {
    origin: '*', // In production, use specific origins
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Handle client connection
   * Authenticate user via JWT token
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.enabled) {
        this.logger.warn(`Invalid user for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Store user-socket mapping
      client.data.userId = user.id;
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Join user-specific room
      client.join(`user:${user.id}`);

      this.logger.log(`User ${user.id} (${user.email}) connected: ${client.id}`);

      // Send unread count on connection
      const unreadCount = await this.notificationsService.countUnread(user.id);
      client.emit('unreadCount', unreadCount);
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected: ${client.id}`);
    }
  }

  /**
   * Subscribe to notifications
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    // Send current unread count
    const unreadCount = await this.notificationsService.countUnread(userId);
    client.emit('unreadCount', unreadCount);

    return { success: true, unreadCount };
  }

  /**
   * Mark notification as read (via WebSocket)
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    await this.notificationsService.markAsRead(data.notificationId, userId);
    
    // Update unread count for all user's sockets
    const unreadCount = await this.notificationsService.countUnread(userId);
    this.server.to(`user:${userId}`).emit('unreadCount', unreadCount);

    return { success: true };
  }

  /**
   * Broadcast notification to specific user
   * Called by NotificationsService when a new notification is created
   */
  async broadcastToUser(userId: number, notification: any) {
    this.server.to(`user:${userId}`).emit('newNotification', notification);
    
    // Update unread count
    const unreadCount = await this.notificationsService.countUnread(userId);
    this.server.to(`user:${userId}`).emit('unreadCount', unreadCount);
  }

  /**
   * Broadcast to all connected users (for admin/system notifications)
   */
  async broadcastToAll(notification: any) {
    this.server.emit('newNotification', notification);
  }
}
