---
name: architecture
description: YumYum 的 monorepo 結構、API 設計、資料庫和 WebSocket 協議。當需要規劃程式碼結構、設計 API 或實作資料模型時使用此 skill。
---

# YumYum 架構

## Monorepo 結構

```
yumyum/
├── packages/web/          # 前端（Vercel）
│   ├── src/
│   │   ├── components/    # React 組件
│   │   ├── pages/         # 頁面組件
│   │   ├── lib/           # 遊戲邏輯、AI
│   │   └── hooks/         # 自訂 hooks
│   └── vercel.json        # Vercel 配置
├── services/game-service/ # 後端（Railway）
│   ├── src/
│   │   ├── websocket/     # WebSocket 處理
│   │   ├── game/          # 遊戲引擎
│   │   └── redis/         # Redis 操作
│   └── Dockerfile
├── shared/types/          # 共用 TypeScript 類型
└── docker-compose.yml     # 本地 PostgreSQL + Redis
```

## 架構原則

1. **Monorepo**: 前端 `packages/web`，後端 `services/`
2. **API 設計**: REST 用於 CRUD，WebSocket 用於即時遊戲
3. **Vercel Rewrites**: `/api/*` 和 `/ws/*` 代理到 Railway
4. **類型安全**: `shared/types/` 共用類型定義
5. **Docker**: 本地開發用 docker-compose

## 詳細參考

- **API 設計**: [references/api.md](references/api.md)
- **Prisma ORM**: [references/prisma.md](references/prisma.md)
- **Redis 資料結構**: [references/redis.md](references/redis.md)

## 環境配置

```yaml
本地開發:
  前端: localhost:5173（Vite proxy → localhost:3000）
  後端: localhost:3000（Hono.js + WebSocket）
  DB: Docker host.docker.internal:5432
  Redis: Docker host.docker.internal:6379

正式環境:
  前端: yumyum.game（Vercel）
  後端: api.yumyum.game（Railway）
  DB: Supabase PostgreSQL
  Redis: Upstash
```

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: yumyum_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
```
