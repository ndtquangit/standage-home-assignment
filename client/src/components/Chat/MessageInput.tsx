import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useSocket } from '../../hooks/useSocket';
import type { Message } from '../../types';

interface MessageInputProps {
  roomId: string;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  onEditComplete: () => void;
}

export default function MessageInput({
  roomId,
  editingMessage,
  onCancelEdit,
  onEditComplete,
}: MessageInputProps) {
  // Initialize with editing message content (parent uses key prop to reset)
  const [content, setContent] = useState(editingMessage?.content ?? '');
  const { isReady, sendMessage, editMessage, startTyping, stopTyping } = useSocket();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Handle typing indicators
  const handleTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(roomId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      stopTyping(roomId);
    }, 2000);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || !isReady) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(roomId);
    }

    if (editingMessage) {
      editMessage(roomId, editingMessage.id, trimmedContent);
      onEditComplete();
    } else {
      sendMessage(roomId, trimmedContent);
    }

    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Cancel edit on Escape
    if (e.key === 'Escape' && editingMessage) {
      onCancelEdit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!editingMessage) {
      handleTyping();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {editingMessage && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-yellow-600">Editing message...</span>
          <button
            onClick={onCancelEdit}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={inputRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
          rows={1}
          className="flex-1 resize-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          disabled={!isReady}
        />
        <button
          type="submit"
          disabled={!isReady || !content.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {editingMessage ? 'Save' : 'Send'}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-2">
        Press Enter to send, Shift+Enter for new line
        {editingMessage && ', Escape to cancel'}
      </p>
    </div>
  );
}
