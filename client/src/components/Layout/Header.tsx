import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

export default function Header() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Chat App</h1>
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isConnected
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Logged in as <strong>{user?.nickname}</strong>
        </span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
