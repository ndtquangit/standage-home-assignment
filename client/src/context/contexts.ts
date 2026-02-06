import { createContext } from 'react';
import { Socket } from 'socket.io-client';
import type {
  User,
  Room,
  Message,
  UserPresencePayload,
  RoomUserPayload,
  TypingPayload,
  MessageDeletedPayload,
} from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (nickname: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReady: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, content: string) => void;
  editMessage: (roomId: string, messageId: string, content: string) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  startTyping: (roomId: string) => void;
  stopTyping: (roomId: string) => void;
  onMessage: (callback: (message: Message) => void) => () => void;
  onMessageUpdated: (callback: (message: Message) => void) => () => void;
  onMessageDeleted: (callback: (data: MessageDeletedPayload) => void) => () => void;
  onUserPresence: (callback: (data: UserPresencePayload) => void) => () => void;
  onUserJoined: (callback: (data: RoomUserPayload) => void) => () => void;
  onUserLeft: (callback: (data: RoomUserPayload) => void) => () => void;
  onRoomCreated: (callback: (data: Room) => void) => () => void;
  onRoomDeleted: (callback: (data: { roomId: string }) => void) => () => void;
  onTypingStart: (callback: (data: TypingPayload) => void) => () => void;
  onTypingStop: (callback: (data: TypingPayload) => void) => () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
export const SocketContext = createContext<SocketContextType | null>(null);
