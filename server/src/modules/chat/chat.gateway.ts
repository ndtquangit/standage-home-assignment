import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { AuthenticatedSocket } from '../../common/interfaces/authenticated-socket.interface';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RoomsService } from '../rooms/rooms.service';
import { MessagesService } from '../messages/messages.service';
import {
  JoinRoomDto,
  LeaveRoomDto,
  SendMessageDto,
  EditMessageDto,
  DeleteMessageDto,
  TypingDto,
  UserPresencePayload,
  MessagePayload,
  TypingPayload,
} from './dto';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Track socket -> user mapping for presence
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth.token as string;

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const user = await this.authService.validateToken(token);

      if (!user) {
        this.logger.warn(`Connection rejected: Invalid token`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Attach user to socket
      client.user = user;

      // Track socket for presence
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Update online status if this is the first connection
      if (this.userSockets.get(user.id)!.size === 1) {
        await this.usersService.setOnline(user.id, true);
        this.broadcastUserPresence(user.id, user.nickname, true);
      }

      // Auto-join user to their rooms
      const userRooms = await this.roomsService.getUserRooms(user.id);
      for (const room of userRooms) {
        await client.join(`room:${room.id}`);
      }

      this.logger.log(`User connected: ${user.nickname} (${client.id})`);

      // Notify client that connection setup is complete
      client.emit('ready', { userId: user.id, nickname: user.nickname });
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const user = client.user;

    if (!user) {
      return;
    }

    // Remove socket from tracking
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.delete(client.id);

      // If no more connections, mark user offline
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.id);
        await this.usersService.setOnline(user.id, false);

        const updatedUser = await this.usersService.findById(user.id);
        this.broadcastUserPresence(
          user.id,
          user.nickname,
          false,
          updatedUser?.lastSeenAt ?? undefined,
        );
      }
    }

    this.logger.log(`User disconnected: ${user.nickname} (${client.id})`);
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomDto,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { roomId } = data;
      const user = client.user;

      // Verify user is a participant (don't modify membership - that's done via REST API)
      const isParticipant = await this.roomsService.isParticipant(
        roomId,
        user.id,
      );
      if (!isParticipant) {
        return { success: false, error: 'Not a member of this room' };
      }

      // Join the socket room for real-time updates
      await client.join(`room:${roomId}`);

      this.logger.log(`${user.nickname} subscribed to room ${roomId}`);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to join room';
      return { success: false, error: message };
    }
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LeaveRoomDto,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { roomId } = data;
      const user = client.user;

      // Leave the socket room (don't modify membership - that's done via REST API)
      await client.leave(`room:${roomId}`);

      this.logger.log(`${user.nickname} unsubscribed from room ${roomId}`);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to leave room';
      return { success: false, error: message };
    }
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ): Promise<{ success: boolean; message?: MessagePayload; error?: string }> {
    this.logger.log(`message:send received from ${client.user.nickname}`);
    try {
      const { roomId, content } = data;
      const user = client.user;
      this.logger.log(`Sending message to room ${roomId}: ${content}`);

      // Create message via service
      const messageResponse = await this.messagesService.create(
        roomId,
        user.id,
        content,
      );

      const payload: MessagePayload = {
        id: messageResponse.id,
        content: messageResponse.content,
        senderId: messageResponse.senderId,
        senderNickname: messageResponse.senderNickname,
        roomId: messageResponse.roomId,
        isEdited: messageResponse.isEdited,
        createdAt: messageResponse.createdAt,
        updatedAt: messageResponse.updatedAt,
      };

      // Broadcast to all room members (including sender)
      this.server.to(`room:${roomId}`).emit('message:new', payload);

      return { success: true, message: payload };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      return { success: false, error: message };
    }
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: EditMessageDto,
  ): Promise<{ success: boolean; message?: MessagePayload; error?: string }> {
    try {
      const { roomId, messageId, content } = data;
      const user = client.user;

      // Update message via service (includes constraint validation)
      const messageResponse = await this.messagesService.update(
        messageId,
        user.id,
        content,
      );

      const payload: MessagePayload = {
        id: messageResponse.id,
        content: messageResponse.content,
        senderId: messageResponse.senderId,
        senderNickname: messageResponse.senderNickname,
        roomId: messageResponse.roomId,
        isEdited: messageResponse.isEdited,
        createdAt: messageResponse.createdAt,
        updatedAt: messageResponse.updatedAt,
      };

      // Broadcast to all room members
      this.server.to(`room:${roomId}`).emit('message:updated', payload);

      return { success: true, message: payload };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to edit message';
      return { success: false, error: message };
    }
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: DeleteMessageDto,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { roomId, messageId } = data;
      const user = client.user;

      // Delete message via service
      await this.messagesService.delete(messageId, user.id);

      // Broadcast to all room members
      this.server.to(`room:${roomId}`).emit('message:deleted', {
        messageId,
        roomId,
      });

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete message';
      return { success: false, error: message };
    }
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingDto,
  ): void {
    const { roomId } = data;
    const user = client.user;

    const payload: TypingPayload = {
      roomId,
      userId: user.id,
      nickname: user.nickname,
    };

    client.to(`room:${roomId}`).emit('typing:start', payload);
  }

  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingDto,
  ): void {
    const { roomId } = data;
    const user = client.user;

    const payload: TypingPayload = {
      roomId,
      userId: user.id,
      nickname: user.nickname,
    };

    client.to(`room:${roomId}`).emit('typing:stop', payload);
  }

  // Helper methods for broadcasting from other services

  broadcastUserPresence(
    userId: string,
    nickname: string,
    isOnline: boolean,
    lastSeenAt?: Date,
  ): void {
    const payload: UserPresencePayload = {
      userId,
      nickname,
      isOnline,
      lastSeenAt,
    };

    this.server.emit('user:presence', payload);
  }

  broadcastRoomDeleted(roomId: string): void {
    this.server.to(`room:${roomId}`).emit('room:deleted', { roomId });

    // Disconnect all sockets from the room
    this.server.in(`room:${roomId}`).socketsLeave(`room:${roomId}`);
  }

  broadcastUserJoined(data: {
    roomId: string;
    userId: string;
    nickname: string;
  }): void {
    this.server.to(`room:${data.roomId}`).emit('room:user_joined', data);
  }

  broadcastUserLeft(data: {
    roomId: string;
    userId: string;
    nickname: string;
  }): void {
    this.server.to(`room:${data.roomId}`).emit('room:user_left', data);
  }

  broadcastToRoom(roomId: string, event: string, payload: unknown): void {
    this.server.to(`room:${roomId}`).emit(event, payload);
  }

  broadcastRoomCreated(room: {
    id: string;
    name: string;
    creatorId: string;
    createdAt: Date;
    participantCount?: number;
  }): void {
    this.server.emit('room:created', room);
  }
}
