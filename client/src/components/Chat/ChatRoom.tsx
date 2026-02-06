import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { roomsApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ParticipantList from './ParticipantList';
import TypingIndicator from './TypingIndicator';
import type { Message, TypingPayload } from '../../types';

interface ChatRoomProps {
  roomId: string;
  onLeaveRoom: () => void;
}

export default function ChatRoom({ roomId, onLeaveRoom }: ChatRoomProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    isReady,
    joinRoom,
    leaveRoom,
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onUserJoined,
    onUserLeft,
    onRoomDeleted,
    onTypingStart,
    onTypingStop,
  } = useSocket();

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomDeletedMessage, setRoomDeletedMessage] = useState<string | null>(null);

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsApi.getById(roomId),
    enabled: !!roomId,
  });

  // Join/leave socket room for real-time updates
  useEffect(() => {
    if (!isReady || !roomId) return;

    joinRoom(roomId);

    return () => {
      leaveRoom(roomId);
    };
  }, [isReady, roomId, joinRoom, leaveRoom]);

  const deleteMutation = useMutation({
    mutationFn: () => roomsApi.delete(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onLeaveRoom();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => roomsApi.leave(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onLeaveRoom();
    },
  });

  // Subscribe to real-time events
  useEffect(() => {
    if (!isReady) return;

    const unsubMessage = onMessage((message) => {
      if (message.roomId === roomId) {
        queryClient.setQueryData<{ pages: { messages: Message[] }[] }>(
          ['messages', roomId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, index) =>
                index === 0
                  ? { ...page, messages: [message, ...page.messages] }
                  : page
              ),
            };
          }
        );
        // Clear typing indicator for this user
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(message.senderId);
          return next;
        });
      }
    });

    const unsubUpdated = onMessageUpdated((message) => {
      if (message.roomId === roomId) {
        queryClient.setQueryData<{ pages: { messages: Message[] }[] }>(
          ['messages', roomId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === message.id ? message : m
                ),
              })),
            };
          }
        );
      }
    });

    const unsubDeleted = onMessageDeleted((data) => {
      if (data.roomId === roomId) {
        queryClient.setQueryData<{ pages: { messages: Message[] }[] }>(
          ['messages', roomId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.filter((m) => m.id !== data.messageId),
              })),
            };
          }
        );
      }
    });

    const unsubJoined = onUserJoined((data) => {
      if (data.roomId === roomId) {
        queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      }
    });

    const unsubLeft = onUserLeft((data) => {
      if (data.roomId === roomId) {
        queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      }
    });

    const unsubRoomDeleted = onRoomDeleted((data) => {
      if (data.roomId === roomId) {
        // Show notification for participants (not the creator who deleted)
        setRoomDeletedMessage('This room has been deleted by the owner.');
      }
    });

    const unsubTypingStart = onTypingStart((data: TypingPayload) => {
      if (data.roomId === roomId && data.userId !== user?.id) {
        setTypingUsers((prev) => new Map(prev).set(data.userId, data.nickname));
      }
    });

    const unsubTypingStop = onTypingStop((data: TypingPayload) => {
      if (data.roomId === roomId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    });

    return () => {
      unsubMessage();
      unsubUpdated();
      unsubDeleted();
      unsubJoined();
      unsubLeft();
      unsubRoomDeleted();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [
    isReady,
    roomId,
    user?.id,
    queryClient,
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onUserJoined,
    onUserLeft,
    onRoomDeleted,
    onTypingStart,
    onTypingStop,
    onLeaveRoom,
  ]);

  const handleEditMessage = useCallback((message: Message) => {
    setEditingMessage(message);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditingMessage(null);
  }, []);

  if (roomLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Room not found</div>
      </div>
    );
  }

  const isCreator = room.creatorId === user?.id;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Room header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">{room.name}</h2>
            <p className="text-xs text-gray-500">
              {room.participants.length} participant
              {room.participants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {isCreator ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Delete Room
              </button>
            ) : (
              <button
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <MessageList
          roomId={roomId}
          onEditMessage={handleEditMessage}
          editingMessageId={editingMessage?.id}
        />

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Message input */}
        <MessageInput
          key={editingMessage?.id ?? 'new'}
          roomId={roomId}
          editingMessage={editingMessage}
          onCancelEdit={handleCancelEdit}
          onEditComplete={handleEditComplete}
        />
      </div>

      {/* Participant sidebar */}
      <div className="w-60 bg-white border-l border-gray-200">
        <ParticipantList participants={room.participants} />
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Delete Room?
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{room.name}"? This will remove the
              room for all {room.participants.length} participant
              {room.participants.length !== 1 ? 's' : ''}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteConfirm(false);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room deleted notification for participants */}
      {roomDeletedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Room Deleted
            </h2>
            <p className="text-gray-600 mb-6">{roomDeletedMessage}</p>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['rooms'] });
                onLeaveRoom();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
