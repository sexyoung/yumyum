---
name: tech-stack
description: 詳述 YumYum 的技術選擇，包含 React+Vite、Hono.js、Vercel、Railway、Supabase 和 Upstash 及其選擇理由。當需要做技術決策、設置基礎設施或配置服務時使用此 skill。
---

# YumYum 技術棧

## 使用說明

使用技術棧時：

1. **前端**：使用 React + TypeScript + Vite，部署到 Vercel（免費）
2. **後端**：使用 Hono.js，部署到 Railway（~$5/月免費額度內）
3. **資料庫**：使用 Supabase PostgreSQL（免費額度）
4. **快取**：使用 Upstash Redis（免費額度，10K commands/天）
5. **DNS**：使用 Cloudflare（.game 域名 $15/年）
6. **API 代理**：使用 Vercel rewrites 避免 CORS 問題

始終優先選擇符合預算限制的方案。

## 技術棧總覽

```yaml
前端: React + TypeScript + Vite → Vercel（免費）
後端: Hono.js → Railway（~$5/月，免費額度內）
資料庫: Supabase PostgreSQL（免費）
快取: Upstash Redis（免費）
域名: Cloudflare（$15/年）

總成本: $0-5/月 + $15/年域名
```

## 前端技術

### React + TypeScript + Vite

- **React**：最流行的前端框架，適合作品集展示
- **TypeScript**：類型安全，減少 bug
- **Vite**：超快的開發體驗，構建速度快

**為什麼不用 Next.js？**
- 太重（不需要 SSR）
- 遊戲是純 SPA，不需要 SEO

### Tailwind CSS

- 快速開發
- 一致的設計系統
- 生產環境自動 tree-shake
- 不需要額外的 CSS 檔案

## 後端技術

### Hono.js

**為什麼選 Hono？**
- 超輕量（比 Express 快 3-4 倍）
- TypeScript 原生支援
- 現代 API 設計
- WebSocket 支援
- 多運行時支援（Node.js、Bun、Deno、Workers）

**為什麼不用 Express/NestJS？**
- Express：較老舊，TypeScript 支援不佳
- NestJS：太重，對小專案來說過度設計
- Hono：現代、輕量、類型安全

## 部署平台

### Vercel（前端）

**為什麼選 Vercel？**
- 全球 CDN（300+ 邊緣節點）
- 台灣玩家 20-50ms 載入 vs Railway 150-250ms
- 完全免費（100 GB 頻寬/月）
- 自動優化（Code splitting、圖片優化、Brotli）
- Git push 自動部署
- 每個 PR 自動建立 Preview 部署

### Railway（後端）

**為什麼選 Railway？**
- Pay-as-you-go 計費（用多少付多少）
- $5 免費額度/月
- 不會休眠（vs Render 免費版 15 分鐘後休眠）
- 完美支援 WebSocket
- 開發體驗極佳

**成本計算：**
```
API Gateway（256MB）：~$1.5/月
Game Service（512MB）：~$3/月
總計：~$4.5/月（在 $5 免費額度內！）✅
```

### Vercel Rewrites（API 代理）

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.yumyum.game/:path*" },
    { "source": "/ws/:path*", "destination": "https://ws.yumyum.game/:path*" }
  ]
}
```

**好處：**
- 同源請求（無 CORS 問題）
- 前端程式碼簡潔（統一使用 /api/xxx）
- 不需管理環境變數
- 支援 WebSocket
- 對使用者透明

## 資料庫

### PostgreSQL（Supabase）

**為什麼選 Supabase？**
- 完全免費（500MB 資料庫，5GB 頻寬/月）
- 內建超棒的 Web Dashboard
- 即時 SQL Editor
- Table Editor（像 Excel）
- JSONB 支援（存遊戲狀態）
- 陣列類型
- 比 MySQL 更適合複雜查詢

**為什麼不用 Railway PostgreSQL？**
- 成本問題：1GB RAM × 24/7 = ~$10/月（超過免費額度）
- Supabase 免費且專業

### Prisma ORM

**為什麼選 Prisma？**
- 類型安全的資料庫 client（TypeScript 原生支援）
- Schema 管理簡潔（declarative schema）
- 自動生成類型定義
- Migration 管理方便
- 優秀的開發體驗（autocomplete、IntelliSense）
- 支援多種資料庫（PostgreSQL、MySQL、SQLite）

**為什麼不用原生 SQL 或其他 ORM？**
- 原生 SQL：沒有類型安全，容易出錯
- TypeORM：配置複雜，decorator 語法不直觀
- Sequelize：效能較差，TypeScript 支援不佳
- Prisma：現代、輕量、類型安全

**Prisma 工作流程：**
```bash
# 1. 定義 schema
prisma/schema.prisma

# 2. 生成 migration
npx prisma migrate dev --name init

# 3. 自動生成 TypeScript client
npx prisma generate

# 4. 在程式碼中使用
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

### Redis（Upstash）

**為什麼選 Upstash？**
- 免費額度慷慨（10,000 commands/天，256MB 儲存）
- Serverless 架構（用多少付多少）
- REST API（Serverless 友善）
- 全球複製（Multi-region）
- 不需維持連線

**使用量估算：**
```
房間管理：~300 commands/天
玩家狀態：~400 commands/天
遊戲操作：~4,000 commands/天
排行榜：~500 commands/天

總計：~5,200/天（52% 使用率）✅
```

## 開發工具

### Docker + Docker Compose

- 一致的本地開發環境
- 模擬正式環境
- 一鍵啟動所有服務

### DBeaver（資料庫 GUI）

- 完全免費
- 支援所有資料庫
- 功能強大（ER 圖、視覺化）
- 跨平台

## 域名與 DNS

### Cloudflare

**為什麼選 Cloudflare？**
- 域名價格：成本價（.game 約 $15/年）
- DNS 管理：免費且超快
- 支援 CNAME Flattening
- 額外功能：免費 CDN、SSL、DDoS 防護

## 環境區隔

### 本地開發
```yaml
前端: localhost:5173（Vite）
後端: localhost:3000（Hono.js）
PostgreSQL: Docker localhost:5432
Redis: Docker localhost:6379
```

### 正式環境
```yaml
前端: yumyum.game（Vercel）
API: api.yumyum.game（Railway）
WebSocket: ws.yumyum.game（Railway）
PostgreSQL: Supabase
Redis: Upstash
```

## 範例

**範例 1：API 配置**
```typescript
// packages/web/src/config/api.ts
const isDev = import.meta.env.DEV;

export const config = {
  apiUrl: isDev ? 'http://localhost:3000' : '/api',
  wsUrl: isDev ? 'ws://localhost:3000' : `wss://${window.location.host}/ws`,
};
```

**範例 2：優化 Upstash 使用量**
```typescript
// 使用 pipeline 減少 command 數量
const pipeline = redis.pipeline();
pipeline.set('key1', val1);
pipeline.set('key2', val2);
pipeline.set('key3', val3);
await pipeline.exec(); // 1 個計費 command 而非 3 個
```

**範例 3：Railway 環境變數**
```yaml
# 使用 Railway 內建變數注入
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 在 Railway dashboard 設定自訂變數
REDIS_URL=<從 Upstash dashboard 複製的 URL>
CORS_ORIGIN=https://yumyum.game,https://*.vercel.app
```
