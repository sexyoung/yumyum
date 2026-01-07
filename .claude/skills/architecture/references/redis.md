# Redis 資料結構參考

## Key 命名策略

```typescript
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

// Key 格式
`${ENV}:room:${roomId}`              // 房間狀態（TTL: 3600s）
`${ENV}:player:${playerId}:socket`   // Socket 映射（TTL: 600s）
`${ENV}:player:${playerId}:session`  // Session（TTL: 3600s）
`${ENV}:online-players`              // 線上玩家（Set）
`${ENV}:active-rooms`                // 活躍房間（Set）
`${ENV}:leaderboard`                 // 排行榜（Sorted Set）
`${ENV}:game:${roomId}:state`        // 遊戲狀態（TTL: 86400s）
```

---

## 資料結構範例

### 房間狀態（String JSON）

```typescript
// Key: dev:room:room-123
// TTL: 3600s
{
  "id": "room-123",
  "host": "player-456",
  "players": ["player-456", "player-789"],
  "status": "playing",
  "gameMode": "pvp",
  "createdAt": 1703600000000,
  "lastActivity": 1703601000000
}
```

### 排行榜（Sorted Set）

```bash
ZADD dev:leaderboard 1500 player-456
ZADD dev:leaderboard 1450 player-789
ZREVRANGE dev:leaderboard 0 9 WITHSCORES  # 前 10 名
```

---

## 房間管理器

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

  async joinRoom(roomId: string, playerId: string) {
    const key = `${ENV}:room:${roomId}`;
    const data = await this.redis.get(key);
    if (!data) throw new Error('Room not found');

    const room = JSON.parse(data);
    room.players.push(playerId);
    room.lastActivity = Date.now();

    await this.redis.setex(key, 3600, JSON.stringify(room));
    return room;
  }
}
```

---

## Upstash 優化

```typescript
// 使用 pipeline 減少 command 數量
const pipeline = redis.pipeline();
pipeline.set('key1', val1);
pipeline.set('key2', val2);
pipeline.set('key3', val3);
await pipeline.exec(); // 1 個計費 command 而非 3 個
```

## 使用量估算

```
房間管理：~300 commands/天
玩家狀態：~400 commands/天
遊戲操作：~4,000 commands/天
排行榜：~500 commands/天
總計：~5,200/天（Upstash 免費額度 10K/天）
```
