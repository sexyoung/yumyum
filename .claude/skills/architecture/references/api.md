# API 設計參考

## Vercel Rewrites 配置

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.yumyum.game/:path*" },
    { "source": "/ws/:path*", "destination": "https://ws.yumyum.game/:path*" }
  ]
}
```

---

## REST API 端點

```yaml
房間管理:
  GET    /api/rooms              # 取得房間列表
  POST   /api/rooms              # 創建房間
  GET    /api/rooms/:id          # 取得房間詳情
  POST   /api/rooms/:id/join     # 加入房間
  DELETE /api/rooms/:id          # 刪除房間

玩家管理:
  GET    /api/players/:id        # 取得玩家資料
  PUT    /api/players/:id        # 更新玩家資料
  POST   /api/players            # 創建玩家

排行榜:
  GET    /api/leaderboard        # 取得排行榜

遊戲記錄:
  GET    /api/games              # 取得遊戲記錄
  GET    /api/games/:id          # 取得單一遊戲詳情

健康檢查:
  GET    /api/health             # 健康檢查
  GET    /api/version            # API 版本
```

---

## WebSocket 協議

```typescript
// 連線 URL
ws://localhost:3000/game/:roomId       // 開發
wss://api.yumyum.game/game/:roomId     // 正式

// 客戶端 → 伺服器
type ClientMessage =
  | { type: 'join'; playerId: string; playerName: string }
  | { type: 'move'; from: Position; to: Position; piece: Piece }
  | { type: 'leave' }
  | { type: 'chat'; message: string }
  | { type: 'emoji'; emoji: string }
  | { type: 'rematch' };

// 伺服器 → 客戶端
type ServerMessage =
  | { type: 'connected'; playerId: string }
  | { type: 'game_state'; state: GameState }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'move_made'; move: Move; newState: GameState }
  | { type: 'game_over'; winner: string; reason: string }
  | { type: 'emoji'; emoji: string; from: PieceColor }
  | { type: 'error'; message: string };
```

---

## 前端 API Client

```typescript
// packages/web/src/lib/api.ts
class ApiClient {
  private baseUrl = '/api'; // Vercel rewrites 處理

  async getRooms(): Promise<Room[]> {
    const response = await fetch(`${this.baseUrl}/rooms`);
    return response.json();
  }

  async createRoom(): Promise<{ roomId: string }> {
    const response = await fetch(`${this.baseUrl}/rooms`, {
      method: 'POST',
    });
    return response.json();
  }
}
```

## WebSocket Client

```typescript
// packages/web/src/lib/websocket.ts
export function getWsUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return apiUrl.replace(/^http/, 'ws');
}

export class GameWebSocket {
  connect(roomId: string) {
    const wsUrl = `${getWsUrl()}/game/${roomId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }
}
```
