import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { messagesApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import MessageItem from './MessageItem';
import type { Message } from '../../types';

interface MessageListProps {
  roomId: string;
  onEditMessage: (message: Message) => void;
  editingMessageId?: string;
}

export default function MessageList({
  roomId,
  onEditMessage,
  editingMessageId,
}: MessageListProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: ({ pageParam }) => messagesApi.getByRoom(roomId, pageParam, 50),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  // Get all messages flattened and sorted (oldest first for display)
  const allMessages = useMemo(
    () => data?.pages.flatMap((page) => page.messages).reverse() ?? [],
    [data?.pages]
  );

  // Track message count for scroll effect
  const messageCount = allMessages.length;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messageCount > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageCount]);

  // Load more on scroll to top
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Find user's last message to determine if editable
  const userLastMessageId = useMemo(() => {
    const reversed = [...allMessages].reverse();
    return reversed.find((m) => m.senderId === user?.id)?.id;
  }, [allMessages, user?.id]);

  // Check if any message after user's last message is from another user
  const canEditLastMessage = useCallback(
    (messageId: string) => {
      if (!userLastMessageId || userLastMessageId !== messageId) return false;

      const messageIndex = allMessages.findIndex((m) => m.id === messageId);
      const messagesAfter = allMessages.slice(messageIndex + 1);
      return !messagesAfter.some((m) => m.senderId !== user?.id);
    },
    [allMessages, userLastMessageId, user?.id]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
    >
      {isFetchingNextPage && (
        <div className="text-center text-sm text-gray-500 py-2">
          Loading more...
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full text-center text-sm text-blue-500 hover:text-blue-600 py-2"
        >
          Load older messages
        </button>
      )}

      {allMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      ) : (
        allMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === user?.id}
            canEdit={canEditLastMessage(message.id)}
            isEditing={editingMessageId === message.id}
            onEdit={() => onEditMessage(message)}
          />
        ))
      )}

      <div ref={bottomRef} />
    </div>
  );
}
