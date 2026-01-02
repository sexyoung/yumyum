# GEMINI.md

本文件提供 YumYum 專案的全面概述、其架構以及建置、運行和開發應用程式的說明。

## 專案概述

YumYum 是一款即時、回合制的線上遊戲。該專案是一個 Monorepo，包含三個主要元件：Web 用戶端、API 閘道和遊戲服務。該應用程式使用 PostgreSQL 資料庫進行持久資料儲存，並使用 Redis 進行快取和即時訊息傳遞。

### 架構

該專案遵循微服務架構：

-   **Web 用戶端 (`packages/web`)：** 基於 React 的前端，使用 Vite 建置。它使用 TanStack Query 進行資料擷取，Tailwind CSS 進行樣式設計，並使用 WebSocket 用戶端與遊戲服務通訊。

-   **API 閘道 (`services/api-gateway`)：** 基於 Hono 的服務，作為應用程式 REST API 的主要入口點。它處理來自 Web 用戶端的資料請求，透過 Prisma 與 PostgreSQL 資料庫互動，並使用 Redis 進行快取和統計。

-   **遊戲服務 (`services/game-service`)：** 基於 Hono 的服務，帶有 WebSocket 伺服器。它管理即時遊戲邏輯，包括玩家連線、房間管理和遊戲狀態。

-   **共享類型 (`shared/types`)：** 包含跨不同服務使用的共享 TypeScript 類型，以確保類型安全。

### 技術棧

-   **前端：** React、Vite、TypeScript、TanStack Query、Tailwind CSS
-   **後端：** Hono.js、TypeScript、Node.js
-   **資料庫：** PostgreSQL (使用 Prisma 作為 ORM)
-   **快取/訊息傳遞：** Redis
-   **容器化：** Docker、Docker Compose

## 建置與運行

### 先決條件

-   Node.js (v18 或更高版本)
-   npm (v8 或更高版本)
-   Docker 和 Docker Compose

### 開發

若要在開發模式下運行應用程式，請按照以下步驟操作：

1.  **安裝依賴項：**

    ```bash
    npm install
    ```

2.  **啟動資料庫和 Redis：**

    ```bash
    docker-compose up -d
    ```

3.  **運行資料庫遷移：**

    ```bash
    npx prisma migrate dev
    ```

4.  **同時運行所有服務：**

    ```bash
    npm run dev
    ```

    這將同時啟動 Web 用戶端、API 閘道和遊戲服務。

    -   Web 用戶端：`http://localhost:5173`
    -   API 閘道：`http://localhost:3000`
    -   遊戲服務：`http://localhost:3002`

### 運行單個服務

您也可以單獨運行每個服務：

-   **Web 用戶端：**

    ```bash
    npm run dev:web
    ```

-   **API 閘道：**

    ```bash
    npm run dev:api
    ```

-   **遊戲服務：**

    ```bash
    npm run dev:game
    ```

### 建置生產環境

若要建置所有服務以供生產環境使用，請運行以下命令：

```bash
npm run build
```

建置產物將位於每個服務和套件的 `dist` 目錄中。

## 開發約定

### 程式碼風格

專案使用 Prettier 進行程式碼格式化，使用 ESLint 進行程式碼檢查。請確保您的編輯器中安裝了適當的擴展，以便自動格式化和檢查您的程式碼。

### 測試

TODO: 本專案尚未有測試策略。請添加有關測試框架、如何運行測試以及在哪裡添加新測試的資訊。