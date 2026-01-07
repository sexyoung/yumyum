---
name: architecture
description: 定義 YumYum 的 monorepo 結構、API 設計、資料庫 schema、Redis 資料結構和 WebSocket 協議。當需要規劃程式碼結構、設計 API 或實作資料模型時使用此 skill。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# YumYum 架構

## 使用說明

進行架構相關工作時：

1. **遵循 Monorepo 結構**：前端在 `packages/web`，後端服務在 `services/`
2. **API 設計**：CRUD 操作用 REST，即時遊戲更新用 WebSocket
3. **使用 Vercel Rewrites**：前端呼叫 `/api/*` 和 `/ws/*`，代理到 Railway
4. **資料庫**：PostgreSQL 存持久化資料，Redis 存臨時狀態
5. **類型安全**：透過 `shared/types/` 共用類型定義
6. **Docker**：使用 docker-compose.yml 在本地跑 PostgreSQL 和 Redis

## Monorepo 結構

```
yumyum/
├── packages/
│   └── web/                    # 前端（Vercel）
│       ├── src/
│       │   ├── components/     # React 組件
│       │   │   ├── Board.tsx          # 3x3 棋盤
│       │   │   ├── Cell.tsx           # 單一格子（支援放置提示）
│       │   │   ├── Piece.tsx          # 棋子（支援拖曳）
│       │   │   ├── PlayerReserve.tsx  # 玩家儲備區
│       │   │   └── GameDndContext.tsx # 拖曳上下文（DragOverlay）
│       │   ├── pages/          # 頁面組件
│       │   │   ├── LocalGame.tsx      # 本機雙人
│       │   │   ├── AIGame.tsx         # AI 對戰
│       │   │   └── OnlineGame.tsx     # 線上對戰
│       │   ├── lib/            # 遊戲邏輯、AI、儲存
│       │   │   ├── gameLogic.ts       # 遊戲規則引擎
│       │   │   ├── ai.ts              # AI 演算法
│       │   │   └── storage.ts         # localStorage 管理
│       │   ├── hooks/          # 自訂 React hooks
│       │   └── types/          # TypeScript 類型
│       ├── vercel.json         # Vercel 配置（含 rewrites）
│       └── package.json
├── services/
│   └── game-service/          # 後端服務（Railway）- 整合 API + WebSocket
│       ├── src/
│       │   ├── websocket/     # WebSocket 處理器
│       │   ├── game/          # 遊戲引擎、房間管理
│       │   ├── redis/         # Redis 操作
│       │   └── lib/           # Prisma client 等共用模組
│       ├── Dockerfile
│       └── package.json
├── shared/
│   └── types/                 # 共用 TypeScript 類型
├── .claude/
│   └── skills/                # Claude Code skills
├── docker-compose.yml         # 本地 PostgreSQL + Redis
└── package.json               # Root package.json
```

## API 設計

### Vercel Rewrites 配置

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.yumyum.game/:path*"
    },
    {
      "source": "/ws/:path*",
      "destination": "https://ws.yumyum.game/:path*"
    }
  ]
}
```

### REST API 端點

```yaml
房間管理:
  GET    /api/rooms              # 取得房間列表
  POST   /api/rooms              # 創建房間
  GET    /api/rooms/:id          # 取得房間詳情
  POST   /api/rooms/:id/join     # 加入房間
  DELETE /api/rooms/:id          # 刪除房間
  POST   /api/rooms/:id/leave    # 離開房間

玩家管理:
  GET    /api/players/:id        # 取得玩家資料
  PUT    /api/players/:id        # 更新玩家資料
  POST   /api/players            # 創建玩家

排行榜:
  GET    /api/leaderboard        # 取得排行榜

遊戲記錄:
  GET    /api/games              # 取得遊戲記錄列表
  GET    /api/games/:id          # 取得單一遊戲詳情

健康檢查:
  GET    /api/health             # 健康檢查
  GET    /api/version            # API 版本
```

### WebSocket 協議

```typescript
// WebSocket 連線
ws://localhost:3000/game/:roomId       // 開發環境
ws://localhost:3000/chat/:roomId       // 開發環境（聊天室）
wss://api.yumyum.game/game/:roomId     // 正式環境

// 客戶端 → 伺服器
type ClientMessage =
  | { type: 'join'; playerId: string; playerName: string }
  | { type: 'move'; from: Position; to: Position; piece: Piece }
  | { type: 'leave' }
  | { type: 'chat'; message: string }
  | { type: 'rematch' };

// 伺服器 → 客戶端
type ServerMessage =
  | { type: 'connected'; playerId: string }
  | { type: 'game_state'; state: GameState }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'move_made'; move: Move; newState: GameState }
  | { type: 'game_over'; winner: string; reason: string }
  | { type: 'error'; message: string }
  | { type: 'chat'; playerId: string; message: string };
```

## 資料庫設計

### Prisma Schema

使用 Prisma ORM 來管理資料庫結構和操作。Prisma schema 位於 `prisma/schema.prisma`。

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Player {
  id           Int      @id @default(autoincrement())
  username     String   @unique @db.VarChar(50)
  email        String?  @db.VarChar(100)
  avatarUrl    String?  @map("avatar_url")
  eloRating    Int      @default(1200) @map("elo_rating")
  gamesPlayed  Int      @default(0) @map("games_played")
  gamesWon     Int      @default(0) @map("games_won")
  gamesLost    Int      @default(0) @map("games_lost")
  gamesDrawn   Int      @default(0) @map("games_drawn")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  gamesAsPlayer1 Game[]        @relation("Player1Games")
  gamesAsPlayer2 Game[]        @relation("Player2Games")
  wonGames       Game[]        @relation("WinnerGames")
  achievements   Achievement[]

  @@index([eloRating(sort: Desc)], name: "idx_players_elo")
  @@map("players")
}

model Game {
  id              Int       @id @default(autoincrement())
  roomId          String    @unique @map("room_id") @db.VarChar(50)
  player1Id       Int?      @map("player1_id")
  player2Id       Int?      @map("player2_id")
  winnerId        Int?      @map("winner_id")
  gameMode        String    @map("game_mode") @db.VarChar(20)
  moves           Json      // JSONB in PostgreSQL
  durationSeconds Int?      @map("duration_seconds")
  status          String    @default("finished") @db.VarChar(20)
  createdAt       DateTime  @default(now()) @map("created_at")
  finishedAt      DateTime? @map("finished_at")

  // Relations
  player1 Player? @relation("Player1Games", fields: [player1Id], references: [id])
  player2 Player? @relation("Player2Games", fields: [player2Id], references: [id])
  winner  Player? @relation("WinnerGames", fields: [winnerId], references: [id])

  @@index([player1Id], name: "idx_games_player1")
  @@index([player2Id], name: "idx_games_player2")
  @@map("games")
}

model Achievement {
  id              Int      @id @default(autoincrement())
  playerId        Int      @map("player_id")
  achievementType String   @map("achievement_type") @db.VarChar(50)
  unlockedAt      DateTime @default(now()) @map("unlocked_at")

  // Relations
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@unique([playerId, achievementType])
  @@map("achievements")
}
```

**Prisma 常用指令：**
```bash
# 生成 migration（根據 schema 變更）
npx prisma migrate dev --name <migration_name>

# 套用 migration 到資料庫
npx prisma migrate deploy

# 生成 Prisma Client（TypeScript types）
npx prisma generate

# 開啟 Prisma Studio（資料庫 GUI）
npx prisma studio

# 同步 schema 到資料庫（開發用，會清空資料）
npx prisma db push

# 從現有資料庫生成 schema
npx prisma db pull
```

## Redis 資料結構

### Key 命名策略

```typescript
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

// Key 格式
`${ENV}:room:${roomId}`              // 房間狀態（String JSON，TTL: 3600s）
`${ENV}:player:${playerId}:socket`   // 玩家 Socket 映射（String，TTL: 600s）
`${ENV}:player:${playerId}:session`  // 玩家 Session（String JSON，TTL: 3600s）
`${ENV}:online-players`              // 線上玩家（Set）
`${ENV}:active-rooms`                // 活躍房間（Set）
`${ENV}:leaderboard`                 // 排行榜（Sorted Set，score = ELO）
`${ENV}:game:${roomId}:state`        // 遊戲狀態快照（String JSON，TTL: 86400s）
```

### 資料結構範例

```typescript
// 房間狀態（String with JSON）
// Key: dev:room:room-123，TTL: 3600s
{
  "id": "room-123",
  "host": "player-456",
  "players": ["player-456", "player-789"],
  "status": "playing",
  "gameMode": "pvp",
  "createdAt": 1703600000000,
  "lastActivity": 1703601000000
}

// 排行榜（Sorted Set）
// Key: dev:leaderboard，Score = ELO rating
ZADD dev:leaderboard 1500 player-456
ZADD dev:leaderboard 1450 player-789
```

## 範例

**範例 1：前端 API Client**
```typescript
// packages/web/src/lib/api.ts
import { config } from '@/config/api';

class ApiClient {
  private baseUrl = config.apiUrl; // 正式環境是 '/api'

  async getRooms(): Promise<Room[]> {
    const response = await fetch(`${this.baseUrl}/rooms`);
    return response.json();
  }
}
```

**範例 2：WebSocket Client**
```typescript
// packages/web/src/lib/websocket.ts
export class GameWebSocket {
  connect(roomId: string) {
    const wsUrl = `${config.wsUrl}/game/${roomId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }
}
```

**範例 3：Prisma Client 使用**
```typescript
// services/game-service/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Singleton pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 使用範例：創建玩家
export async function createPlayer(username: string, email?: string) {
  return await prisma.player.create({
    data: {
      username,
      email,
    },
  });
}

// 使用範例：查詢排行榜（前 10 名）
export async function getLeaderboard() {
  return await prisma.player.findMany({
    where: {
      gamesPlayed: { gte: 5 },
    },
    orderBy: {
      eloRating: 'desc',
    },
    take: 10,
    select: {
      id: true,
      username: true,
      eloRating: true,
      gamesPlayed: true,
      gamesWon: true,
    },
  });
}

// 使用範例：記錄遊戲結果
export async function recordGame(data: {
  roomId: string;
  player1Id: number;
  player2Id: number;
  winnerId?: number;
  moves: any[];
  durationSeconds: number;
}) {
  return await prisma.game.create({
    data: {
      roomId: data.roomId,
      player1Id: data.player1Id,
      player2Id: data.player2Id,
      winnerId: data.winnerId,
      gameMode: 'pvp',
      moves: data.moves,
      durationSeconds: data.durationSeconds,
      status: 'finished',
      finishedAt: new Date(),
    },
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });
}
```

**範例 4：Redis 房間管理器**
```typescript
// services/game-service/src/redis/rooms.ts
export class RoomManager {
  async createRoom(roomId: string, hostId: string) {
    const room = {
      id: roomId,
      host: hostId,
      players: [hostId],
      status: 'waiting',
      createdAt: Date.now(),
    };

    const key = `${ENV}:room:${roomId}`;
    await this.redis.setex(key, 3600, JSON.stringify(room));
    await this.redis.sadd(`${ENV}:active-rooms`, roomId);

    return room;
  }
}
```

**範例 5：本地開發用 Docker Compose**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: yumyum_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```
