# Discord Clone

A production-grade, full-stack Discord clone built with **Spring Boot 3**, **React 18**, **WebSockets (STOMP/SockJS)**, **Apache Kafka**, **Redis**, and **PostgreSQL**. Supports real-time messaging, presence indicators, channel management, and invite-based server joining.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Backend Components](#backend-components)
7. [Frontend Components](#frontend-components)
8. [API Reference](#api-reference)
9. [WebSocket Protocol](#websocket-protocol)
10. [Getting Started](#getting-started)
11. [Environment Configuration](#environment-configuration)
12. [Running Tests](#running-tests)
13. [Design Decisions](#design-decisions)
14. [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Details |
|---|---|
| **Authentication** | JWT-based register/login, persistent sessions via `localStorage` |
| **Servers** | Create servers, generate invite codes, join via code, delete |
| **Channels** | Text channels with position ordering; owner/admin can create & delete |
| **Real-time Messaging** | WebSocket (STOMP) + Kafka pipeline: create, edit, delete messages |
| **Message Pagination** | Cursor-based (`?before=<id>`) infinite-scroll loading |
| **Presence** | Online/offline indicators, 30 s heartbeat, Redis TTL-based expiry |
| **Role-based Access** | OWNER > ADMIN > MEMBER enforcement on all write operations |
| **Toast Notifications** | Non-intrusive feedback for every user action (success + error) |

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Framework | Spring Boot | 3.2.5 |
| Security | Spring Security 6 + JJWT | 0.12.x |
| WebSocket | Spring WebSocket (STOMP) + SockJS | — |
| Messaging | Apache Kafka (Confluent) | 7.6.0 |
| Caching / Presence | Redis | 7 |
| Database | PostgreSQL | 16 |
| ORM | Spring Data JPA (Hibernate 6) | — |
| Migrations | Flyway | 9.x |
| Utilities | Lombok, Jackson | — |
| Build | Maven | 3.9+ |
| Tests | JUnit 5, Mockito | — |
| Java | 17 or 21 | ⚠️ Not 25 (Lombok compat) |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.3.x |
| Language | TypeScript | 5.5.x |
| Build | Vite | 5.4.x |
| Styling | Tailwind CSS | 3.4.x |
| Components | shadcn/ui (Radix UI) | — |
| WebSocket | @stomp/stompjs + SockJS | 7.x |
| HTTP | Axios | 1.7.x |
| Icons | Lucide React | 0.446.x |
| Date Utils | date-fns | 4.x |
| Toasts | Sonner | 2.x |
| Routing | React Router DOM | 6.x |
| Tests | Vitest + Testing Library | 2.x / 16.x |
| Linting | ESLint 9 (flat config) + Prettier | — |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (React/Vite)                   │
│  ┌─────────────┐   HTTP/REST   ┌────────────────────────┐│
│  │  React SPA  │◄────────────►│  Axios (api.ts)        ││
│  │  (shadcn/ui)│              └────────────────────────┘│
│  │             │  STOMP/SockJS ┌────────────────────────┐│
│  │             │◄────────────►│  @stomp/stompjs         ││
│  └─────────────┘              └────────────────────────┘│
└──────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│               Spring Boot 3 (port 8080)                   │
│  ┌────────────────┐      ┌──────────────────────────────┐│
│  │  REST API      │      │  WebSocket (STOMP)           ││
│  │  /api/**       │      │  /ws  endpoint               ││
│  │                │      │  JWT interceptor              ││
│  │  AuthController│      │  ChatController (@Message)   ││
│  │  ServerCtrl    │      │  PresenceController           ││
│  │  ChannelCtrl   │      └──────────────────────────────┘│
│  │  MessageCtrl   │                │                      │
│  └────────────────┘                ▼                      │
│         │              ┌───────────────────────┐          │
│         │              │  Kafka Producer        │          │
│         │              │  topic: chat.messages  │          │
│         ▼              └───────────────────────┘          │
│  ┌─────────────┐              │                           │
│  │ JPA/Hibernate│             ▼                           │
│  │ Repositories │  ┌───────────────────────┐             │
│  └─────────────┘  │  Kafka Consumer        │             │
│         │          │  → STOMP broadcast     │             │
│         │          └───────────────────────┘             │
└─────────┼──────────────────────────────────────────────── ┘
          │
          ▼
┌─────────────────────────────────────────┐
│           Infrastructure                 │
│  ┌──────────┐  ┌────────┐  ┌─────────┐  │
│  │PostgreSQL│  │ Redis  │  │  Kafka  │  │
│  │ (data)   │  │(presence│  │(messages│  │
│  │          │  │ TTLs)  │  │pipeline)│  │
│  └──────────┘  └────────┘  └─────────┘  │
└─────────────────────────────────────────┘
```

### Real-time Message Flow

```
User types → Enter key
    │
    ▼
STOMP publish /app/channel/{id}/send
    │
    ▼
ChatController.handleMessage()
    │
    ├─► MessageService.save() → PostgreSQL
    │
    └─► KafkaProducer.send("chat.messages", event)
              │
              ▼
         KafkaChatConsumer.consume()
              │
              ▼
         SimpMessagingTemplate.convertAndSend
              /topic/channel/{id}
              │
              ▼
    All subscribed clients receive MESSAGE_CREATE event
```

### Presence Flow

```
Browser connects WebSocket
    │
    ▼
WebSocketEventListener.handleConnect()
    │
    ├─► Redis SET presence:{userId} = "ONLINE"  (TTL 35s)
    └─► Broadcast PRESENCE_UPDATE ONLINE to all user's servers

Client heartbeat every 30s:
    /app/presence/heartbeat → Redis EXPIRE reset to 35s

Browser disconnects:
    │
    ▼
WebSocketEventListener.handleDisconnect()
    │
    ├─► Redis DEL presence:{userId}
    └─► Broadcast PRESENCE_UPDATE OFFLINE
```

---

## Project Structure

```
discord/
├── docker-compose.yml              # PostgreSQL, Redis, Kafka, ZooKeeper
├── README.md
│
├── backend/
│   ├── pom.xml                     # Maven dependencies
│   ├── mvnw / mvnw.cmd             # Maven wrapper
│   └── src/
│       ├── main/
│       │   ├── java/com/discord/
│       │   │   ├── DiscordApplication.java
│       │   │   │
│       │   │   ├── config/
│       │   │   │   ├── KafkaConfig.java         # Kafka producer/consumer beans
│       │   │   │   ├── RedisConfig.java          # RedisTemplate configuration
│       │   │   │   ├── SecurityConfig.java       # JWT filter chain, CORS
│       │   │   │   └── WebSocketConfig.java      # STOMP broker, /ws endpoint
│       │   │   │
│       │   │   ├── controller/
│       │   │   │   ├── AuthController.java       # POST /auth/register, /auth/login, GET /auth/me
│       │   │   │   ├── ChatController.java       # @MessageMapping for STOMP send
│       │   │   │   ├── ChannelController.java    # REST CRUD for channels
│       │   │   │   ├── MessageController.java    # REST CRUD for messages
│       │   │   │   ├── PresenceController.java   # @MessageMapping for heartbeat
│       │   │   │   └── ServerController.java     # REST CRUD for servers + join/leave
│       │   │   │
│       │   │   ├── domain/
│       │   │   │   ├── Channel.java              # @Entity: id, serverId, name, type, position
│       │   │   │   ├── Message.java              # @Entity: id, channelId, authorId, content
│       │   │   │   ├── Server.java               # @Entity: id, name, ownerId, inviteCode
│       │   │   │   ├── ServerMember.java         # @Entity: serverId, userId, role
│       │   │   │   └── User.java                 # @Entity: id, username, email, passwordHash
│       │   │   │
│       │   │   ├── dto/
│       │   │   │   ├── request/                  # CreateServerRequest, SendMessageRequest, etc.
│       │   │   │   └── response/                 # UserResponse, ServerDetailResponse, etc.
│       │   │   │
│       │   │   ├── exception/
│       │   │   │   ├── ConflictException.java    # 409 Conflict
│       │   │   │   ├── ForbiddenException.java   # 403 Forbidden
│       │   │   │   ├── GlobalExceptionHandler.java # @RestControllerAdvice
│       │   │   │   └── ResourceNotFoundException.java # 404 Not Found
│       │   │   │
│       │   │   ├── kafka/
│       │   │   │   ├── ChatMessageEvent.java     # Serializable Kafka event payload
│       │   │   │   └── KafkaChatConsumer.java    # @KafkaListener → STOMP broadcast
│       │   │   │
│       │   │   ├── listener/
│       │   │   │   └── WebSocketEventListener.java  # Connect/Disconnect presence handling
│       │   │   │
│       │   │   ├── repository/
│       │   │   │   ├── ChannelRepository.java
│       │   │   │   ├── MessageRepository.java    # findByChannelId with cursor pagination
│       │   │   │   ├── ServerMemberRepository.java
│       │   │   │   ├── ServerRepository.java
│       │   │   │   └── UserRepository.java
│       │   │   │
│       │   │   ├── security/
│       │   │   │   ├── CustomUserDetailsService.java
│       │   │   │   ├── JwtAuthenticationFilter.java  # OncePerRequestFilter
│       │   │   │   ├── JwtTokenProvider.java         # Sign / validate / extract JWT claims
│       │   │   │   ├── UserPrincipal.java            # UserDetails adapter
│       │   │   │   └── WebSocketAuthInterceptor.java # ChannelInterceptor for STOMP
│       │   │   │
│       │   │   └── service/
│       │   │       ├── AuthService.java          # register, login
│       │   │       ├── ChannelService.java       # create, list, delete channels
│       │   │       ├── MessageService.java       # send, edit, delete, paginate messages
│       │   │       ├── PresenceService.java      # Redis TTL management
│       │   │       └── ServerService.java        # create, join, leave, delete servers
│       │   │
│       │   └── resources/
│       │       ├── application.yml               # All configuration (DB, Redis, Kafka, JWT)
│       │       └── db/migration/
│       │           └── V1__init_schema.sql       # Full schema: users, servers, channels, messages
│       │
│       └── test/
│           ├── java/com/discord/
│           │   ├── security/JwtTokenProviderTest.java
│           │   └── service/
│           │       ├── AuthServiceTest.java
│           │       ├── MessageServiceTest.java
│           │       └── ServerServiceTest.java
│           └── http/                             # IntelliJ HTTP Client files
│               ├── http-client.env.json          # Environment variables
│               ├── 01_auth.http                  # 10 auth endpoint tests
│               ├── 02_servers.http               # 14 server endpoint tests
│               ├── 03_channels.http              # 10 channel endpoint tests
│               └── 04_messages.http              # 16 message endpoint tests
│
└── client/
    ├── package.json
    ├── vite.config.ts                # Vite + Vitest config, `global: 'globalThis'` SockJS fix
    ├── tsconfig.json
    ├── eslint.config.js              # ESLint 9 flat config
    ├── .prettierrc
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx                   # Router: ProtectedLayout wraps /app routes in SocketProvider
        ├── index.css                 # Tailwind base + Discord color tokens
        │
        ├── __tests__/
        │   ├── setup.ts              # jest-dom + scrollIntoView mock
        │   ├── AuthContext.test.tsx  # 5 tests: login, logout, persistence, error
        │   ├── LoginForm.test.tsx    # 5 tests: render, loading, error, fallback
        │   ├── RegisterForm.test.tsx # 7 tests: render, success, field errors, server errors
        │   ├── ServerSidebar.test.tsx # 13 tests: dialogs, create, join, navigation
        │   ├── ChannelSidebar.test.tsx # 14 tests: CRUD, permissions, logout
        │   ├── MessageInput.test.tsx  # 8 tests: send, keyboard shortcuts, disabled state
        │   ├── MessageItem.test.tsx   # 13 tests: hover, edit, delete, toasts
        │   ├── MessageList.test.tsx   # 8 tests: pagination, loading, empty state
        │   ├── ChatArea.test.tsx      # 7 tests: channel states, hook integration
        │   └── AppPage.test.tsx       # 9 tests: routing, auto-nav, member list
        │
        ├── components/
        │   ├── auth/
        │   │   ├── LoginForm.tsx     # Email/password login with error handling
        │   │   └── RegisterForm.tsx  # Username/email/password with field-level errors
        │   │
        │   ├── chat/
        │   │   ├── ChatArea.tsx      # Orchestrates MessageList + MessageInput
        │   │   ├── MessageInput.tsx  # Auto-resize textarea, Enter to send, Shift+Enter newline
        │   │   ├── MessageItem.tsx   # Hover toolbar, inline edit, delete, toast on error
        │   │   └── MessageList.tsx   # Virtual scroll, load-more on scroll-top, auto-scroll
        │   │
        │   ├── layout/
        │   │   ├── ChannelSidebar.tsx  # Server header, channel list, user panel, logout
        │   │   ├── MembersList.tsx     # Right sidebar: online/offline member groups
        │   │   └── ServerSidebar.tsx   # Left icon rail, create/join server dialogs
        │   │
        │   └── ui/                   # shadcn/ui primitives
        │       ├── avatar.tsx
        │       ├── button.tsx
        │       ├── dialog.tsx
        │       ├── input.tsx
        │       ├── label.tsx
        │       ├── scroll-area.tsx
        │       ├── separator.tsx
        │       └── tooltip.tsx
        │
        ├── context/
        │   ├── AuthContext.tsx      # login/logout, token + user in localStorage
        │   └── SocketContext.tsx    # STOMP client lifecycle, subscribe/publish helpers
        │
        ├── hooks/
        │   ├── useMessages.ts      # Load + paginate messages, real-time STOMP subscription
        │   ├── usePresence.ts      # Subscribe to server presence events
        │   └── useServers.ts       # Load server list, create/join helpers
        │
        ├── lib/
        │   ├── api.ts              # Axios instance with JWT Authorization header
        │   ├── socket.ts           # createStompClient factory (SockJS transport)
        │   └── utils.ts            # Tailwind `cn()` merge helper
        │
        ├── pages/
        │   ├── AppPage.tsx         # Main app layout, server/channel params, server detail load
        │   ├── LoginPage.tsx
        │   └── RegisterPage.tsx
        │
        └── types/
            └── index.ts            # All shared TypeScript interfaces
```

---

## Database Schema

```sql
-- Users
users (id UUID PK, username VARCHAR(32) UNIQUE, email VARCHAR(255) UNIQUE,
       password_hash, avatar_url, created_at, updated_at)

-- Servers
servers (id UUID PK, name VARCHAR(100), icon_url, owner_id → users.id,
         invite_code VARCHAR(12) UNIQUE, created_at)

-- Server membership with role
server_members (id UUID PK, server_id → servers.id CASCADE,
                user_id → users.id CASCADE, role VARCHAR(10) DEFAULT 'MEMBER',
                joined_at, UNIQUE(server_id, user_id))

-- Channels belong to servers
channels (id UUID PK, server_id → servers.id CASCADE,
          name VARCHAR(100), type VARCHAR(10) DEFAULT 'TEXT',
          position INT DEFAULT 0, created_at)

-- Messages with cascade delete when channel is deleted
messages (id UUID PK, channel_id → channels.id CASCADE,
          author_id → users.id, content TEXT, edited BOOLEAN DEFAULT false,
          created_at, updated_at)

-- Performance indexes
CREATE INDEX idx_messages_channel_created  ON messages(channel_id, created_at DESC);
CREATE INDEX idx_server_members_user_id    ON server_members(user_id);
CREATE INDEX idx_channels_server_position  ON channels(server_id, position);
```

---

## Backend Components

### Security Layer

**`JwtTokenProvider`** — Signs tokens with HMAC-SHA256. Validates expiry and signature. Extracts `userId` from claims.

**`JwtAuthenticationFilter`** — `OncePerRequestFilter`. Reads `Authorization: Bearer <token>`, validates, and sets `SecurityContextHolder`. Passes through without setting context on invalid/missing token (endpoints not in `permitAll` will return 401).

**`WebSocketAuthInterceptor`** — `ChannelInterceptor` on `CONNECT` frames. Reads `Authorization` from STOMP headers. Sets principal on message so `@AuthenticationPrincipal` works in `@MessageMapping` methods.

### Service Layer

| Service | Responsibility |
|---|---|
| `AuthService` | BCrypt password hashing, JWT generation, register/login logic |
| `ServerService` | Create with auto-invite-code and `#general` channel; join/leave; role checks |
| `ChannelService` | Create (OWNER/ADMIN only), list, delete with role enforcement |
| `MessageService` | Save, cursor-based pagination, edit (own only), delete (own only) |
| `PresenceService` | Redis key lifecycle: set with TTL, extend, delete, check status |

### Controller Layer

| Controller | Endpoints |
|---|---|
| `AuthController` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| `ServerController` | `GET/POST /servers`, `GET/PUT/DELETE /servers/{id}`, `POST /servers/join/{code}`, `DELETE /servers/{id}/leave` |
| `ChannelController` | `GET/POST /servers/{id}/channels`, `DELETE /servers/{id}/channels/{chId}` |
| `MessageController` | `POST/GET /channels/{id}/messages`, `PUT/DELETE /channels/{id}/messages/{msgId}` |
| `ChatController` | `@MessageMapping /channel/{id}/send` — STOMP receive, save, Kafka publish |
| `PresenceController` | `@MessageMapping /presence/heartbeat` — Redis TTL refresh |

### Exception Handling

`GlobalExceptionHandler` (`@RestControllerAdvice`) maps:
- `ResourceNotFoundException` → 404
- `ConflictException` → 409
- `ForbiddenException` → 403
- `MethodArgumentNotValidException` → 400 with `{ fields: { fieldName: errorMsg } }`

---

## Frontend Components

### `App.tsx` — Router

Wraps all routes in `AuthProvider`. Protected routes (`/app/**`) use `ProtectedLayout` which renders `SocketProvider` + `<Outlet>`. This ensures the STOMP connection is created once and not recreated on route changes.

```
/ → /app (redirect)
/login → LoginPage
/register → RegisterPage
/app → AppPage (protected)
/app/:serverId → AppPage
/app/:serverId/:channelId → AppPage
```

### `AuthContext`

Stores `{ token, user, isAuthenticated }` in React state and mirrors to `localStorage` (`discord_token`, `discord_user`). Exposes `login(token, user)` and `logout()`.

### `SocketContext`

Creates a `@stomp/stompjs` `Client` with SockJS transport. Connects on auth, disconnects on logout. Exposes `client`, `connected`, `subscribe(dest, cb)`, and `publish(dest, body)`.

### `useMessages(channelId)`

- Initial load: `GET /channels/{id}/messages?limit=50`
- Real-time: subscribes `/topic/channel/{id}` for `MESSAGE_CREATE`, `MESSAGE_UPDATE`, `MESSAGE_DELETE`
- `loadMore()`: cursor-based older message fetch
- `sendMessage(content)`: STOMP publish
- `editMessage(id, content)`: REST PUT
- `deleteMessage(id)`: REST DELETE

### `useServers()`

- Initial load: `GET /servers`
- `createServer(name)`: POST → updates local list
- `joinServer(code)`: POST → updates local list

### `usePresence(serverId)`

Subscribes `/topic/server/{serverId}/presence` for `PRESENCE_UPDATE` events. Returns `onlineUsers: Set<string>` with currently online user IDs.

### Toast Notifications (Sonner)

| Action | Toast Type |
|---|---|
| Create server success | `toast.success("Server 'X' created!")` |
| Join server success | `toast.success("Joined 'X'!")` |
| Create channel success | `toast.success("Channel #name created!")` |
| Edit message error | `toast.error("Failed to edit message.")` |
| Delete message error | `toast.error("Failed to delete message.")` |
| Load messages error | `toast.error("Failed to load messages.")` |

---

## API Reference

### Authentication

```
POST   /api/auth/register
Body:  { username, email, password }
200:   { token: string, user: User }
409:   { error: "Email already taken" }
400:   { fields: { field: "error" } }

POST   /api/auth/login
Body:  { email, password }
200:   { token: string, user: User }
401:   { error: "Invalid email or password" }

GET    /api/auth/me
Auth:  Bearer token
200:   User
401:   (no token)
```

### Servers

```
GET    /api/servers                       → Server[]
POST   /api/servers                       Body: { name }  → ServerDetail (201)
GET    /api/servers/:id                   → ServerDetail
PUT    /api/servers/:id                   Body: { name }  → ServerDetail (OWNER only)
DELETE /api/servers/:id                                     (OWNER only, 204)
POST   /api/servers/join/:inviteCode      → ServerDetail
DELETE /api/servers/:id/leave                               (non-owner, 204)
```

### Channels

```
GET    /api/servers/:id/channels           → Channel[]
POST   /api/servers/:id/channels          Body: { name, type }  → Channel (201, OWNER/ADMIN)
DELETE /api/servers/:id/channels/:chId                           (OWNER/ADMIN, 204)
```

### Messages

```
GET    /api/channels/:id/messages         ?limit=50[&before=<msgId>]  → Message[]
POST   /api/channels/:id/messages         Body: { content }           → Message (201)
PUT    /api/channels/:id/messages/:msgId  Body: { content }           → Message (own only)
DELETE /api/channels/:id/messages/:msgId                              (own only, 204)
```

### Response Types

```typescript
User           { id, username, email, avatarUrl, createdAt }
Server         { id, name, iconUrl, inviteCode, ownerId, createdAt }
ServerDetail   { id, name, iconUrl, inviteCode, owner: User,
                 channels: Channel[], members: Member[], createdAt }
Channel        { id, serverId, name, type, position, createdAt }
Member         { id, userId, username, avatarUrl, role, joinedAt }
Message        { id, channelId, content, edited, createdAt, updatedAt, author: User }
```

---

## WebSocket Protocol

**Endpoint:** `http://localhost:8080/ws` (SockJS fallback)

**Auth:** Pass JWT in STOMP `CONNECT` frame header: `Authorization: Bearer <token>`

### Subscribe Destinations

| Destination | Payload | Description |
|---|---|---|
| `/topic/channel/{channelId}` | `ChatMessageEvent` | Real-time message events |
| `/topic/server/{serverId}/presence` | `PresenceEvent` | User online/offline |

### Publish Destinations

| Destination | Body | Description |
|---|---|---|
| `/app/channel/{channelId}/send` | `{ content: string }` | Send a message |
| `/app/presence/heartbeat` | `{}` | Extend presence TTL (every 30s) |

### Event Payloads

```typescript
ChatMessageEvent {
  type: "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MESSAGE_DELETE"
  message: Message
}

PresenceEvent {
  type: "PRESENCE_UPDATE"
  userId: string
  status: "ONLINE" | "OFFLINE"
}
```

---

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker | 20+ | For infrastructure services |
| Java | **17 or 21** | Java 25 not supported (Lombok 1.18.30 incompatibility) |
| Node.js | 20+ | Frontend build |
| Maven | 3.9+ | Backend build (`brew install maven` on macOS) |

### 1. Start Infrastructure

```bash
docker compose up -d
```

Wait for all services to be healthy:

```bash
docker compose ps
# All services should show "healthy" or "running"
```

Verify individual services:

```bash
docker compose logs postgres   # Should show "database system is ready"
docker compose logs kafka      # Should show "started (kafka.server.KafkaServer)"
docker compose logs redis      # Should show "Ready to accept connections"
```

### 2. Run the Backend

```bash
cd backend
mvn spring-boot:run
```

> **Java version note:** If your default `java` is version 25 (common with Homebrew), set the path explicitly:
>
> ```bash
> # macOS (Azul JDK 17)
> export JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/azul-17.0.18/Contents/Home"
> # or Homebrew JDK 21
> export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
> mvn spring-boot:run
> ```

The API is available at **http://localhost:8080/api**

Verify it's running:
```bash
curl http://localhost:8080/api/auth/me
# → 401 (expected — not authenticated)
```

### 3. Run the Frontend

```bash
cd client
npm install
npm run dev
```

The app is available at **http://localhost:5173**

### 4. Create Your First Account

1. Open **http://localhost:5173/register**
2. Enter a username, email, and password (min 8 chars)
3. You'll be redirected to the app automatically
4. Click **+** in the server icon rail to create your first server

---

## Environment Configuration

### Backend (`backend/src/main/resources/application.yml`)

Override any value with environment variables:

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | base64 encoded key | HMAC-SHA256 signing secret |
| `JWT_EXPIRATION_MS` | `86400000` (24h) | Token TTL in milliseconds |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/discord` | PostgreSQL URL |
| `SPRING_DATASOURCE_USERNAME` | `discord` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `discord_secret` | DB password |
| `SPRING_DATA_REDIS_HOST` | `localhost` | Redis host |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker |

### Frontend

Create `client/.env` (optional — defaults work for local dev):

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

---

## Running Tests

### Backend Unit Tests

Tests use JUnit 5 + Mockito. **No Docker required** — services are fully mocked.

```bash
cd backend
mvn test
```

Expected output: **22 tests, 0 failures**

| Test Class | Coverage |
|---|---|
| `AuthServiceTest` | register (success, duplicate email/username), login (success, wrong password, not found) |
| `ServerServiceTest` | create server, join (success, already member), leave (success, owner can't leave) |
| `MessageServiceTest` | send message, edit (own, not own → 403), delete (own, not own → 403) |
| `JwtTokenProviderTest` | generate, validate, extract userId, reject expired/invalid tokens |

### Backend HTTP Tests (IntelliJ HTTP Client)

Open the `.http` files in IntelliJ IDEA (or compatible editor). Run in order:

```
backend/src/test/http/
  01_auth.http       # Register, login, validation errors, /me endpoint
  02_servers.http    # Create, list, detail, update, join, leave, delete
  03_channels.http   # Create, list, permissions, delete
  04_messages.http   # Send, paginate, edit, delete, authorization
```

**Prerequisite:** Backend must be running. Use the `local` environment from `http-client.env.json`.

### Frontend Tests

```bash
cd client
npm run test:run      # Run all tests once
npm test              # Watch mode
npm run test:coverage # Coverage report
```

Expected output: **89 tests, 0 failures across 10 test files**

| Test File | Tests | What's Covered |
|---|---|---|
| `AuthContext.test.tsx` | 5 | login, logout, localStorage persistence, error on missing provider |
| `LoginForm.test.tsx` | 5 | render, loading state, error messages, generic fallback |
| `RegisterForm.test.tsx` | 7 | render, success navigation, field validation errors, server errors |
| `ServerSidebar.test.tsx` | 13 | dialogs (create/join), success toasts, error states, navigation |
| `ChannelSidebar.test.tsx` | 14 | channel list, CRUD, role permissions, user panel, logout |
| `MessageInput.test.tsx` | 8 | send on Enter, Shift+Enter no-send, empty guard, disabled state |
| `MessageItem.test.tsx` | 13 | hover toolbar, edit mode, save/cancel, delete, error toasts |
| `MessageList.test.tsx` | 8 | empty state, pagination, load-more, loading indicator |
| `ChatArea.test.tsx` | 7 | no-channel screen, channel header, hook integration |
| `AppPage.test.tsx` | 9 | routing, server detail load, auto-navigate, member list |

### Linting & Formatting

```bash
cd client
npm run lint           # ESLint (0 warnings allowed)
npm run lint:fix       # Auto-fix
npm run format         # Prettier format
npm run format:check   # Check only
```

---

## Design Decisions

### Why Kafka for messaging?

Messages are saved via the STOMP `ChatController` but broadcast through Kafka. This decouples the write path from the broadcast path. In a multi-instance deployment, all backend instances consume from the same topic, ensuring every connected client receives messages regardless of which instance handled the send.

### Why Redis for presence?

Presence is inherently ephemeral. Redis keys with TTLs (`presence:{userId}`, 35s TTL) are lighter than database rows. If the app restarts, stale presence entries auto-expire rather than showing ghost-online users. The 30s client heartbeat keeps TTLs alive; the 5s buffer handles clock jitter.

### Why JWT over sessions?

Stateless JWTs eliminate the need for session storage and work naturally with WebSocket connections (passed in STOMP headers). The `WebSocketAuthInterceptor` validates the JWT on `CONNECT` so every subsequent message is authenticated without additional round-trips.

### Why cursor-based pagination?

Offset-based pagination (`LIMIT x OFFSET y`) degrades on large tables and produces duplicate/skipped rows when new messages arrive. Cursor-based (`WHERE id < :before ORDER BY created_at DESC LIMIT 50`) is stable and O(log n) with the composite index on `(channel_id, created_at DESC)`.

### Why `ProtectedLayout` with a single `SocketProvider`?

In the original implementation, each route had its own `SocketProvider`, causing a WebSocket disconnect + reconnect on every navigation. Wrapping all `/app/**` routes in a single `ProtectedLayout` that renders `SocketProvider` once means the STOMP connection persists across channel/server switches.

### Why `global: 'globalThis'` in Vite config?

`sockjs-client` references `global` — a Node.js global — at runtime. Vite's bundler doesn't polyfill this in the browser. The `define: { global: 'globalThis' }` config replaces all `global` references with the browser-standard `globalThis` at build time.

### Why `isAxiosError` named import?

Axios's `isAxiosError()` type guard is the only reliable way to narrow `unknown` catch errors to `AxiosError`. Using `import { isAxiosError } from 'axios'` (named import) avoids stale IDE diagnostics that appear when using the default import's method.

### Why Sonner for toasts?

Sonner is the shadcn/ui-recommended toast library — minimal API (`toast.success/error`), no provider boilerplate beyond `<Toaster />`, and it renders outside the React tree so it's unaffected by component unmounts during navigation.

### Frontend test strategy

- **Unit + component tests only** (Vitest + Testing Library) — no Playwright/Cypress
- Mocked `axios`, `useSocket`, `useMessages` at the module level
- `scrollIntoView` and `scrollTo` stubbed globally in `setup.ts` (jsdom doesn't implement them)
- Lucide icon class names follow `lucide-{toKebabCase(ComponentName)}` — `Trash2` → `lucide-trash2` (no hyphen before digits)
- Hover state triggered via `fireEvent.mouseEnter` on the message container (React maps `onMouseEnter` to native `mouseenter`)

---

## Troubleshooting

### Backend won't start

**`Unsupported class file major version XX` (Java version mismatch)**

```bash
java -version   # Must be 17 or 21
# If wrong version:
export JAVA_HOME="/path/to/java17or21"
mvn spring-boot:run
```

**`Connection refused: postgres / redis / kafka`**

```bash
docker compose ps        # Check if containers are running
docker compose up -d     # Start if stopped
docker compose logs -f   # Watch logs for errors
```

**`FlywayException: Validate failed` (migration checksum mismatch)**

```bash
# Option 1: Reset the database (development only)
docker compose down -v   # Removes volumes
docker compose up -d
mvn spring-boot:run      # Flyway re-runs all migrations

# Option 2: Repair checksums
mvn flyway:repair -Dflyway.url=jdbc:postgresql://localhost:5432/discord \
    -Dflyway.user=discord -Dflyway.password=discord_secret
```

**`Lombok annotations not processed`**

Ensure Maven compiler plugin has `annotationProcessorPaths` (already configured in `pom.xml`). If using an IDE, install the Lombok plugin and enable annotation processing in IDE settings.

### Frontend won't start

**`global is not defined` (SockJS error)**

Already fixed with `define: { global: 'globalThis' }` in `vite.config.ts`. If you see this again, check that `vite.config.ts` has the define block.

**`Module not found: sonner`**

```bash
cd client && npm install
```

**TypeScript errors in IDE but `tsc --noEmit` passes**

The IDE may have stale type cache. Restart the TS server:
- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- IntelliJ: File → Invalidate Caches → Restart

### Tests failing

**`scrollIntoView is not a function`**

Ensure `setup.ts` has:
```ts
window.HTMLElement.prototype.scrollIntoView = () => {};
```

**`Tooltip must be used within TooltipProvider`**

Wrap test renders in `<TooltipProvider>` when testing components that use `Tooltip`.

**Hover-dependent tests not triggering state**

Use `fireEvent.mouseEnter(element)` directly on the element that has `onMouseEnter`. React maps `onMouseEnter` to native `mouseenter` events.

**`Unable to fire a "click" event - please provide a DOM element`**

The element wasn't found — check that:
1. The component is in the correct state (e.g., hover is active before checking for action buttons)
2. Lucide icon class names: `Trash2` → `lucide-trash2` (not `lucide-trash-2`)

**`mockRejectedValueOnce` leaking between tests**

Use `vi.resetAllMocks()` instead of `vi.clearAllMocks()` in `beforeEach` — `clearAllMocks` does not clear the mock implementation queue.

### Docker / Infrastructure

**Kafka `ADVERTISED_LISTENERS` warning**

The default config uses `PLAINTEXT://localhost:9092`. Inside Docker containers, this works because the Spring Boot app runs on the host connecting to the exposed port. If running the backend inside Docker, change to `PLAINTEXT://kafka:9092`.

**Port conflicts**

Default ports used:
- `5432` — PostgreSQL
- `6379` — Redis
- `2181` — ZooKeeper
- `9092` — Kafka
- `8080` — Spring Boot
- `5173` — Vite dev server

Change ports in `docker-compose.yml` and update `application.yml`/`.env` accordingly.

**`docker compose down` loses data**

Data is persisted in named volumes (`postgres_data`, `redis_data`). To delete data:
```bash
docker compose down -v   # -v removes volumes
```

#### Todo
[] Add monitoring and alerting setup
[] Add Kubernetes support
