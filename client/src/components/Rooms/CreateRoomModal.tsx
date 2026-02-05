import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../../api/client';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
  onCreated,
}: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setName('');
      onCreated(room.id);
    },
    onError: () => {
      setError('Failed to create room. Please try again.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a room name');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Room name must be 100 characters or less');
      return;
    }

    createMutation.mutate(trimmedName);
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Create New Room</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Room Name
            </label>
            <input
              type="text"
              id="roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              disabled={createMutation.isPending}
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
