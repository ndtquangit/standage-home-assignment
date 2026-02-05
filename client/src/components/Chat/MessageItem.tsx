import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
}

export default function MessageItem({
  message,
  isOwn,
  canEdit,
  isEditing,
  onEdit,
}: MessageItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
    >
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
        } ${isEditing ? 'ring-2 ring-yellow-400' : ''}`}
      >
        {!isOwn && (
          <div className="text-xs font-medium mb-1 opacity-75">
            {message.senderNickname}
          </div>
        )}
        <div className="break-words whitespace-pre-wrap">{message.content}</div>
        <div
          className={`text-xs mt-1 flex items-center gap-2 ${
            isOwn ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {message.isEdited && <span>(edited)</span>}
          {isOwn && canEdit && !isEditing && (
            <button
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
