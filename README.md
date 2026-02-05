# Chat Application

A real-time chat application built with NestJS, React, and PostgreSQL.

## Tech Stack

### Backend
- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Socket.io

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Query (TanStack Query)
- **Real-time:** Socket.io-client

### Infrastructure
- **Containerization:** Docker & Docker Compose

## Features

- **User Authentication:** Login with nickname (no password required)
- **Chat Rooms:** Create, join, leave, and delete rooms
- **Messaging:** Send, edit, and delete messages with cursor-based pagination
- **Message Editing Constraint:** Edit your last message only if no one else has sent a message since
- **Real-time Messaging:** Send and receive messages instantly via WebSocket
- **User Presence:** See who's online/offline
- **Typing Indicators:** See when others are typing

## Project Structure

```
├── docker-compose.yml          # Production Docker setup
├── docker-compose.dev.yml      # Development overrides
├── .env.example                # Environment variables template
├── server/                     # NestJS backend
│   ├── src/
│   │   ├── common/             # Shared utilities, guards, decorators
│   │   ├── config/             # Configuration files
│   │   └── modules/            # Feature modules (auth, users, rooms, messages, chat)
│   └── Dockerfile
└── client/                     # React frontend
    ├── src/
    │   ├── components/         # React components
    │   ├── context/            # React contexts
    │   ├── hooks/              # Custom hooks
    │   └── pages/              # Page components
    └── Dockerfile
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd standage-home-assignment
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your settings if needed
   ```

3. **Install dependencies**
   ```bash
   # Server
   cd server && npm install

   # Client
   cd ../client && npm install
   ```

### Running with Docker (Recommended)

```bash
# Start all services (PostgreSQL, Server, Client)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running for Development

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Start server (in separate terminal)
cd server
npm run start:dev

# Start client (in separate terminal)
cd client
npm run dev
```

### Access the Application

- **Frontend:** http://localhost:5173 (dev) or http://localhost:80 (Docker)
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with nickname |
| POST | `/api/auth/logout` | Logout (requires auth) |
| GET | `/api/auth/me` | Get current user (requires auth) |

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List all rooms with participant counts |
| POST | `/api/rooms` | Create a room (auto-joins creator) |
| GET | `/api/rooms/:id` | Get room details with participants |
| DELETE | `/api/rooms/:id` | Delete room (creator only) |
| POST | `/api/rooms/:id/join` | Join a room |
| POST | `/api/rooms/:id/leave` | Leave a room |
| GET | `/api/rooms/:id/participants` | List room participants |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms/:id/messages` | Get messages (paginated) |
| POST | `/api/rooms/:id/messages` | Send a message |
| PATCH | `/api/rooms/:id/messages/:msgId` | Edit message (with constraint) |
| DELETE | `/api/rooms/:id/messages/:msgId` | Delete a message |

**Query Parameters for GET messages:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cursor` | UUID | - | Message ID to start from (for pagination) |
| `limit` | number | 50 | Number of messages (1-100) |

**Edit Constraint:** You can only edit your last message if no other user has sent a message after yours.

### API Examples

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"john"}'
# Response: {"user":{...},"accessToken":"eyJ..."}

# Create a room (use token from login)
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"General"}'

# Send a message
curl -X POST http://localhost:3000/api/rooms/<roomId>/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content":"Hello, world!"}'

# Get messages with pagination
curl "http://localhost:3000/api/rooms/<roomId>/messages?limit=20" \
  -H "Authorization: Bearer <token>"
```

## WebSocket Events (Phase 4 - Pending)

### Client → Server
- `room:join` - Join a room channel
- `room:leave` - Leave a room channel
- `message:send` - Send a message
- `message:edit` - Edit last message
- `typing:start` / `typing:stop` - Typing indicators

### Server → Client
- `message:new` - New message received
- `message:updated` - Message was edited
- `message:deleted` - Message was deleted
- `user:online` / `user:offline` - User presence
- `room:user_joined` / `room:user_left` - Room membership
- `room:deleted` - Room was deleted

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_USERNAME` | Database user | `chatapp` |
| `DATABASE_PASSWORD` | Database password | `chatapp_password` |
| `DATABASE_NAME` | Database name | `chatapp` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRATION` | Token expiration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |

## Development

### Running Tests

```bash
cd server
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage
```

### Linting

```bash
cd server
npm run lint        # ESLint
npm run format      # Prettier
```

### Building

```bash
# Server
cd server && npm run build

# Client
cd client && npm run build
```

## Design Decisions & Assumptions

1. **Nickname as login:** Same nickname = same user account (unique constraint, no password required)
2. **Session tokens:** JWT stored in database for logout invalidation
3. **Soft deletes:** Rooms and messages use soft delete for data integrity
4. **Room membership:** Users must join a room to send messages; supports re-join after leaving
5. **Auto-join:** Room creator is automatically added as participant
6. **Message editing constraint:** Can only edit your last message if no one else has posted after
7. **Creator-only deletion:** Only room creator can delete the room
8. **Cursor-based pagination:** Messages fetched newest-first with cursor for infinite scroll
9. **No file uploads:** Text messages only (for simplicity)

## License

This project is created as a home assignment.
