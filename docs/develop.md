# 開發筆記

## 如何在本機啟用服務後，用手機連線？
1. 打開 macOS 設定 > 共享 > 遠端登入 > 打開
2. 查詢你的區網 IP (通常是 192.168.x.x)
3. 在非容器內的 terminal 執行 `ssh -L 192.168.x.x:5173:localhost:5173 -L 192.168.x.x:3000:localhost:3000 -L 192.168.x.x:3002:localhost:3002 localhost -N`
4. 此時本機打開 192.168.x.x 可以看得到，手機打開 192.168.x.x 也可以看得到！

## Supabase 連線設定

### 連線模式選擇

Supabase 提供三種連線模式：

1. **Direct connection** (端口 5432)
   - 適合：長時間運行的應用（VM、容器）
   - 連線數限制：約 60 個並發連線
   - 範例：`postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`

2. **Transaction pooler** (端口 6543) ⭐ **推薦使用**
   - 適合：Serverless functions、Prisma、API Gateway
   - 連線數限制：數千個並發連線
   - 範例：`postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Railway 部署時建議使用此模式**

3. **Session pooler** (端口 6543)
   - 適合：IPv4 網路環境限制時使用
   - 作為 Direct connection 的替代方案

### 開發環境設定

**本地開發：**
- 使用 Direct connection (5432) 或 Transaction pooler (6543) 皆可
- 環境檔案：`.env.staging`

**測站部署 (Railway)：**
- 建議使用 Transaction pooler (6543)
- Prisma 官方推薦，穩定性更高

### 使用 DBeaver 連接 Supabase

1. 從 Supabase Dashboard > Project Settings > Database 取得連線字串
2. 選擇 **Transaction pooler** 模式
3. 在 DBeaver 中使用該連線字串建立連線
4. 測試連線成功後即可管理資料庫

### 環境檔案說明

- `.env` - 本地開發（Docker PostgreSQL）
- `.env.staging` - 測站環境（Supabase staging）
- `.env.production` - 正式環境（未來建立）

### ⚠️ 重要發現：Supabase 連線字串配置

**DATABASE_URL 和 DIRECT_URL 必須使用相同的格式！**

#### 正確配置（實測成功）：

```bash
# Transaction pooler (6543) - 用於應用程式運行
DATABASE_URL="postgresql://postgres.{project_ref}:{password}@aws-x-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session pooler (5432) - 用於 migrations
DIRECT_URL="postgresql://postgres.{project_ref}:{password}@aws-x-region.pooler.supabase.com:5432/postgres"
```

**關鍵點：**
1. ✅ 兩者使用**相同的 domain**：`aws-x-region.pooler.supabase.com`
2. ✅ 兩者使用**相同的 username 格式**：`postgres.{project_ref}`
3. ✅ 只有**端口不同**：6543 vs 5432
4. ✅ DATABASE_URL 需要加 `?pgbouncer=true` 參數

#### ❌ 錯誤配置（無法連接）：

```bash
# 嘗試使用 Direct database connection - 從 devcontainer 無法連接
DIRECT_URL="postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres"
```

這個是真正的 Direct database connection，但可能受網路限制或防火牆阻擋。

#### 執行 Prisma Migration：

```bash
# 方法 1：使用環境變數（推薦）
export DATABASE_URL="postgresql://postgres.{project_ref}:{password}@aws-x-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.{project_ref}:{password}@aws-x-region.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy

# 方法 2：使用 .env 檔案
# 確保 .env 包含 DATABASE_URL 和 DIRECT_URL
npx prisma migrate deploy
```

#### Prisma Schema 配置：

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Transaction pooler (6543)
  directUrl = env("DIRECT_URL")         // Session pooler (5432)
}
```

## Upstash Redis 設定

### 創建 Redis 資料庫

1. **註冊帳號**
   - 前往 https://console.upstash.com/
   - 使用 GitHub 或 Email 註冊

2. **創建資料庫**
   - 點擊 "Create Database"
   - 填寫設定：
     - Name: `yumyum-redis-staging`（測站）
     - Type: Regional
     - Region: **ap-southeast-1 (Singapore)**（離台灣最近）
     - Eviction: ✅ **啟用**（建議開啟，避免容量滿時無法寫入）

3. **取得連線字串**
   - 進入資料庫 Details 頁面
   - 複製 **Redis URL**（格式：`rediss://default:xxx@xxx.upstash.io:6379`）
   - 注意：使用 `rediss://`（雙 s）表示 TLS/SSL 加密連線

### 環境變數設定

將取得的 Redis URL 加入環境檔案：

```bash
# .env.staging
REDIS_URL="rediss://default:AR-xxx@amazing-duck-8085.upstash.io:6379"
```

### 測試連線

啟動開發服務後，應該會看到：

```bash
✅ Redis connected
🚀 Redis ready
```

測試 API endpoint：

```bash
curl http://localhost:3000/api/stats
# 回應：{"totalVisits":1,"onlinePlayers":0,"activeRooms":0,"timestamp":"..."}
```

每次呼叫 `totalVisits` 會自動遞增，表示 Redis 讀寫正常。

### ioredis 客戶端

專案使用 `ioredis` 作為 Redis 客戶端，支援：
- ✅ 自動處理 `rediss://` TLS/SSL 連線
- ✅ 連線重試機制（最多 3 次）
- ✅ Singleton pattern 避免重複連線
- ✅ 連線事件監聽（connect, error, ready）

配置檔案位於：`services/api-gateway/src/lib/redis.ts`

## Railway 部署

### 部署流程

1. **建立專案**
   - 前往 https://railway.app/
   - Deploy from GitHub repo
   - 選擇你的 repository

2. **新增服務**
   - Add Service → GitHub Repo
   - 分別新增 api-gateway 和 game-service

3. **設定每個服務**
   - Settings → Service → Root Directory: 清空（使用 repo 根目錄）
   - Settings → Build → Builder: **Dockerfile**
   - Settings → Build → Dockerfile Path:
     - api-gateway: `services/api-gateway/Dockerfile`
     - game-service: `services/game-service/Dockerfile`
   - Settings → Deploy → Custom Start Command: **清空**（使用 Dockerfile 的 CMD）
   - Settings → Deploy → Healthcheck Path: `/health`
   - Settings → Deploy → Regions: **asia-southeast1** (Singapore)

4. **設定環境變數**
   - 在 Variables 頁籤加入：
     ```bash
     NODE_ENV=production
     PORT=3000  # api-gateway 用 3000，game-service 用 3002
     DATABASE_URL=<Supabase Transaction pooler URL>
     DIRECT_URL=<Supabase Session pooler URL>
     REDIS_URL=<Upstash Redis URL>
     CORS_ORIGIN=https://你的前端域名  # api-gateway 專用
     WS_HEARTBEAT_INTERVAL=30000  # game-service 專用
     ```

5. **觸發部署**
   - Push 到 GitHub 會自動部署
   - 或手動點擊 Deploy 按鈕

### 部署時遇到的問題與解決方案

#### 問題 1：Dockerfile 找不到 shared/types

**錯誤訊息：**
```
ERROR: failed to compute cache key: "/shared/types/package.json": not found
```

**原因：**
- 當 Root Directory 設為 `services/api-gateway` 時
- Railway 只能看到該資料夾內的檔案
- 無法訪問上層的 `shared/types/`

**解決方案：**
- Root Directory **清空**（讓 Railway 從 repo 根目錄開始）
- 設定 Dockerfile Path 為完整路徑：`services/api-gateway/Dockerfile`

#### 問題 2：npm workspaces node_modules 複製失敗

**錯誤訊息：**
```
ERROR: "/app/shared/types/node_modules": not found
```

**原因：**
- npm workspaces 執行 `npm ci` 時，所有依賴都安裝在 root 的 `node_modules`
- 各個 workspace 的 `node_modules` 可能不存在或只是符號連結
- Dockerfile 試圖複製不存在的資料夾

**解決方案：**
```dockerfile
# ❌ 錯誤：試圖複製各個 workspace 的 node_modules
COPY --from=deps /app/services/api-gateway/node_modules ./services/api-gateway/node_modules
COPY --from=deps /app/shared/types/node_modules ./shared/types/node_modules

# ✅ 正確：只複製 root node_modules（包含所有依賴）
COPY --from=deps /app/node_modules ./node_modules
```

#### 問題 3：TypeScript 型別不匹配

**錯誤訊息：**
```
error TS2322: Type 'string' is not assignable to type 'number'.
```

**原因：**
- `Player` 介面的 `id` 是 `number`（來自資料庫）
- WebSocket 訊息的 `playerId` 是 `string`
- 型別不匹配導致編譯失敗

**解決方案：**
新增 `ConnectedPlayer` 介面（簡化版，id 為 string）：
```typescript
// shared/types/src/index.ts
export interface ConnectedPlayer {
  id: string;
  username: string;
}

export type ServerMessage =
  | { type: 'player_joined'; player: ConnectedPlayer }  // 使用 ConnectedPlayer
  // ...
```

#### 問題 4：ES Module import 路徑錯誤

**錯誤訊息（Runtime）：**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/dist/lib/prisma'
imported from /app/dist/index.js
```

**原因：**
- Node.js ES modules 要求明確的檔案副檔名
- TypeScript 編譯後不會自動加上 `.js`
- Runtime 找不到模組

**解決方案：**
在源碼中使用 `.js` 副檔名（雖然源檔案是 `.ts`）：
```typescript
// ❌ 錯誤
import { prisma } from './lib/prisma';

// ✅ 正確
import { prisma } from './lib/prisma.js';
```

TypeScript 編譯器會自動找到對應的 `.ts` 檔案進行型別檢查。

### 常見設定錯誤

#### ❌ 錯誤 1：使用 Railpack builder
如果選擇 Railpack (Default)，Railway 可能無法正確處理 monorepo 結構。
**解決：選擇 Dockerfile builder**

#### ❌ 錯誤 2：保留 Custom Start Command
如果設定了 `npm run start --workspace=@yumyum/api-gateway`，會因為 production image 沒有 workspace 結構而失敗。
**解決：清空 Custom Start Command，使用 Dockerfile 的 CMD**

#### ❌ 錯誤 3：選擇 US 區域
選擇美國區域會導致台灣用戶延遲較高（150-200ms）。
**解決：選擇 asia-southeast1 (Singapore) 區域**

### 部署成功檢查清單

部署完成後，檢查以下項目：

- [ ] Build Logs 沒有錯誤
- [ ] 服務狀態為 "Active"（綠色）
- [ ] 可以訪問 `/health` endpoint
- [ ] 健康檢查回傳正確資料：
  ```json
  // api-gateway
  {
    "status": "ok",
    "service": "api-gateway",
    "redis": "connected"
  }

  // game-service
  {
    "status": "ok",
    "service": "game-service",
    "timestamp": "..."
  }
  ```
- [ ] Runtime Logs 沒有錯誤訊息
- [ ] Redis 連線成功（api-gateway）
- [ ] Database 連線成功

### 服務 URL

部署成功後，Railway 會提供預設域名：
- api-gateway: `https://yumyumapi-gateway-production.up.railway.app`
- game-service: `https://yumyumgame-service-production.up.railway.app`

測試健康檢查：
```bash
curl https://yumyumapi-gateway-production.up.railway.app/health
curl https://yumyumgame-service-production.up.railway.app/health
```