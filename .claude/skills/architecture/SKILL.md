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
│       │   ├── pages/          # 頁面組件
│       │   ├── lib/            # API client、WebSocket client
│       │   ├── hooks/          # 自訂 React hooks
│       │   └── types/          # TypeScript 類型
│       ├── vercel.json         # Vercel 配置（含 rewrites）
│       └── package.json
├── services/
│   ├── api-gateway/           # API Gateway（Railway）
│   │   ├── src/
│   │   │   ├── routes/        # API 路由
│   │   │   └── middleware/    # CORS、認證、錯誤處理
│   │   ├── Dockerfile
│   │   └── package.json
│   └── game-service/          # 遊戲服務（Railway）
│       ├── src/
│       │   ├── websocket/     # WebSocket 處理器
│       │   ├── game/          # 遊戲引擎、房間、AI
│       │   ├── redis/         # Redis 操作
│       │   └── db/            # PostgreSQL 操作
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
wss://yumyum.game/ws/game/:roomId      // 正式環境（透過 Vercel proxy）

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

### PostgreSQL Schema（Supabase）

```sql
-- 玩家表
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  avatar_url TEXT,
  elo_rating INT DEFAULT 1200,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  games_lost INT DEFAULT 0,
  games_drawn INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 遊戲記錄表
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(50) UNIQUE NOT NULL,
  player1_id INT REFERENCES players(id),
  player2_id INT REFERENCES players(id),
  winner_id INT REFERENCES players(id),
  game_mode VARCHAR(20) NOT NULL,
  moves JSONB NOT NULL,
  duration_seconds INT,
  status VARCHAR(20) DEFAULT 'finished',
  created_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

-- 成就表
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, achievement_type)
);

-- 排行榜視圖
CREATE VIEW leaderboard AS
SELECT
  p.id,
  p.username,
  p.elo_rating,
  p.games_played,
  p.games_won,
  ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC) as rank
FROM players p
WHERE p.games_played >= 5
ORDER BY p.elo_rating DESC
LIMIT 100;

-- 索引
CREATE INDEX idx_games_player1 ON games(player1_id);
CREATE INDEX idx_games_player2 ON games(player2_id);
CREATE INDEX idx_players_elo ON players(elo_rating DESC);
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

**範例 3：Redis 房間管理器**
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

**範例 4：本地開發用 Docker Compose**
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
