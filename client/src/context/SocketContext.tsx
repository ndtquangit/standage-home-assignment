import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from './contexts';
import type {
  Message,
  UserPresencePayload,
  RoomUserPayload,
  TypingPayload,
  MessageDeletedPayload,
} from '../types';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // If not authenticated, don't create socket
    if (!isAuthenticated || !token) {
      return;
    }

    // Create new socket
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setIsReady(false);
    });

    newSocket.on('ready', () => {
      setIsReady(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsReady(false);
    };
  }, [isAuthenticated, token]);

  // Room actions
  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('room:join', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('room:leave', { roomId });
  }, []);

  // Message actions
  const sendMessage = useCallback((roomId: string, content: string) => {
    socketRef.current?.emit('message:send', { roomId, content });
  }, []);

  const editMessage = useCallback(
    (roomId: string, messageId: string, content: string) => {
      socketRef.current?.emit('message:edit', { roomId, messageId, content });
    },
    []
  );

  const deleteMessage = useCallback((roomId: string, messageId: string) => {
    socketRef.current?.emit('message:delete', { roomId, messageId });
  }, []);

  // Typing actions
  const startTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing:start', { roomId });
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing:stop', { roomId });
  }, []);

  // Event subscription helpers - depend on socket state for reactivity
  const onMessage = useCallback(
    (callback: (message: Message) => void) => {
      socket?.on('message:new', callback);
      return () => {
        socket?.off('message:new', callback);
      };
    },
    [socket]
  );

  const onMessageUpdated = useCallback(
    (callback: (message: Message) => void) => {
      socket?.on('message:updated', callback);
      return () => {
        socket?.off('message:updated', callback);
      };
    },
    [socket]
  );

  const onMessageDeleted = useCallback(
    (callback: (data: MessageDeletedPayload) => void) => {
      socket?.on('message:deleted', callback);
      return () => {
        socket?.off('message:deleted', callback);
      };
    },
    [socket]
  );

  const onUserPresence = useCallback(
    (callback: (data: UserPresencePayload) => void) => {
      socket?.on('user:presence', callback);
      return () => {
        socket?.off('user:presence', callback);
      };
    },
    [socket]
  );

  const onUserJoined = useCallback(
    (callback: (data: RoomUserPayload) => void) => {
      socket?.on('room:user_joined', callback);
      return () => {
        socket?.off('room:user_joined', callback);
      };
    },
    [socket]
  );

  const onUserLeft = useCallback(
    (callback: (data: RoomUserPayload) => void) => {
      socket?.on('room:user_left', callback);
      return () => {
        socket?.off('room:user_left', callback);
      };
    },
    [socket]
  );

  const onRoomDeleted = useCallback(
    (callback: (data: { roomId: string }) => void) => {
      socket?.on('room:deleted', callback);
      return () => {
        socket?.off('room:deleted', callback);
      };
    },
    [socket]
  );

  const onTypingStart = useCallback(
    (callback: (data: TypingPayload) => void) => {
      socket?.on('typing:start', callback);
      return () => {
        socket?.off('typing:start', callback);
      };
    },
    [socket]
  );

  const onTypingStop = useCallback(
    (callback: (data: TypingPayload) => void) => {
      socket?.on('typing:stop', callback);
      return () => {
        socket?.off('typing:stop', callback);
      };
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isReady,
        joinRoom,
        leaveRoom,
        sendMessage,
        editMessage,
        deleteMessage,
        startTyping,
        stopTyping,
        onMessage,
        onMessageUpdated,
        onMessageDeleted,
        onUserPresence,
        onUserJoined,
        onUserLeft,
        onRoomDeleted,
        onTypingStart,
        onTypingStop,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
