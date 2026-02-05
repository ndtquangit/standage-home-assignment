import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

// Client -> Server Events

export class JoinRoomDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;
}

export class LeaveRoomDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;
}

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

export class EditMessageDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

export class DeleteMessageDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @IsUUID()
  @IsNotEmpty()
  messageId: string;
}

export class TypingDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;
}

// Server -> Client Events (response types)

export interface UserPresencePayload {
  userId: string;
  nickname: string;
  isOnline: boolean;
  lastSeenAt?: Date;
}

export interface RoomUserPayload {
  roomId: string;
  userId: string;
  nickname: string;
}

export interface MessagePayload {
  id: string;
  content: string;
  senderId: string;
  senderNickname: string;
  roomId: string;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDeletedPayload {
  messageId: string;
  roomId: string;
}

export interface RoomDeletedPayload {
  roomId: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  nickname: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}
