import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../../api/client';
import { useSocket } from '../../hooks/useSocket';
import type { Room } from '../../types';
import CreateRoomModal from './CreateRoomModal';

interface RoomListProps {
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function RoomList({ selectedRoomId, onSelectRoom }: RoomListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { onRoomCreated } = useSocket();

  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to room:created for real-time updates
  useEffect(() => {
    const unsubscribe = onRoomCreated(() => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    });
    return unsubscribe;
  }, [onRoomCreated, queryClient]);

  const joinMutation = useMutation({
    mutationFn: roomsApi.join,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const handleRoomClick = async (room: Room) => {
    if (selectedRoomId !== room.id) {
      try {
        await joinMutation.mutateAsync(room.id);
      } catch {
        // Already a member - ignore error
      }
      onSelectRoom(room.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Failed to load rooms. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          + Create Room
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rooms?.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No rooms yet.</p>
            <p className="text-sm mt-1">Create one to get started!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rooms?.map((room) => (
              <li key={room.id}>
                <button
                  onClick={() => handleRoomClick(room)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedRoomId === room.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-800 truncate">
                    {room.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {room.participantCount ?? 0} participant
                    {(room.participantCount ?? 0) !== 1 ? 's' : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(roomId) => {
          setIsCreateModalOpen(false);
          onSelectRoom(roomId);
        }}
      />
    </>
  );
}
