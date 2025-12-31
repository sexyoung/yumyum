# YumYum 吞吞棋 - 視覺驅動開發計劃

## 開發理念

**UI 優先 + 漸進式增強 + 每步可見**

從靜態棋盤 → 本地互動 → 遊戲邏輯 → 線上對戰，確保每一步都能在畫面上看到明確的進展。

---

## 開發路徑（10 步）

### Step 1: 繪製 3x3 靜態棋盤 ⭐ 簡單
**視覺變化：** 畫面中央出現漂亮的 3x3 格子棋盤，有陰影和 hover 效果

**檔案修改：**
- 新建 `packages/web/src/components/Board.tsx`
- 修改 `packages/web/src/App.tsx`（引入 Board）

**實作內容：**
- 使用 Tailwind grid 繪製 9 個格子
- 每個格子有 hover 效果（滑鼠移上去變色）
- 加上陰影和邊框美化

---

### Step 2: 繪製三種尺寸的棋子 ⭐ 簡單
**視覺變化：** 棋盤下方出現 6 顆棋子展示（紅/藍各 3 顆，小中大尺寸）

**檔案修改：**
- 新建 `packages/web/src/components/Piece.tsx`
- 修改 `packages/web/src/App.tsx`（展示棋子）

**實作內容：**
- 圓形棋子組件（border-radius: 50%）
- 三種尺寸：小 40px、中 60px、大 80px
- 兩種顏色：紅色和藍色
- 加上陰影和漸層效果呈現立體感

---

### Step 3: 實現棋子堆疊效果 ⭐⭐ 中等
**視覺變化：** 棋盤格子可顯示堆疊的棋子（大棋子下隱約可見小棋子邊緣）

**檔案修改：**
- 新建 `packages/web/src/components/Cell.tsx`
- 修改 `packages/web/src/components/Board.tsx`（使用 Cell）

**實作內容：**
- Cell 組件管理單一格子（可容納多個棋子堆疊）
- 使用 z-index 和相對定位實現堆疊視覺
- 被蓋住的棋子只露出邊緣
- 最上層棋子顯示可拖動光標

---

### Step 4: 建立玩家儲備區 UI ⭐ 簡單
**視覺變化：** 棋盤兩側出現玩家儲備區，顯示剩餘棋子和當前回合指示

**檔案修改：**
- 新建 `packages/web/src/components/PlayerReserve.tsx`
- 修改 `packages/web/src/App.tsx`（整合佈局）

**實作內容：**
- 顯示玩家名稱、顏色、剩餘棋子
- 使用 flex 佈局水平排列棋子
- 加上「當前回合」發光指示器
- 完整佈局：左玩家 1 → 中棋盤 → 右玩家 2

---

### Step 5: 實現拖放功能（儲備區→棋盤）⭐⭐ 中等
**視覺變化：** 可拖動儲備區棋子到棋盤，放下後出現在格子中

**檔案修改：**
- 修改 `packages/web/src/components/Piece.tsx`（拖動事件）
- 修改 `packages/web/src/components/Cell.tsx`（接收拖放）
- 修改 `packages/web/src/App.tsx`（狀態管理）

**實作內容：**
- 使用 HTML5 Drag and Drop API
- 儲備區棋子可拖動
- 棋盤格子可接收拖放
- 拖動時半透明棋子跟隨滑鼠
- 放下時淡入動畫

---

### Step 6: 實現棋盤拖放（移動棋子）⭐⭐ 中等
**視覺變化：** 可拖動棋盤上的棋子到其他格子，大棋子可蓋住小棋子

**檔案修改：**
- 修改 `packages/web/src/components/Cell.tsx`（拖動來源+接收）
- 修改 `packages/web/src/App.tsx`（狀態更新）

**實作內容：**
- 棋盤棋子可拖動（只能拖最上層）
- 實現「吃子」視覺：大棋子壓住小棋子
- 移動後原格子顯示下層棋子
- 可放置格子高亮提示

---

### Step 7: 加入遊戲規則驗證 ⭐⭐⭐ 複雜
**視覺變化：** 非法移動紅色閃爍拒絕，合法移動綠色提示

**檔案修改：**
- 新建 `packages/web/src/lib/gameLogic.ts`
- 修改 `packages/web/src/App.tsx`（整合規則）
- 修改 `shared/types/src/index.ts`（補充類型）

**實作內容：**
- 驗證移動合法性：
  - 只能放自己的棋子
  - 只能蓋比自己小的棋子
  - 輪流下棋
- 非法移動顯示錯誤提示
- 回合切換（高亮當前玩家）
- **里程碑：可玩的本地雙人遊戲**

---

### Step 8: 實現勝利判定和遊戲結束 ⭐⭐ 中等
**視覺變化：** 連成三個時連線高亮，彈出勝利動畫

**檔案修改：**
- 修改 `packages/web/src/lib/gameLogic.ts`（勝利判定）
- 新建 `packages/web/src/components/GameOverModal.tsx`
- 修改 `packages/web/src/App.tsx`（整合）

**實作內容：**
- 檢查橫直斜 8 條連線
- 連線高亮動畫（閃爍或發光）
- 勝利彈窗顯示：勝者、時長、再來一局按鈕
- 重置遊戲功能
- **里程碑：完整的單機版遊戲**

---

### Step 9: 整合 WebSocket 實現線上對戰 ⭐⭐⭐ 複雜
**視覺變化：** 看到「對手移動中...」提示，對手棋子自動出現

**檔案修改：**
- 修改 `shared/types/src/index.ts`（擴展 WebSocket 訊息）
- 修改 `packages/web/src/lib/websocket.ts`（遊戲訊息處理）
- 修改 `services/game-service/src/websocket/handler.ts`（處理移動）
- 修改 `packages/web/src/App.tsx`（整合 WebSocket）

**實作內容：**
- 擴展 WebSocket 訊息類型（加入 move）
- 本地移動發送給對手
- 接收對手移動更新棋盤
- 顯示「等待對手...」loading
- 斷線重連提示
- **里程碑：可線上對戰**

---

### Step 10: 建立房間大廳和路由系統 ⭐⭐ 中等
**視覺變化：** 首頁顯示房間列表，點擊創建房間進入遊戲

**檔案修改：**
- 新建 `packages/web/src/pages/Lobby.tsx`（房間大廳）
- 新建 `packages/web/src/pages/Game.tsx`（遊戲頁面）
- 新建 `packages/web/src/pages/Waiting.tsx`（等待對手）
- 修改 `packages/web/src/App.tsx`（路由配置）
- 修改 `packages/web/package.json`（加入 react-router-dom）

**實作內容：**
- 安裝 React Router
- 建立三個頁面路由：/ → /waiting/:roomId → /game/:roomId
- 房間創建、加入、離開功能
- 顯示房間狀態（等待/遊戲中/結束）
- 加入時自動連接 WebSocket
- **里程碑：完整產品流程**

---

## 視覺里程碑時間估計

- **Step 1-2**：看到棋盤和棋子（30 分鐘）
- **Step 3-4**：完整遊戲畫面（1 小時）
- **Step 5-6**：可拖放互動（2 小時）
- **Step 7-8**：可玩單機遊戲（3 小時）
- **Step 9**：可線上對戰（2 小時）
- **Step 10**：完整產品（2 小時）

**總計：約 10-12 小時完成可玩原型**

---

## 關鍵檔案清單

### 必須新建的檔案
```
packages/web/src/components/
  ├── Board.tsx           # 棋盤組件
  ├── Cell.tsx            # 格子組件（處理堆疊和拖放）
  ├── Piece.tsx           # 棋子組件
  ├── PlayerReserve.tsx   # 玩家儲備區
  └── GameOverModal.tsx   # 遊戲結束彈窗

packages/web/src/lib/
  └── gameLogic.ts        # 遊戲規則引擎

packages/web/src/pages/
  ├── Lobby.tsx           # 房間大廳
  ├── Game.tsx            # 遊戲頁面
  └── Waiting.tsx         # 等待頁面
```

### 必須修改的檔案
```
packages/web/src/App.tsx                      # 整合所有組件，後期改為路由
shared/types/src/index.ts                     # 擴展遊戲類型和 WebSocket 訊息
services/game-service/src/websocket/handler.ts # 處理遊戲 WebSocket 訊息
packages/web/src/lib/websocket.ts             # 加入遊戲訊息處理
packages/web/package.json                      # 加入 react-router-dom
```

---

## 技術選型建議

- **拖放**：HTML5 Drag and Drop API（或 @dnd-kit/core）
- **動畫**：Tailwind CSS transition 和 animation
- **狀態管理**：前期 useState，後期考慮 Zustand
- **路由**：React Router v6
- **音效**（可選）：howler.js

---

## 執行策略

**用戶確認：採用「逐步確認」模式**
- 每完成一個 Step 後暫停
- 用戶測試和確認效果
- 確認無誤後再進行下一步
- 可隨時調整方向

## 開發原則

1. **每完成一步立即測試** - 在瀏覽器看效果
2. **頻繁儲存** - 利用 Vite HMR 熱更新
3. **視覺優先** - UI 比邏輯更重要（前期）
4. **本地優先** - 單機版穩定再做線上版
5. **漸進增強** - 每步都是可玩的狀態

---

## 測試建議

- **Step 1-4**：純視覺檢查
- **Step 5-6**：拖放互動測試
- **Step 7-8**：完整對局測試
- **Step 9**：開兩個瀏覽器視窗測試線上對戰
- **Step 10**：完整流程測試（創建→對戰→回大廳）
