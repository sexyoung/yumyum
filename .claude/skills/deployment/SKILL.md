---
name: deployment
description: 涵蓋 Vercel（前端）、Railway（後端）、Supabase（資料庫）和 Upstash（Redis）的部署工作流程，包含環境變數、域名設定和監控。當需要部署、配置服務或排除部署問題時使用此 skill。
---

# YumYum 部署

## 使用說明

部署應用程式時：

1. **前端 → Vercel**：連接 GitHub repo，設定 root directory 為 `packages/web`，push 時自動部署
2. **後端 → Railway**：創建兩個服務（api-gateway、game-service），使用 Dockerfiles
3. **資料庫 → Supabase**：創建專案，執行 SQL schema，取得連線字串
4. **Redis → Upstash**：在新加坡區域創建資料庫，取得 REST URL
5. **域名 → Cloudflare**：yumyum.game 指向 Vercel，api/ws 子域名指向 Railway
6. **務必檢查**：環境變數、CORS 設定、SSL 證書

## 部署流程總覽

```yaml
本地開發 → GitHub → 自動部署

前端:
  1. 開發: localhost:5173
  2. Git push → GitHub
  3. Vercel 自動偵測 → 構建 → 部署到全球 CDN
  4. 完成: https://yumyum.game

後端:
  1. 開發: localhost:3000
  2. Git push → GitHub
  3. Railway 自動偵測 → 構建 Docker → 部署
  4. 完成: https://api.yumyum.game
```

## 環境變數

### 本地開發

```bash
# .env.local（前端）
NODE_ENV=development
VITE_API_URL=http://localhost:3000

# .env（後端 - api-gateway）
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yumyum_dev
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173

# .env（後端 - game-service）
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yumyum_dev
REDIS_URL=redis://localhost:6379
```

### Vercel（正式環境）

```yaml
# 不需要設定環境變數！
# 使用 Vercel Rewrites - 前端呼叫 /api/* 和 /ws/*
```

### Railway（正式環境）

```yaml
# Service: api-gateway
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # 自動注入
REDIS_URL=<Upstash Redis URL>
CORS_ORIGIN=https://yumyum.game,https://*.vercel.app

# Service: game-service
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=<Upstash Redis URL>
WS_HEARTBEAT_INTERVAL=30000
```

## Vercel 部署

### GitHub 自動部署設定

```yaml
方法: Vercel Dashboard
  1. 前往 https://vercel.com/dashboard
  2. 點擊 "Add New" → "Project"
  3. 選擇 GitHub repository
  4. Root Directory: packages/web
  5. Framework Preset: Vite（自動偵測）
  6. 點擊 "Deploy"

結果:
  - 每次 push 到 main → 自動部署到正式環境
  - 每個 PR → 自動建立 preview 部署
```

### vercel.json 配置

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.yumyum.game/:path*"
    },
    {
      "source": "/ws/:path*",
      "destination": "https://ws.yumyum.game/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### 自訂域名設定

```yaml
1. Vercel Dashboard:
   Settings → Domains → Add Domain
   輸入: yumyum.game

2. Cloudflare DNS:
   Type: CNAME
   Name: @（或留空）
   Target: cname.vercel-dns.com
   Proxy: DNS only（關閉 Cloudflare Proxy）

3. 等待 DNS 生效（5-30 分鐘）

4. Vercel 自動:
   ✅ 驗證域名
   ✅ 配置 SSL
   ✅ 啟用 HTTPS
```

## Railway 部署

### 創建服務

```yaml
方法: Railway Dashboard

1. 創建新專案:
   https://railway.app/new
   → "Deploy from GitHub repo"
   → 選擇你的 repository

2. 添加 API Gateway 服務:
   → Add Service → GitHub Repo
   → Root Directory: services/api-gateway
   → 自動偵測 Dockerfile

3. 添加 Game Service:
   → Add Service → GitHub Repo
   → Root Directory: services/game-service
   → 自動偵測 Dockerfile

4. 設定環境變數（見上方）

5. 配置自訂域名:
   Settings → Domains → Custom Domain
   - api.yumyum.game（API Gateway）
   - ws.yumyum.game（Game Service）
```

### 自訂域名設定

```yaml
1. Railway Service Settings:
   Networking → Custom Domain
   輸入: api.yumyum.game

2. Railway 顯示 CNAME target

3. Cloudflare DNS:
   Type: CNAME
   Name: api
   Target: xxx.up.railway.app
   Proxy: DNS only

4. 重複設定 ws.yumyum.game

5. Railway 自動:
   ✅ 驗證域名
   ✅ 配置 SSL
   ✅ 啟用 HTTPS/WSS
```

## 資料庫部署

### Supabase 設定

```yaml
1. 創建專案:
   https://supabase.com/dashboard
   → New Project
   → Region: Singapore（離台灣最近）
   → 設定密碼（記住！）

2. 取得連線字串:
   Settings → Database → Connection string
   複製 URI 格式

3. 設定本地環境變數:
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

4. 使用 Prisma 建立資料庫結構:
   # 生成 migration 並套用到資料庫
   npx prisma migrate deploy

   # 或在開發環境
   npx prisma migrate dev

   # 生成 Prisma Client
   npx prisma generate

5. 加到 Railway 環境變數:
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
```

### Upstash Redis 設定

```yaml
1. 創建資料庫:
   https://console.upstash.com/
   → Create Database
   → Name: yumyum-redis
   → Type: Regional
   → Region: ap-southeast-1（Singapore）
   → Eviction: allkeys-lru

2. 取得連線資訊:
   → Details 頁面
   → 複製 Redis URL

3. 加到 Railway:
   REDIS_URL=redis://default:[PASSWORD]@xxx.upstash.io:6379

   或使用 REST API:
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
```

## 監控與日誌

### Vercel Analytics

```yaml
啟用:
  1. Vercel Dashboard → Analytics
  2. Enable Analytics
  3. 自動開始收集數據

可查看:
  - Real User Monitoring (RUM)
  - Web Vitals (LCP, FID, CLS)
  - 頁面載入時間
  - 訪客地理分布
```

### Railway Logs

```yaml
查看日誌:
  Railway Dashboard → Service → Deployments → Logs

CLI 指令:
  # 即時日誌
  railway logs --follow

  # 最近 100 行
  railway logs --tail 100

日誌最佳實踐:
  - 使用結構化日誌（JSON）
  - 加上時間戳記
  - 區分 log level（info, warn, error）
```

## 部署檢查清單

### 部署前

```yaml
□ 所有環境變數已設定
□ .env.example 已更新
□ Dockerfile 已在本地測試
□ vercel.json 已配置
□ 資料庫 schema 已執行
□ Git 已 commit 且 push

□ 本地測試通過:
  □ 前端可以連到後端
  □ WebSocket 連線正常
  □ 所有 API 端點已測試
  □ 資料庫讀寫正常

□ 安全檢查:
  □ 沒有 hardcode 密碼
  □ .env 在 .gitignore
  □ CORS 正確設定
```

### 部署後

```yaml
□ Vercel 部署成功
  □ https://yumyum.game 可訪問
  □ 前端載入正常
  □ API proxy 運作正常

□ Railway 部署成功
  □ https://api.yumyum.game/health 回傳 200
  □ WebSocket 連線正常
  □ 日誌沒有錯誤

□ 域名設定正確
  □ yumyum.game → Vercel
  □ api.yumyum.game → Railway
  □ ws.yumyum.game → Railway
  □ 全部啟用 HTTPS

□ 資料庫連線正常
  □ API 可以讀寫 PostgreSQL
  □ Redis 連線正常

□ 功能測試
  □ 創建房間
  □ 加入房間
  □ 遊戲對戰
  □ 排行榜顯示

□ 效能測試
  □ 首頁載入 < 2 秒
  □ API 回應 < 200ms
  □ WebSocket 延遲 < 100ms
```

## 成本監控

### 每週檢查

```yaml
□ Vercel Usage（應該是 $0）
□ Railway Usage（目標 < $5）
□ Supabase Storage（< 500MB）
□ Upstash Commands（< 10K/天）

如果接近上限:
  □ 優化查詢
  □ 增加快取
  □ 降低服務 RAM
  □ 清理舊資料
```

### 預算提醒

```yaml
Railway:
  → Usage → Set Budget Alert
  → $5 時發 Email

Upstash:
  → Settings → Alerts
  → 80% 用量時通知
```

## 範例

**範例 1：檢查部署狀態**
```bash
# Vercel
vercel ls

# Railway
railway status
```

**範例 2：查看即時日誌**
```bash
# Vercel
vercel logs --follow

# Railway
railway logs --follow
```

**範例 3：回滾部署**
```yaml
# Vercel
Dashboard → Deployments → 選擇穩定版本 → "Promote to Production"

# Railway
Service → Deployments → 選擇穩定版本 → "Redeploy"
```
