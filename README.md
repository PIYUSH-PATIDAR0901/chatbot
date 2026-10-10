# 💬 Chat Backend (Node.js + TypeScript + MySQL + Firebase Firestore)

A production-grade Chat Backend system built with **Node.js**, **TypeScript (Strict mode)**, **MySQL**, and **Firebase Firestore**.

This service implements a hybrid storage architecture:
- **MySQL (Relational Database)**: Stores Users, Chats, and Chat Memberships with relational integrity, foreign keys, and indexes.
- **Firebase Firestore (NoSQL Document Store)**: Stores real-time Messages, Read Receipts, and Last Seen tracking with chronological ordering and high-throughput subcollections.

---

## 🛠 Tech Stack

- **Runtime & Language**: Node.js (v24.x) + TypeScript (strict typing)
- **Framework**: Express.js
- **Relational Database**: MySQL 8.0 (via `mysql2/promise`)
- **Real-Time / Message Store**: Firebase Firestore (via `firebase-admin`)
- **Validation**: Zod
- **Testing**: Jest + Supertest (18/18 passing automated tests)
- **Development Tooling**: `tsx` (zero-overhead TypeScript hot-reloading)

---

## 📜 Commands Run During Project Setup

As requested, here is the complete chronological sequence of commands executed to scaffold, configure, build, and verify this project:

```bash
# 1. Check Node.js and npm versions
node -v
npm -v

# 2. Initialize project package.json
npm init -y

# 3. Install core production dependencies
npm install express cors dotenv mysql2 firebase-admin zod morgan uuid

# 4. Install dev dependencies (TypeScript, testing frameworks, and type declarations)
npm install -D typescript @types/node @types/express @types/cors @types/morgan @types/uuid tsx jest ts-jest @types/jest supertest @types/supertest rimraf

# 5. Lock stable TypeScript compiler for ts-jest compatibility
npm install -D typescript@^5.7.3

# 6. Compile TypeScript codebase to JavaScript (/dist directory)
npm run build

# 7. Run automated test suite (18 unit & integration tests)
npm test
```

---

## 📁 Project Directory Structure

```text
nodetest/
├── .env.example                     # Sample environment variables
├── .gitignore                       # Git ignore list
├── docker-compose.yml               # Local MySQL & Firestore Emulator containers
├── jest.config.js                   # Jest test configuration
├── package.json                     # Project manifest and scripts
├── tsconfig.json                    # Strict TypeScript configuration
├── README.md                        # Documentation and API guide
└── src/
    ├── app.ts                       # Express app setup and middleware routing
    ├── index.ts                     # Application entry point & server bootstrapper
    ├── config/
    │   └── index.ts                 # Type-safe configuration loader
    ├── db/
    │   ├── connection.ts            # MySQL connection pool & transaction manager
    │   └── initDb.ts                # Auto-migration / table schema initializer
    ├── firebase/
    │   └── index.ts                 # Firebase Admin & Firestore initialization
    ├── models/
    │   └── ...                      # Model definitions
    ├── types/
    │   └── index.ts                 # Strict TypeScript interfaces and DTOs
    ├── repositories/
    │   ├── chatRepository.ts        # MySQL chat & membership queries
    │   ├── userRepository.ts        # MySQL user queries
    │   ├── messageRepository.interface.ts # Interface for message operations
    │   ├── firestoreMessageRepository.ts  # Firestore collections implementation
    │   ├── inMemoryMessageRepository.ts   # In-memory store for isolated unit tests
    │   └── messageRepository.ts     # Repository factory & dependency injector
    ├── services/
    │   ├── chatService.ts           # Chat business logic & access validation
    │   └── messageService.ts        # Message, read receipt & last seen service
    ├── controllers/
    │   ├── chatController.ts        # Chat endpoints HTTP handlers
    │   ├── messageController.ts     # Message endpoints HTTP handlers
    │   └── userController.ts        # User helper HTTP handlers
    ├── routes/
    │   ├── chatRoutes.ts            # /chat routes
    │   └── userRoutes.ts            # /user routes
    ├── middlewares/
    │   └── errorHandler.ts          # Centralized error & validation handler
    ├── utils/
    │   └── params.ts                # Safe route params parser
    ├── scripts/
    │   └── seed.ts                  # Seeds demo users (Alice, Bob, Charlie, Dave)
    └── tests/
        └── chat.test.ts             # 18 automated unit and integration tests
```

---

## 🗄️ Database Architecture & Schemas

### 1. MySQL (Relational Schema)

#### `users` table
Stores registered user identities:
```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `chats` table
Stores 1:1 and group chat rooms:
```sql
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR(36) PRIMARY KEY,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  name VARCHAR(100) NULL,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chats_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

#### `chat_members` table
Relates users to chats (many-to-many):
```sql
CREATE TABLE IF NOT EXISTS chat_members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chat_member (chat_id, user_id),
  INDEX idx_chat_members_chat (chat_id),
  INDEX idx_chat_members_user (user_id),
  CONSTRAINT fk_members_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. Firebase Firestore Data Model

#### Collection: `chats/{chatId}/messages/{messageId}`
```json
{
  "id": "c1f7a0b5-78e2-45e3-9844-486121f1d198",
  "chatId": "4a737f10-ffb4-41d3-a55d-b2a3d0f73f55",
  "senderId": "user_alice",
  "text": "Hello Bob! How are you doing?",
  "timestamp": "2026-10-10T05:30:00.000Z",
  "readBy": {
    "user_alice": "2026-10-10T05:30:00.000Z",
    "user_bob": "2026-10-10T05:30:15.000Z"
  },
  "isEdited": false,
  "isDeleted": false,
  "updatedAt": null
}
```

#### Subcollection: `chats/{chatId}/last_seen/{userId}`
Tracks the latest message seen by each participant in the chat:
```json
{
  "chatId": "4a737f10-ffb4-41d3-a55d-b2a3d0f73f55",
  "userId": "user_bob",
  "messageId": "c1f7a0b5-78e2-45e3-9844-486121f1d198",
  "updatedAt": "2026-10-10T05:30:15.000Z"
}
```

---

## 🚀 Step-by-Step Setup & Execution Guide

### Step 1: Clone and Configure Environment

Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```

Customize `.env` with your settings:
```env
PORT=4000
NODE_ENV=development

# MySQL Database credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=chat_db

# Firebase Options (Choose ONE):
# Option A: Local Firestore Emulator (default in .env.example)
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_PROJECT_ID=chat-backend-dev

# Option B: Live Firebase Service Account Key JSON
# FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
```

---

### Step 2: Start MySQL (and optional Firestore Emulator)

You can run MySQL locally or use the provided `docker-compose.yml`:

```bash
# Start MySQL 8.0 (and Firestore Emulator) in the background
docker compose up -d
```

---

### Step 3: Initialize Database Schema

Run the database setup script to create database `chat_db` and all tables with foreign keys and indexes:

```bash
npm run db:init
```

---

### Step 4: Seed Demo Users

Populate sample users (`user_alice`, `user_bob`, `user_charlie`, `user_dave`) for instant testing:

```bash
npm run db:seed
```

---

### Step 5: Start the Server

#### Development Mode (with hot-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm run build
npm start
```

The server will be running at: **`http://localhost:4000`**

---

### Step 6: Run Automated Tests

To run the automated test suite verifying all 6 required APIs, edge cases, error handling, and bonus features:

```bash
npm test
```

---

## 📡 API Reference & Example Requests

### 1. Create or Get Chat (1:1 Chat)
Checks if a 1:1 chat between two users already exists. If it exists, returns the existing `chatId`. If not, creates a new chat in MySQL.

- **Method**: `POST`
- **URL**: `/chat/create`
- **Request Body**:
```json
{
  "userAId": "user_alice",
  "userBId": "user_bob"
}
```
- **Response (`201 Created` or `200 OK`)**:
```json
{
  "chatId": "e0b82f64-d4b9-44e2-b941-866ab8755609",
  "isNew": true,
  "members": [
    { "id": "user_alice", "name": "Alice Johnson", "email": "alice@example.com" },
    { "id": "user_bob", "name": "Bob Smith", "email": "bob@example.com" }
  ]
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:4000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"userAId":"user_alice","userBId":"user_bob"}'
```

---

### 2. Send Message
Sends a message to the specified chat and stores it in Firestore with timestamp. Automatically marks the message as read by the sender.

- **Method**: `POST`
- **URL**: `/chat/:chatId/message/send`
- **Request Body**:
```json
{
  "senderId": "user_alice",
  "text": "Hello Bob! Are we meeting today?"
}
```
- **Response (`201 Created`)**:
```json
{
  "id": "6732f94a-8fa5-455b-b997-7c050fb3f9cc",
  "chatId": "e0b82f64-d4b9-44e2-b941-866ab8755609",
  "senderId": "user_alice",
  "text": "Hello Bob! Are we meeting today?",
  "timestamp": "2026-10-10T05:35:00.123Z",
  "readBy": {
    "user_alice": "2026-10-10T05:35:00.123Z"
  },
  "isEdited": false,
  "isDeleted": false
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:4000/chat/e0b82f64-d4b9-44e2-b941-866ab8755609/message/send \
  -H "Content-Type: application/json" \
  -d '{"senderId":"user_alice","text":"Hello Bob! Are we meeting today?"}'
```

---

### 3. Get Messages
Retrieves messages for a chat from Firestore, ordered by timestamp ascending.

- **Method**: `GET`
- **URL**: `/chat/:chatId/messages?limit=50`
- **Response (`200 OK`)**:
```json
{
  "chatId": "e0b82f64-d4b9-44e2-b941-866ab8755609",
  "count": 2,
  "limit": 50,
  "messages": [
    {
      "id": "6732f94a-8fa5-455b-b997-7c050fb3f9cc",
      "chatId": "e0b82f64-d4b9-44e2-b941-866ab8755609",
      "senderId": "user_alice",
      "text": "Hello Bob! Are we meeting today?",
      "timestamp": "2026-10-10T05:35:00.123Z",
      "readBy": {
        "user_alice": "2026-10-10T05:35:00.123Z"
      }
    },
    {
      "id": "7823f11b-9cb6-411a-a887-8d123fb4e8dd",
      "chatId": "e0b82f64-d4b9-44e2-b941-866ab8755609",
      "senderId": "user_bob",
      "text": "Yes Alice, see you at 3 PM!",
      "timestamp": "2026-10-10T05:36:10.456Z",
      "readBy": {
        "user_bob": "2026-10-10T05:36:10.456Z"
      }
    }
  ]
}
```

**cURL Example**:
```bash
curl -X GET "http://localhost:4000/chat/e0b82f64-d4b9-44e2-b941-866ab8755609/messages?limit=50"
```

---

### 4. Mark Message Read
Updates the read receipt for a message in Firestore with user ID and timestamp.

- **Method**: `POST`
- **URL**: `/chat/:chatId/message/:messageId/read`
- **Request Body**:
```json
{
  "userId": "user_bob"
}
```
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "messageId": "6732f94a-8fa5-455b-b997-7c050fb3f9cc",
  "userId": "user_bob",
  "readAt": "2026-10-10T05:36:00.000Z"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:4000/chat/e0b82f64-d4b9-44e2-b941-866ab8755609/message/6732f94a-8fa5-455b-b997-7c050fb3f9cc/read \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_bob"}'
```

---

### 5. Update Last Seen Message
Updates the last seen message pointer for a specific user in Firestore.

- **Method**: `POST`
- **URL**: `/chat/:chatId/lastseen`
- **Request Body**:
```json
{
  "userId": "user_bob",
  "messageId": "6732f94a-8fa5-455b-b997-7c050fb3f9cc"
}
```
- **Response (`200 OK`)**:
```json
{
  "chatId": "e0b82f64-d4b9-44e2-b941-866ab8755609",
  "userId": "user_bob",
  "messageId": "6732f94a-8fa5-455b-b997-7c050fb3f9cc",
  "updatedAt": "2026-10-10T05:36:05.100Z"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:4000/chat/e0b82f64-d4b9-44e2-b941-866ab8755609/lastseen \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_bob","messageId":"6732f94a-8fa5-455b-b997-7c050fb3f9cc"}'
```

- **Get Last Seen for User**:
```bash
curl -X GET http://localhost:4000/chat/e0b82f64-d4b9-44e2-b941-866ab8755609/lastseen/user_bob
```

---

### 6. List User Chats
Fetches all direct and group chats for a user with member details from MySQL.

- **Method**: `GET`
- **URL**: `/user/:userId/chats`
- **Response (`200 OK`)**:
```json
{
  "userId": "user_alice",
  "count": 1,
  "chats": [
    {
      "id": "e0b82f64-d4b9-44e2-b941-866ab8755609",
      "isGroup": false,
      "name": null,
      "createdBy": null,
      "createdAt": "2026-10-10T05:30:00.000Z",
      "updatedAt": "2026-10-10T05:30:00.000Z",
      "members": [
        {
          "id": "user_alice",
          "name": "Alice Johnson",
          "email": "alice@example.com"
        },
        {
          "id": "user_bob",
          "name": "Bob Smith",
          "email": "bob@example.com"
        }
      ]
    }
  ]
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:4000/user/user_alice/chats
```

---

## 🌟 Bonus Features

### 1. Group Chat Creation & Management
- **Create Group Chat**: `POST /chat/group/create`
  ```bash
  curl -X POST http://localhost:4000/chat/group/create \
    -H "Content-Type: application/json" \
    -d '{"name":"Backend Team","creatorId":"user_alice","memberIds":["user_bob","user_charlie"]}'
  ```
- **Add Members**: `POST /chat/:chatId/members`
  ```bash
  curl -X POST http://localhost:4000/chat/:chatId/members \
    -H "Content-Type: application/json" \
    -d '{"userIds":["user_dave"]}'
  ```
- **Remove Member**: `DELETE /chat/:chatId/members/:userId`
  ```bash
  curl -X DELETE http://localhost:4000/chat/:chatId/members/user_bob
  ```

### 2. Message Editing & Deletion
- **Edit Message**: `PATCH /chat/:chatId/message/:messageId`
  ```bash
  curl -X PATCH http://localhost:4000/chat/:chatId/message/:messageId \
    -H "Content-Type: application/json" \
    -d '{"senderId":"user_alice","text":"Corrected text content"}'
  ```
- **Delete Message (Soft Delete)**: `DELETE /chat/:chatId/message/:messageId`
  ```bash
  curl -X DELETE http://localhost:4000/chat/:chatId/message/:messageId \
    -H "Content-Type: application/json" \
    -d '{"senderId":"user_alice"}'
  ```

---

## 🛡️ Error Handling & Validations

The API provides standardized JSON errors with descriptive status codes:
- **`400 Bad Request`**: Validation errors (via Zod), missing fields, self-chat attempts.
- **`403 Forbidden`**: Non-member trying to send messages, read receipts, or modify chat content.
- **`404 Not Found`**: Non-existent user, chat, or message.
- **`409 Conflict`**: Duplicate user email or conflicting state.
- **`500 Internal Server Error`**: Unexpected database or server errors.
