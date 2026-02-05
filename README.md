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
- **Chat Rooms:** Create, join, and delete rooms
- **Real-time Messaging:** Send and receive messages instantly
- **Message Editing:** Edit your last message (if no one else has sent a message since)
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
| GET | `/api/rooms` | List all rooms |
| POST | `/api/rooms` | Create a room |
| GET | `/api/rooms/:id` | Get room details |
| DELETE | `/api/rooms/:id` | Delete room (creator only) |
| POST | `/api/rooms/:id/join` | Join a room |
| POST | `/api/rooms/:id/leave` | Leave a room |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms/:id/messages` | Get room messages |
| POST | `/api/rooms/:id/messages` | Send a message |
| PATCH | `/api/rooms/:id/messages/:msgId` | Edit a message |
| DELETE | `/api/rooms/:id/messages/:msgId` | Delete a message |

## WebSocket Events

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

1. **Nickname as login:** Same nickname = same user account (no password required)
2. **Soft deletes:** Rooms and messages use soft delete for data integrity
3. **Message editing:** Can only edit your last message if no one else has posted after
4. **Real-time first:** All message operations broadcast via WebSocket
5. **No file uploads:** Text messages only (for simplicity)

## License

This project is created as a home assignment.
