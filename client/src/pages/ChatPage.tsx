import { useState } from 'react';
import Header from '../components/Layout/Header';
import RoomList from '../components/Rooms/RoomList';
import ChatRoom from '../components/Chat/ChatRoom';

export default function ChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with room list */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <RoomList
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {selectedRoomId ? (
            <ChatRoom
              roomId={selectedRoomId}
              onLeaveRoom={() => setSelectedRoomId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">Select a room to start chatting</p>
                <p className="text-sm mt-2">
                  Or create a new room from the sidebar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
