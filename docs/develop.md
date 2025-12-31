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