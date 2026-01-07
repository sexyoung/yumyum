# Prisma ORM 參考

## Schema 定義

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
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  gamesAsPlayer1 Game[] @relation("Player1Games")
  gamesAsPlayer2 Game[] @relation("Player2Games")
  wonGames       Game[] @relation("WinnerGames")

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
  moves           Json
  durationSeconds Int?      @map("duration_seconds")
  status          String    @default("finished") @db.VarChar(20)
  createdAt       DateTime  @default(now()) @map("created_at")
  finishedAt      DateTime? @map("finished_at")

  player1 Player? @relation("Player1Games", fields: [player1Id], references: [id])
  player2 Player? @relation("Player2Games", fields: [player2Id], references: [id])
  winner  Player? @relation("WinnerGames", fields: [winnerId], references: [id])

  @@map("games")
}
```

---

## Prisma Client 使用

```typescript
// services/game-service/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 常用操作範例

### 創建玩家

```typescript
export async function createPlayer(username: string, email?: string) {
  return await prisma.player.create({
    data: { username, email },
  });
}
```

### 查詢排行榜

```typescript
export async function getLeaderboard() {
  return await prisma.player.findMany({
    where: { gamesPlayed: { gte: 5 } },
    orderBy: { eloRating: 'desc' },
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
```

### 記錄遊戲結果

```typescript
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

---

## 常用指令

```bash
npx prisma migrate dev --name <name>  # 生成 migration
npx prisma migrate deploy             # 套用 migration
npx prisma generate                   # 生成 Client
npx prisma studio                     # 開啟 GUI
npx prisma db push                    # 同步 schema（開發用）
```
