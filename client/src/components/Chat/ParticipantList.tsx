import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import type { Participant, UserPresencePayload } from '../../types';

interface ParticipantListProps {
  participants: Participant[];
}

export default function ParticipantList({ participants: initialParticipants }: ParticipantListProps) {
  const { onUserPresence } = useSocket();
  const [participants, setParticipants] = useState(initialParticipants);

  // Update participants when prop changes
  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  // Listen for presence updates
  useEffect(() => {
    const unsubscribe = onUserPresence((data: UserPresencePayload) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId ? { ...p, isOnline: data.isOnline } : p
        )
      );
    });

    return unsubscribe;
  }, [onUserPresence]);

  // Sort: online users first, then by nickname
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1;
    }
    return a.nickname.localeCompare(b.nickname);
  });

  const onlineCount = participants.filter((p) => p.isOnline).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-800">Participants</h3>
        <p className="text-xs text-gray-500">
          {onlineCount} online / {participants.length} total
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {sortedParticipants.map((participant) => (
            <li
              key={participant.id}
              className="px-3 py-2 flex items-center gap-2"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  participant.isOnline ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span
                className={`text-sm truncate ${
                  participant.isOnline ? 'text-gray-800' : 'text-gray-500'
                }`}
              >
                {participant.nickname}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
