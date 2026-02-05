interface TypingIndicatorProps {
  typingUsers: Map<string, string>;
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.size === 0) {
    return null;
  }

  const names = Array.from(typingUsers.values());
  let text: string;

  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing...`;
  }

  return (
    <div className="px-4 py-1 text-sm text-gray-500 italic flex items-center gap-2">
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      {text}
    </div>
  );
}
