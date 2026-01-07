# YumYum 吞吞棋 - 開發計劃（功能優先版）

## 開發理念

**功能優先 + 手機優先 + 規則驗證優先**

開發階段先不考慮畫面美觀，只專注於遊戲規則實現和功能完整性。以手機介面為主，桌機為輔。

---

## 產品需求

### 首頁選項
使用者進入首頁後有三個選項：
1. **單人遊戲** - 對戰電腦
2. **本機雙人** - 兩個玩家輪流在同一裝置上下棋
3. **線上雙人** - 透過網路與其他玩家對戰

### 裝置支援
- **主要目標**：手機介面（螢幕小，使用觸控）
- **次要目標**：桌機介面（螢幕大，可用滑鼠）
- **互動方式**：點擊選擇（不使用拖放，手機友善）

### 開發階段原則
- ✅ 遊戲規則正確運作
- ✅ 功能完整可玩
- ❌ 暫不追求視覺美觀（陰影、漸層、動畫等）
- ❌ 暫不追求精緻排版

### 重新整理處理策略

**問題：** 用戶在 `/local`、`/ai`、`/online` 重新整理時，遊戲狀態會丟失

**解決方案：** 使用 localStorage 保存狀態（不使用 URL query）

| 遊戲模式 | 重新整理行為 | localStorage 儲存內容 |
|---------|-------------|---------------------|
| 本機雙人 `/local` | 自動恢復遊戲狀態 | 遊戲狀態 (GameState) |
| 單人 AI `/ai` | 恢復遊戲狀態 + AI 難度 | 遊戲狀態 + 難度選擇 |
| 線上雙人 `/online` | 自動重連到房間 | 房間 ID + 玩家 ID + 顏色 |

**為什麼不用 URL query？**
- ❌ 用戶可能手動修改 URL 參數
- ❌ URL 會變得很長很醜（遊戲狀態複雜）
- ❌ 安全性問題（playerId 暴露在 URL）
- ✅ localStorage 更安全，用戶無法輕易篡改
- ✅ URL 保持簡潔美觀

---

## 開發路徑（10 步）

### Step 1: 建立首頁和路由系統 ⭐ 簡單
**視覺變化：** 首頁顯示三個大按鈕（對戰電腦、本機雙人、線上雙人）

**檔案修改：**
- 新建 `packages/web/src/pages/Home.tsx`（首頁）
- 新建 `packages/web/src/pages/LocalGame.tsx`（本機雙人頁面）
- 新建 `packages/web/src/pages/AIGame.tsx`（單人 AI 頁面）
- 新建 `packages/web/src/pages/OnlineGame.tsx`（線上雙人頁面）
- 新建 `packages/web/src/lib/storage.ts`（localStorage 管理）
- 修改 `packages/web/src/App.tsx`（設定路由）
- 修改 `packages/web/package.json`（安裝 react-router-dom）

**實作內容：**
- 安裝 React Router v6
- 建立路由：
  - `/` - 首頁
  - `/local` - 本機雙人
  - `/ai` - 單人 AI
  - `/online` - 線上雙人
- 首頁三個按鈕，點擊跳轉對應頁面
- 使用簡單樣式，功能優先

**重要設計決策：狀態管理策略**
- ✅ 使用 `localStorage` 保存遊戲狀態（不使用 URL query）
- ✅ 防止用戶透過修改 URL 作弊
- ✅ 支援頁面重新整理後自動恢復

**localStorage 鍵值設計：**
```typescript
// 本機雙人遊戲狀態
'yumyum:local:gameState' → GameState

// AI 遊戲狀態 + 難度
'yumyum:ai:gameState' → GameState
'yumyum:ai:difficulty' → 'easy' | 'medium' | 'hard'

// 線上遊戲房間資訊
'yumyum:online:roomId' → string
'yumyum:online:playerId' → string
'yumyum:online:playerColor' → 'red' | 'blue'
```

---

### Step 2: 繪製基礎棋盤和棋子（簡化版）⭐ 簡單
**視覺變化：** 遊戲頁面顯示 3x3 棋盤和玩家棋子儲備區（純功能，無美化）

**檔案修改：**
- 新建 `packages/web/src/components/Board.tsx`
- 新建 `packages/web/src/components/Cell.tsx`
- 新建 `packages/web/src/components/Piece.tsx`
- 新建 `packages/web/src/components/PlayerReserve.tsx`
- 修改 `packages/web/src/pages/LocalGame.tsx`（整合組件）

**實作內容：**
- 棋盤：3x3 grid，格子用邊框區分即可
- 棋子：圓形，兩種顏色（紅/藍），三種尺寸（小/中/大）
- 儲備區：顯示玩家剩餘棋子（每種尺寸各幾個）
- 手機佈局：
  - 上方：玩家 1 儲備區
  - 中間：棋盤
  - 下方：玩家 2 儲備區
- 桌機佈局：
  - 左：玩家 1、中：棋盤、右：玩家 2
- 使用純色、簡單邊框，不做陰影、漸層

---

### Step 3: 實作點擊選擇機制（手機友善）⭐⭐ 中等
**視覺變化：** 可以點擊棋子選中（顯示邊框），再點擊目標位置放置

**檔案修改：**
- 修改 `packages/web/src/components/Piece.tsx`（點擊事件）
- 修改 `packages/web/src/components/Cell.tsx`（點擊事件）
- 新建 `packages/web/src/hooks/useGameInput.ts`（輸入邏輯）
- 修改 `packages/web/src/pages/LocalGame.tsx`（狀態管理）

**實作內容：**
- **互動流程**：
  1. 點擊儲備區棋子 → 棋子被選中（顯示高亮邊框）
  2. 點擊棋盤格子 → 棋子放置到該格子
  3. 點擊棋盤上的棋子 → 選中該棋子
  4. 點擊另一個格子 → 移動棋子
- **視覺回饋**：
  - 選中的棋子：粗邊框
  - 可放置的格子：淺色背景提示
- **支援桌機和手機**：
  - 使用 onClick 事件（觸控和滑鼠都支援）
  - 不使用 drag and drop（手機體驗差）

---

### Step 4: 實作遊戲規則引擎 + 測試 ⭐⭐⭐ 複雜
**視覺變化：** 非法移動會顯示錯誤訊息，合法移動才會執行

**檔案修改：**
- 新建 `packages/web/src/lib/gameLogic.ts`
- 新建 `packages/web/src/lib/gameLogic.test.ts` ⭐ 測試
- 新建 `shared/types/src/game.ts`（遊戲狀態類型）
- 修改 `shared/types/src/index.ts`（匯出遊戲類型）
- 修改 `packages/web/src/pages/LocalGame.tsx`（整合規則驗證）
- 新建 `packages/web/vitest.config.ts`（首次設定）

**實作內容：**
- **類型定義**：
  ```typescript
  type PieceSize = 'small' | 'medium' | 'large';
  type PieceColor = 'red' | 'blue';
  type Position = { row: number; col: number };

  interface Piece {
    color: PieceColor;
    size: PieceSize;
  }

  interface Cell {
    pieces: Piece[];  // 堆疊的棋子（由下到上）
  }

  interface GameState {
    board: Cell[][];  // 3x3
    reserves: {
      red: { small: number; medium: number; large: number };
      blue: { small: number; medium: number; large: number };
    };
    currentPlayer: PieceColor;
    winner: PieceColor | null;
  }
  ```

- **規則驗證**：
  1. **輪流下棋**：只有當前玩家可以下棋
  2. **吃子規則**：只能用大棋子蓋小棋子
     - small < medium < large
     - 同尺寸不能覆蓋
  3. **移動限制**：只能移動最上層的棋子
  4. **勝利條件**：橫/直/斜任一方向連成三個同色（看最上層棋子）

- **錯誤處理**：
  - 非法移動顯示錯誤訊息（文字提示即可）
  - 阻止非法操作執行

- **單元測試（Vitest）** ⭐ 重要：
  ```typescript
  // gameLogic.test.ts
  describe('遊戲規則引擎', () => {
    describe('移動驗證', () => {
      it('應該允許紅方在空格放置棋子', () => {
        // 測試從儲備區放置到空格
      });

      it('應該允許大棋子覆蓋小棋子', () => {
        // 測試吃子規則：large > medium > small
      });

      it('應該拒絕同尺寸棋子覆蓋', () => {
        // 測試 medium 不能覆蓋 medium
      });

      it('應該拒絕小棋子覆蓋大棋子', () => {
        // 測試 small 不能覆蓋 large
      });

      it('應該拒絕非當前玩家下棋', () => {
        // 測試輪流機制
      });
    });

    describe('勝利判定', () => {
      it('應該偵測橫向連線', () => {
        // 測試 row 0, 1, 2 連線
      });

      it('應該偵測直向連線', () => {
        // 測試 col 0, 1, 2 連線
      });

      it('應該偵測斜向連線', () => {
        // 測試兩條對角線
      });

      it('應該只看最上層棋子顏色', () => {
        // 測試堆疊情況下的勝利判定
      });
    });
  });
  ```

- **測試驅動開發（TDD）流程**：
  1. 先寫測試（Red）
  2. 實作功能讓測試通過（Green）
  3. 重構優化（Refactor）
  4. 重複上述步驟

- **執行測試**：
  ```bash
  cd packages/web
  npm run test              # 執行所有測試
  npm run test:watch        # 監聽模式
  npm run test:coverage     # 生成覆蓋率報告
  ```

---

### Step 5: 完成本機雙人模式 ⭐⭐ 中等
**視覺變化：** 可以完整玩一局本機雙人遊戲，顯示勝利訊息

**檔案修改：**
- 修改 `packages/web/src/lib/gameLogic.ts`（勝利判定）
- 修改 `packages/web/src/lib/storage.ts`（狀態保存/讀取）
- 修改 `packages/web/src/pages/LocalGame.tsx`（遊戲流程）

**實作內容：**
- **勝利判定**：
  - 檢查 8 條線（3 橫 + 3 直 + 2 斜）
  - 只看每個格子最上層的棋子顏色
  - 連成三個同色即獲勝

- **遊戲流程**：
  1. 初始化遊戲狀態
  2. 輪流下棋（紅 → 藍 → 紅...）
  3. 每次移動後檢查勝利條件
  4. 遊戲結束顯示勝利訊息
  5. 提供「重新開始」按鈕

- **UI 元素**：
  - 顯示當前回合（文字：「紅方回合」）
  - 勝利時顯示訊息（文字：「紅方獲勝！」）
  - 簡單彈窗或文字提示即可

- **狀態持久化（重要！）**：
  ```typescript
  // 頁面載入時
  useEffect(() => {
    const saved = loadLocalGameState();
    if (saved) {
      setGameState(saved);
      showMessage('已恢復上次遊戲進度');
    }
  }, []);

  // 每次移動後
  useEffect(() => {
    saveLocalGameState(gameState);
  }, [gameState]);

  // 重新開始時
  const handleRestart = () => {
    clearLocalGameState();
    setGameState(initialState);
  };
  ```

- **重新整理行為**：
  - 用戶在 `/local` 重新整理 → 自動恢復遊戲狀態
  - 如果沒有保存的狀態 → 顯示空棋盤，準備開始新遊戲
  - 遊戲結束後點「重新開始」→ 清除 localStorage

- **里程碑：可玩的本機雙人遊戲** ✅

---

### Step 6: 實作 AI 對手 + 測試 ⭐⭐⭐ 複雜
**視覺變化：** 單人模式可選擇 AI 難度，AI 會自動下棋

**檔案修改：**
- 新建 `packages/web/src/lib/ai.ts`
- 新建 `packages/web/src/lib/ai.test.ts` ⭐ 測試
- 修改 `packages/web/src/lib/storage.ts`（AI 狀態保存）
- 修改 `packages/web/src/pages/AIGame.tsx`（整合 AI）

**實作內容：**
- **AI 難度選擇流程**：
  1. 進入 `/ai` 頁面
  2. 檢查 localStorage 是否有保存的遊戲
  3. 如果有 → 顯示「繼續遊戲」和「新遊戲」按鈕
  4. 如果沒有 → 顯示三個難度按鈕：簡單、中等、困難
  5. 選擇難度後開始遊戲

- **簡單 AI**（隨機 + 基本策略）：
  1. 優先檢查能否獲勝（一步棋贏）
  2. 優先阻擋對手獲勝（一步棋輸）
  3. 其他情況隨機選擇合法移動

- **中等 AI**（Minimax 3 層）：
  - 使用 Minimax 算法搜尋 3 步
  - 評估函數：
    - 獲勝：+1000
    - 失敗：-1000
    - 連二：+10
    - 阻擋對手連二：+5

- **困難 AI**（Alpha-Beta 5 層）：
  - 使用 Alpha-Beta 剪枝
  - 搜尋深度 5 層
  - 更複雜的評估函數

- **AI 互動**：
  - 玩家下棋後，AI 思考 0.5-1 秒（模擬思考）
  - AI 下棋時顯示「AI 思考中...」
  - AI 下完後輪到玩家

- **狀態持久化**：
  ```typescript
  // 保存遊戲狀態 + AI 難度
  saveAIGameState(gameState, difficulty);

  // 頁面載入時恢復
  useEffect(() => {
    const saved = loadAIGameState();
    if (saved) {
      setGameState(saved.gameState);
      setDifficulty(saved.difficulty);
      setShowDifficultySelect(false);
    }
  }, []);
  ```

- **重新整理行為**：
  - 用戶在 `/ai` 重新整理 → 恢復遊戲狀態和 AI 難度
  - 如果輪到 AI 回合 → 自動繼續 AI 思考
  - 新遊戲時 → 清除舊狀態，重新選擇難度

- **單元測試（Vitest）** ⭐ 重要：
  ```typescript
  // ai.test.ts
  describe('AI 對手', () => {
    describe('簡單 AI', () => {
      it('應該優先選擇獲勝移動', () => {
        // 給定一個可以一步獲勝的棋盤
        // AI 應該選擇那步棋
      });

      it('應該優先阻擋對手獲勝', () => {
        // 給定對手即將獲勝的棋盤
        // AI 應該阻擋
      });

      it('不應該下出非法移動', () => {
        // 測試所有 AI 難度都不會違反規則
      });
    });

    describe('Minimax AI', () => {
      it('應該能正確評估棋盤狀態', () => {
        // 測試評估函數
      });

      it('應該在簡單棋局中找到最佳解', () => {
        // 給定已知最佳解的棋局
        // Minimax 應該找到相同解
      });
    });

    describe('Alpha-Beta AI', () => {
      it('應該與 Minimax 產生相同結果', () => {
        // Alpha-Beta 剪枝不應影響結果
      });

      it('應該減少搜尋節點數量', () => {
        // 驗證剪枝效率
      });
    });
  });
  ```

- **測試覆蓋目標**：
  - 每個 AI 難度都要測試
  - 確保不會下出非法移動
  - 驗證 AI 邏輯正確性

- **里程碑：可玩的單人 AI 遊戲** ✅

---

### Step 7: 實作線上雙人對戰 ⭐⭐⭐ 複雜
**視覺變化：** 可建立房間、加入房間、與線上對手即時對戰

**檔案修改：**
- 新建 `packages/web/src/pages/OnlineLobby.tsx`（房間大廳）
- 修改 `packages/web/src/pages/OnlineGame.tsx`（線上遊戲）
- 修改 `packages/web/src/lib/storage.ts`（房間資訊保存）
- 修改 `shared/types/src/index.ts`（WebSocket 訊息）
- 修改 `packages/web/src/lib/websocket.ts`（遊戲訊息 + 重連）
- 修改 `services/game-service/src/websocket/handler.ts`（後端處理）
- 修改 `services/game-service/src/game/`（新建遊戲邏輯）

**實作內容：**

**前端流程**：
1. 進入 `/online` → 檢查是否有保存的房間資訊
2. 如果有 → 顯示「重新連接到房間 XXX」按鈕
3. 如果沒有 → 顯示房間大廳（創建/加入房間）
4. 點擊「創建房間」→ 產生房間 ID，等待對手
5. 點擊「加入房間」→ 輸入房間 ID 加入
6. 雙方就緒 → 開始遊戲
7. 遊戲結束 → 清除房間資訊，回到大廳

**WebSocket 訊息擴展**：
```typescript
type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; roomId: string }
  | { type: 'rejoin_room'; roomId: string; playerId: string }  // 重連專用
  | { type: 'make_move'; move: Move }
  | { type: 'leave_room' };

type ServerMessage =
  | { type: 'room_created'; roomId: string; playerId: string }
  | { type: 'room_joined'; roomId: string; playerId: string; color: PieceColor }
  | { type: 'game_start'; gameState: GameState }
  | { type: 'move_made'; gameState: GameState }
  | { type: 'game_over'; winner: PieceColor }
  | { type: 'reconnected'; gameState: GameState }  // 重連成功
  | { type: 'opponent_left' }
  | { type: 'error'; message: string };
```

**後端實作**：
- 房間管理（Redis 存儲，30 分鐘 TTL）
- 遊戲狀態同步
- 移動驗證（後端也要驗證，防作弊）
- 玩家斷線處理（保留 5 分鐘）
- 重連機制（驗證 playerId）

**自動重連機制（關鍵！）**：
```typescript
// 保存房間資訊到 localStorage
const saveRoomInfo = (roomId: string, playerId: string, color: PieceColor) => {
  localStorage.setItem('yumyum:online:roomId', roomId);
  localStorage.setItem('yumyum:online:playerId', playerId);
  localStorage.setItem('yumyum:online:playerColor', color);
};

// 頁面載入時檢查
useEffect(() => {
  const roomId = localStorage.getItem('yumyum:online:roomId');
  const playerId = localStorage.getItem('yumyum:online:playerId');

  if (roomId && playerId) {
    // 顯示重連選項
    setShowReconnectOption(true);
  }
}, []);

// 自動重連（用戶點擊後）
const handleReconnect = async () => {
  const roomId = localStorage.getItem('yumyum:online:roomId');
  const playerId = localStorage.getItem('yumyum:online:playerId');

  // 重新建立 WebSocket 連接
  ws.connect(roomId);
  ws.send({ type: 'rejoin_room', roomId, playerId });
};

// WebSocket 斷線處理
ws.onDisconnect(() => {
  showMessage('連線中斷，嘗試重新連接...');
  setTimeout(() => {
    handleReconnect();
  }, 2000);
});
```

**重新整理行為**：
- 用戶在遊戲中重新整理 → 自動重連到原房間
- WebSocket 自動重新連接
- 從伺服器獲取最新遊戲狀態
- 對手不會察覺（無縫重連）
- 如果房間已關閉 → 顯示錯誤訊息，返回大廳

**UI 元素**：
- 房間大廳：顯示房間 ID、玩家數量
- 重連按鈕：「重新連接到房間 XXX」
- 等待頁面：顯示「等待對手加入...」
- 遊戲中：顯示「對手回合」或「你的回合」
- 重連中：「正在重新連接...」
- 斷線提示：「對手已離開」

**遊戲結束清理**：
```typescript
const handleGameEnd = () => {
  // 清除 localStorage
  localStorage.removeItem('yumyum:online:roomId');
  localStorage.removeItem('yumyum:online:playerId');
  localStorage.removeItem('yumyum:online:playerColor');

  // 離開 WebSocket 房間
  ws.send({ type: 'leave_room' });
  ws.disconnect();

  // 返回大廳
  navigate('/online');
};
```

- **里程碑：可玩的線上雙人遊戲** ✅

---

### Step 8: 手機/桌機響應式佈局 ⭐⭐ 中等
**視覺變化：** 手機和桌機都有合適的佈局，不會跑版

**檔案修改：**
- 修改所有頁面組件（調整 Tailwind 斷點）
- 新建 `packages/web/src/hooks/useMediaQuery.ts`

**實作內容：**

**手機佈局（< 768px）**：
- 垂直排列：上儲備區 → 棋盤 → 下儲備區
- 棋盤佔滿寬度（考慮左右 padding）
- 棋子稍大，方便觸控（最小 44x44px）
- 按鈕要大，間距要足

**桌機佈局（>= 768px）**：
- 水平排列：左儲備區 → 棋盤 → 右儲備區
- 棋盤置中顯示
- 可以使用較小的棋子

**Tailwind 斷點**：
```tsx
<div className="flex flex-col md:flex-row">
  {/* 手機垂直，桌機水平 */}
</div>
```

**觸控優化**：
- 增大可點擊區域
- 避免雙擊縮放（viewport meta）
- 適當的 touch feedback

---

### Step 9: 遊戲歷史記錄 ⭐⭐ 中等
**視覺變化：** 遊戲結束後可查看步數記錄，可回放

**檔案修改：**
- 新建 `packages/web/src/components/MoveHistory.tsx`
- 修改 `packages/web/src/lib/gameLogic.ts`（記錄移動）
- 修改遊戲頁面（顯示歷史記錄）

**實作內容：**
- 記錄每一步移動（時間戳、玩家、移動詳情）
- 顯示移動列表（文字描述即可）
- 點擊任意步驟可跳到該狀態查看
- 自動播放功能（選做）

---

### Step 10: UI 美化和動畫效果 ⭐⭐ 中等
**視覺變化：** 加入美觀的樣式、動畫、音效

**檔案修改：**
- 修改所有組件（加入視覺效果）
- 新建 `packages/web/src/lib/sounds.ts`（音效）

**實作內容：**
- **視覺美化**：
  - 棋子漸層、陰影效果
  - 棋盤格子陰影、邊框美化
  - 按鈕 hover 效果
  - 配色調整（黑白灰主題）

- **動畫效果**：
  - 棋子放下時彈跳動畫
  - 吃子時縮放動畫
  - 勝利連線閃爍效果
  - 頁面切換過場動畫

- **音效**（可選）：
  - 落子音效
  - 吃子音效
  - 勝利音效
  - 非法移動提示音

---

### Step 11: E2E 測試（Playwright）⭐⭐ 選做
**視覺變化：** 自動化瀏覽器測試，模擬真實玩家操作

**檔案修改：**
- 新建 `tests/e2e/local-game.spec.ts`
- 新建 `tests/e2e/ai-game.spec.ts`
- 新建 `tests/e2e/online-game.spec.ts`
- 新建 `playwright.config.ts`（Playwright 設定）

**實作內容：**

**安裝 Playwright：**
```bash
npm init playwright@latest
```

**測試案例：**

1. **本機雙人完整流程** (`local-game.spec.ts`)
   ```typescript
   test('應該能完成一局本機雙人遊戲', async ({ page }) => {
     await page.goto('http://localhost:5173/local');

     // 紅方下棋
     await page.click('[data-testid="reserve-red-small"]');
     await page.click('[data-testid="cell-0-0"]');

     // 藍方下棋
     await page.click('[data-testid="reserve-blue-small"]');
     await page.click('[data-testid="cell-0-1"]');

     // ... 繼續下棋直到獲勝

     // 驗證勝利訊息
     await expect(page.locator('text=紅方獲勝')).toBeVisible();
   });

   test('應該能在重新整理後恢復遊戲', async ({ page }) => {
     // 下幾步棋
     // 重新整理頁面
     await page.reload();
     // 驗證遊戲狀態保留
   });
   ```

2. **AI 對戰流程** (`ai-game.spec.ts`)
   ```typescript
   test('應該能選擇 AI 難度並對戰', async ({ page }) => {
     await page.goto('http://localhost:5173/ai');

     // 選擇簡單難度
     await page.click('text=簡單');

     // 玩家下棋
     await page.click('[data-testid="reserve-red-medium"]');
     await page.click('[data-testid="cell-1-1"]');

     // 等待 AI 回應（最多 2 秒）
     await page.waitForTimeout(2000);

     // 驗證 AI 已下棋（棋盤應該有藍色棋子）
     await expect(page.locator('[data-testid="cell-blue"]')).toHaveCount(1);
   });
   ```

3. **線上雙人流程** (`online-game.spec.ts`)
   ```typescript
   test('應該能創建房間並等待對手', async ({ page }) => {
     await page.goto('http://localhost:5173/online');

     await page.click('text=創建房間');

     // 驗證顯示房間 ID
     const roomId = await page.locator('[data-testid="room-id"]').textContent();
     expect(roomId).toBeTruthy();

     // 驗證等待訊息
     await expect(page.locator('text=等待對手加入')).toBeVisible();
   });

   test('應該能雙人對戰', async ({ browser }) => {
     // 開兩個頁面模擬雙人
     const context1 = await browser.newContext();
     const context2 = await browser.newContext();

     const player1 = await context1.newPage();
     const player2 = await context2.newPage();

     // Player 1 創建房間
     await player1.goto('http://localhost:5173/online');
     await player1.click('text=創建房間');
     const roomId = await player1.locator('[data-testid="room-id"]').textContent();

     // Player 2 加入房間
     await player2.goto('http://localhost:5173/online');
     await player2.click('text=加入房間');
     await player2.fill('input[name="roomId"]', roomId);
     await player2.click('text=加入');

     // 驗證雙方都進入遊戲
     await expect(player1.locator('text=遊戲開始')).toBeVisible();
     await expect(player2.locator('text=遊戲開始')).toBeVisible();

     // 模擬對局...
   });
   ```

4. **手機模擬測試**
   ```typescript
   test.use({
     viewport: { width: 375, height: 667 },  // iPhone SE
     isMobile: true,
     hasTouch: true
   });

   test('手機版應該能正常遊玩', async ({ page }) => {
     await page.goto('http://localhost:5173/local');

     // 驗證手機佈局（垂直排列）
     const reserve = await page.locator('[data-testid="player-reserve"]');
     const boundingBox = await reserve.boundingBox();

     // 點擊測試（觸控友善）
     await page.tap('[data-testid="reserve-red-large"]');
     await page.tap('[data-testid="cell-0-0"]');
   });
   ```

**執行 E2E 測試：**
```bash
npx playwright test                    # 執行所有測試
npx playwright test --ui               # UI 模式（推薦）
npx playwright test --headed           # 顯示瀏覽器
npx playwright test --project=chromium # 只測試 Chrome
npx playwright test --project=Mobile   # 只測試手機
npx playwright show-report             # 查看報告
```

**Playwright 配置：**
```typescript
// playwright.config.ts
export default {
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
  },
};
```

**測試優先級：**
- ⭐⭐⭐ 本機雙人完整流程
- ⭐⭐ AI 對戰基本功能
- ⭐⭐ 線上雙人房間創建
- ⭐ 手機模擬測試
- ⭐ 重新整理恢復狀態

**何時寫 E2E 測試：**
- Step 5 完成後：測試本機雙人
- Step 6 完成後：測試 AI 對戰
- Step 7 完成後：測試線上對戰
- Step 8 完成後：測試手機佈局

**建議策略：**
- 先完成所有功能（Step 1-10）
- 再集中寫 E2E 測試（Step 11）
- 這樣可以避免功能變動導致測試失效

- **最終完成** ✅

---

## 視覺里程碑時間估計

- **Step 1**：首頁和路由（30 分鐘）
- **Step 2-3**：棋盤和點擊互動（1.5 小時）
- **Step 4-5**：遊戲規則 + 測試 + 本機雙人（4 小時）⭐
- **Step 6**：AI 對手 + 測試（4 小時）⭐
- **Step 7**：線上對戰（4 小時）⭐
- **Step 8**：響應式佈局（1 小時）
- **Step 9**：歷史記錄（1 小時）
- **Step 10**：UI 美化（2 小時）
- **Step 11**：E2E 測試（2 小時，選做）

**總計：約 20 小時完成完整遊戲（含測試）**
**不含 E2E：約 18 小時**

---

## 關鍵檔案清單

### 必須新建的檔案
```
packages/web/src/pages/
  ├── Home.tsx            # 首頁（三個選項）
  ├── LocalGame.tsx       # 本機雙人遊戲
  ├── AIGame.tsx          # 單人 AI 遊戲
  ├── OnlineGame.tsx      # 線上雙人遊戲
  └── OnlineLobby.tsx     # 線上房間大廳

packages/web/src/components/
  ├── Board.tsx           # 棋盤組件
  ├── Cell.tsx            # 格子組件
  ├── Piece.tsx           # 棋子組件
  ├── PlayerReserve.tsx   # 玩家儲備區
  └── MoveHistory.tsx     # 移動歷史記錄

packages/web/src/lib/
  ├── gameLogic.ts        # 遊戲規則引擎
  ├── gameLogic.test.ts   # 遊戲規則測試 ⭐
  ├── ai.ts               # AI 對手邏輯
  ├── ai.test.ts          # AI 演算法測試 ⭐
  └── storage.ts          # localStorage 狀態管理

packages/web/src/hooks/
  ├── useGameInput.ts     # 遊戲輸入處理
  └── useMediaQuery.ts    # 響應式檢測

tests/e2e/                # E2E 測試（Playwright）⭐
  ├── local-game.spec.ts  # 本機雙人測試
  ├── ai-game.spec.ts     # AI 對戰測試
  └── online-game.spec.ts # 線上對戰測試

shared/types/src/
  └── game.ts             # 遊戲狀態類型定義

services/game-service/src/game/
  ├── GameRoom.ts         # 遊戲房間管理
  └── gameLogic.ts        # 後端遊戲邏輯（與前端共用）
```

### 必須修改的檔案
```
packages/web/src/App.tsx                      # 路由配置
shared/types/src/index.ts                     # 匯出遊戲類型
packages/web/src/lib/websocket.ts             # WebSocket 遊戲訊息
services/game-service/src/websocket/handler.ts # 後端 WebSocket 處理
packages/web/package.json                      # 加入 react-router-dom、vitest
```

### 測試配置檔案
```
packages/web/vitest.config.ts    # Vitest 配置
playwright.config.ts             # Playwright 配置
packages/web/package.json        # 測試 scripts
```

---

## 技術選型

- **互動方式**：點擊選擇（onClick），不使用拖放
- **手機支援**：Touch events + 大按鈕（最小 44x44px）
- **響應式**：Tailwind CSS 斷點（sm, md, lg）
- **狀態管理**：useState（簡單）或 Zustand（複雜）
- **AI 算法**：Minimax + Alpha-Beta 剪枝
- **路由**：React Router v6
- **動畫**（Step 10）：Tailwind CSS transition
- **音效**（可選）：howler.js
- **單元/整合測試**：Vitest
- **E2E 測試**：Playwright（支援手機模擬）

## 測試策略

**採用「平衡測試」策略：**

### 單元測試（Vitest）⭐⭐⭐ 必須
- **遊戲邏輯** (`gameLogic.test.ts`)
  - 移動驗證：合法/非法移動
  - 吃子規則：大吃小、同尺寸不能覆蓋
  - 勝利判定：橫直斜 8 條線
  - 遊戲狀態轉換

- **AI 演算法** (`ai.test.ts`)
  - 簡單 AI：檢查獲勝、阻擋
  - Minimax：評估函數正確性
  - Alpha-Beta：剪枝效率
  - 確保 AI 不下非法移動

- **localStorage 管理** (`storage.test.ts`)
  - 保存/讀取遊戲狀態
  - 資料格式驗證
  - 錯誤處理

### 整合測試（Vitest）⭐⭐ 重要
- **WebSocket 訊息** (`websocket.test.ts`)
  - 房間創建/加入
  - 遊戲狀態同步
  - 重連機制
  - 使用 `vi.mock()` 模擬 WebSocket

### E2E 測試（Playwright）⭐ 選做
- **關鍵流程測試**
  - 本機雙人：完整對局流程
  - AI 對戰：選擇難度、對戰、獲勝
  - 線上對戰：創建房間、加入、對戰
  - 手機模擬：觸控互動測試

**測試覆蓋率目標：**
- 遊戲邏輯：≥ 90%
- AI 演算法：≥ 80%
- 其他：≥ 60%

---

## 執行策略

**用戶確認：採用「逐步確認」模式**
- 每完成一個 Step 後暫停
- 用戶在手機和桌機測試效果
- 確認無誤後再進行下一步
- 可隨時調整方向

## 開發原則

1. **功能優先** - 規則正確比畫面漂亮更重要
2. **手機優先** - 先確保手機可玩，再考慮桌機
3. **漸進增強** - 從簡單模式（本機雙人）到複雜模式（線上、AI）
4. **延後美化** - 最後才做 UI 美化和動畫
5. **頻繁測試** - 每步都在真實手機上測試

---

## 測試建議

### 開發過程中的測試
- **Step 1**：測試路由跳轉
- **Step 2-3**：測試手機點擊互動是否流暢
- **Step 4**：執行 `npm run test` 驗證遊戲規則測試通過 ⭐
- **Step 5**：玩幾局本機雙人，驗證規則
- **Step 6**：執行 `npm run test` 驗證 AI 測試通過 ⭐
- **Step 7**：開兩個手機測試線上對戰
- **Step 8**：測試不同螢幕尺寸的佈局
- **Step 9**：測試歷史記錄功能
- **Step 10**：整體體驗測試
- **Step 11**：執行 `npx playwright test --ui` 驗證 E2E 測試 ⭐

### CI/CD 整合（未來）
完成所有測試後，可考慮設定 GitHub Actions：
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test          # Vitest 單元測試
      - run: npx playwright install
      - run: npx playwright test   # E2E 測試
```

---

## 部署策略

### 版本號管理
**採用統一版號（Monorepo 風格）**
- 一個 Git tag（如 `v1.0.0`）代表整個專案版本
- 所有服務（web、api-gateway、game-service）同步發布

### 測站與正站
**測站（自動部署）**：
- `main` 分支 → 自動部署到測站
- 域名：dev-yumyum.sexyoung.tw

**正站（Tag 觸發）**：
- 打 tag `v1.0.0` 時：
  - Railway (api-gateway, game-service)：自動部署
  - Vercel (web)：手動到後台選擇該 tag 部署
- 域名：yumyum.sexyoung.tw

### 上正站流程
1. 在測站測試完成
2. 打 Git tag：`git tag v1.0.0 && git push origin v1.0.0`
3. Railway 自動部署後端
4. Vercel 手動點擊部署前端
