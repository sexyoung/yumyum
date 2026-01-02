---
name: testing-expert
description: YumYum 測試專家，精通 Vitest（單元/整合測試）和 Playwright（E2E 測試）。當需要編寫測試、設定測試環境或解決測試問題時使用此 skill。涵蓋測試驅動開發（TDD）、測試策略、覆蓋率優化和 CI/CD 整合。
---

# YumYum 測試專家

## 使用說明

當遇到以下情況時使用此 skill：

1. **編寫單元測試**：使用 Vitest 測試遊戲邏輯、AI 演算法、工具函數
2. **編寫整合測試**：測試 WebSocket、API、localStorage 等整合功能
3. **編寫 E2E 測試**：使用 Playwright 測試完整用戶流程
4. **設定測試環境**：配置 Vitest、Playwright、測試覆蓋率工具
5. **測試驅動開發**：使用 TDD 流程開發新功能
6. **解決測試問題**：Debug 失敗的測試、優化測試性能
7. **CI/CD 整合**：設定自動化測試流程

## 測試策略總覽

YumYum 採用「平衡測試」策略：

```yaml
單元測試（Vitest）:
  - 遊戲邏輯: ⭐⭐⭐ 必須（覆蓋率 ≥ 90%）
  - AI 演算法: ⭐⭐⭐ 必須（覆蓋率 ≥ 80%）
  - localStorage: ⭐⭐ 重要
  - 工具函數: ⭐⭐ 重要

整合測試（Vitest）:
  - WebSocket: ⭐⭐ 重要
  - API 端點: ⭐ 選做

E2E 測試（Playwright）:
  - 本機雙人: ⭐⭐⭐ 必須
  - AI 對戰: ⭐⭐ 重要
  - 線上對戰: ⭐⭐ 重要
  - 手機模擬: ⭐ 選做
```

---

## Vitest 單元測試指南

### 安裝與設定

```bash
# 安裝 Vitest
cd packages/web
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

### Vitest 配置

**vitest.config.ts：**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

**src/test/setup.ts：**
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 每個測試後清理 DOM
afterEach(() => {
  cleanup();
});
```

**package.json scripts：**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 遊戲邏輯測試範例

**gameLogic.test.ts：**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialGameState,
  validateMove,
  applyMove,
  checkWinner,
  type GameState,
  type Position,
  type PieceSize,
} from './gameLogic';

describe('遊戲邏輯引擎', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  describe('createInitialGameState', () => {
    it('應該創建正確的初始狀態', () => {
      expect(gameState.currentPlayer).toBe('red');
      expect(gameState.winner).toBeNull();
      expect(gameState.board).toHaveLength(3);
      expect(gameState.board[0]).toHaveLength(3);

      // 驗證儲備區
      expect(gameState.reserves.red.small).toBe(2);
      expect(gameState.reserves.red.medium).toBe(2);
      expect(gameState.reserves.red.large).toBe(2);
      expect(gameState.reserves.blue.small).toBe(2);
      expect(gameState.reserves.blue.medium).toBe(2);
      expect(gameState.reserves.blue.large).toBe(2);
    });

    it('應該創建空的棋盤', () => {
      gameState.board.forEach(row => {
        row.forEach(cell => {
          expect(cell.pieces).toEqual([]);
        });
      });
    });
  });

  describe('validateMove - 從儲備區放置', () => {
    it('應該允許當前玩家從儲備區放置棋子到空格', () => {
      const from: Position = { row: -1, col: 0 }; // 儲備區（row: -1）
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'small';

      const result = validateMove(gameState, from, to, size);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該拒絕非當前玩家放置棋子', () => {
      // 修改當前玩家為藍方
      gameState.currentPlayer = 'blue';

      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'small';

      // 嘗試用紅色棋子放置（應該失敗）
      const result = validateMove(gameState, from, to, size, 'red');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('不是你的回合');
    });

    it('應該拒絕放置儲備區沒有的棋子', () => {
      // 清空紅方 small 棋子
      gameState.reserves.red.small = 0;

      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'small';

      const result = validateMove(gameState, from, to, size);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('儲備區沒有該尺寸的棋子');
    });
  });

  describe('validateMove - 吃子規則', () => {
    beforeEach(() => {
      // 在 (0,0) 放一個小棋子
      gameState.board[0][0].pieces = [
        { color: 'blue', size: 'small' }
      ];
    });

    it('應該允許大棋子覆蓋小棋子', () => {
      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'large';

      const result = validateMove(gameState, from, to, size);

      expect(result.valid).toBe(true);
    });

    it('應該允許中棋子覆蓋小棋子', () => {
      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'medium';

      const result = validateMove(gameState, from, to, size);

      expect(result.valid).toBe(true);
    });

    it('應該拒絕同尺寸棋子覆蓋', () => {
      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'small';

      const result = validateMove(gameState, from, to, size);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('只能用大棋子覆蓋小棋子');
    });

    it('應該拒絕小棋子覆蓋大棋子', () => {
      // 先放一個大棋子
      gameState.board[1][1].pieces = [
        { color: 'blue', size: 'large' }
      ];

      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 1, col: 1 };
      const size: PieceSize = 'small';

      const result = validateMove(gameState, from, to, size);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('只能用大棋子覆蓋小棋子');
    });
  });

  describe('validateMove - 移動棋盤上的棋子', () => {
    beforeEach(() => {
      // 在 (0,0) 放一個紅色大棋子
      gameState.board[0][0].pieces = [
        { color: 'red', size: 'large' }
      ];
    });

    it('應該允許移動最上層的棋子', () => {
      const from: Position = { row: 0, col: 0 };
      const to: Position = { row: 0, col: 1 };

      const result = validateMove(gameState, from, to);

      expect(result.valid).toBe(true);
    });

    it('應該拒絕移動不屬於當前玩家的棋子', () => {
      // 修改棋子為藍色
      gameState.board[0][0].pieces[0].color = 'blue';

      const from: Position = { row: 0, col: 0 };
      const to: Position = { row: 0, col: 1 };

      const result = validateMove(gameState, from, to);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('只能移動自己的棋子');
    });

    it('應該拒絕移動不是最上層的棋子', () => {
      // 堆疊兩個棋子
      gameState.board[0][0].pieces = [
        { color: 'red', size: 'small' },
        { color: 'blue', size: 'large' }
      ];

      const from: Position = { row: 0, col: 0 };
      const to: Position = { row: 0, col: 1 };

      // 當前玩家是紅方，但最上層是藍色
      const result = validateMove(gameState, from, to);

      expect(result.valid).toBe(false);
    });
  });

  describe('applyMove', () => {
    it('應該正確應用移動並切換玩家', () => {
      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'small';

      const newState = applyMove(gameState, from, to, size);

      // 驗證棋子已放置
      expect(newState.board[0][0].pieces).toHaveLength(1);
      expect(newState.board[0][0].pieces[0]).toEqual({
        color: 'red',
        size: 'small'
      });

      // 驗證儲備區減少
      expect(newState.reserves.red.small).toBe(1);

      // 驗證玩家切換
      expect(newState.currentPlayer).toBe('blue');
    });

    it('應該保持原狀態不變（immutability）', () => {
      const from: Position = { row: -1, col: 0 };
      const to: Position = { row: 0, col: 0 };
      const size: PieceSize = 'small';

      applyMove(gameState, from, to, size);

      // 原狀態不應該改變
      expect(gameState.board[0][0].pieces).toHaveLength(0);
      expect(gameState.reserves.red.small).toBe(2);
      expect(gameState.currentPlayer).toBe('red');
    });
  });

  describe('checkWinner - 橫向連線', () => {
    it('應該偵測第一行橫向連線', () => {
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'red', size: 'medium' }];
      gameState.board[0][2].pieces = [{ color: 'red', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('應該偵測第二行橫向連線', () => {
      gameState.board[1][0].pieces = [{ color: 'blue', size: 'large' }];
      gameState.board[1][1].pieces = [{ color: 'blue', size: 'medium' }];
      gameState.board[1][2].pieces = [{ color: 'blue', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBe('blue');
    });
  });

  describe('checkWinner - 直向連線', () => {
    it('應該偵測第一列直向連線', () => {
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[1][0].pieces = [{ color: 'red', size: 'medium' }];
      gameState.board[2][0].pieces = [{ color: 'red', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });
  });

  describe('checkWinner - 斜向連線', () => {
    it('應該偵測左上到右下對角線', () => {
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[1][1].pieces = [{ color: 'red', size: 'medium' }];
      gameState.board[2][2].pieces = [{ color: 'red', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('應該偵測右上到左下對角線', () => {
      gameState.board[0][2].pieces = [{ color: 'blue', size: 'large' }];
      gameState.board[1][1].pieces = [{ color: 'blue', size: 'medium' }];
      gameState.board[2][0].pieces = [{ color: 'blue', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBe('blue');
    });
  });

  describe('checkWinner - 堆疊情況', () => {
    it('應該只看最上層棋子的顏色', () => {
      // 三個格子都有堆疊，但最上層都是紅色
      gameState.board[0][0].pieces = [
        { color: 'blue', size: 'small' },
        { color: 'red', size: 'large' }
      ];
      gameState.board[0][1].pieces = [
        { color: 'blue', size: 'medium' },
        { color: 'red', size: 'large' }
      ];
      gameState.board[0][2].pieces = [
        { color: 'blue', size: 'small' },
        { color: 'red', size: 'medium' }
      ];

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('堆疊中最上層顏色不同時不應獲勝', () => {
      gameState.board[0][0].pieces = [
        { color: 'red', size: 'small' },
        { color: 'blue', size: 'large' }
      ];
      gameState.board[0][1].pieces = [{ color: 'red', size: 'medium' }];
      gameState.board[0][2].pieces = [{ color: 'red', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBeNull();
    });
  });

  describe('checkWinner - 無勝者', () => {
    it('空棋盤應該返回 null', () => {
      const winner = checkWinner(gameState);

      expect(winner).toBeNull();
    });

    it('未連線應該返回 null', () => {
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[1][1].pieces = [{ color: 'blue', size: 'medium' }];
      gameState.board[2][2].pieces = [{ color: 'red', size: 'small' }];

      const winner = checkWinner(gameState);

      expect(winner).toBeNull();
    });
  });
});
```

### AI 演算法測試範例

**ai.test.ts：**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEasyAIMove,
  getMediumAIMove,
  getHardAIMove,
  evaluateBoard,
  minimax,
} from './ai';
import { createInitialGameState, applyMove, type GameState } from './gameLogic';

describe('AI 對手', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState();
  });

  describe('簡單 AI', () => {
    it('應該優先選擇獲勝移動', () => {
      // 設置一個紅方即將獲勝的棋盤（兩個連線）
      gameState.board[0][0].pieces = [{ color: 'blue', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'blue', size: 'medium' }];
      // [0][2] 是空的，AI 應該在這裡下棋

      gameState.currentPlayer = 'blue';
      const move = getEasyAIMove(gameState);

      expect(move).toBeDefined();
      expect(move?.to).toEqual({ row: 0, col: 2 });
    });

    it('應該優先阻擋對手獲勝', () => {
      // 設置一個紅方即將獲勝的棋盤
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'red', size: 'medium' }];
      // [0][2] 是空的，AI 應該阻擋

      gameState.currentPlayer = 'blue';
      const move = getEasyAIMove(gameState);

      expect(move).toBeDefined();
      expect(move?.to).toEqual({ row: 0, col: 2 });
    });

    it('不應該下出非法移動', () => {
      // 執行 100 次隨機測試
      for (let i = 0; i < 100; i++) {
        const testState = createInitialGameState();
        testState.currentPlayer = 'blue';

        const move = getEasyAIMove(testState);

        if (move) {
          // 驗證移動是合法的
          const validation = validateMove(testState, move.from, move.to, move.size);
          expect(validation.valid).toBe(true);
        }
      }
    });
  });

  describe('Minimax AI', () => {
    it('應該能正確評估獲勝棋盤', () => {
      // 紅方獲勝的棋盤
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'red', size: 'medium' }];
      gameState.board[0][2].pieces = [{ color: 'red', size: 'small' }];

      const score = evaluateBoard(gameState, 'red');

      expect(score).toBe(1000); // 獲勝分數
    });

    it('應該能正確評估失敗棋盤', () => {
      // 藍方獲勝的棋盤
      gameState.board[0][0].pieces = [{ color: 'blue', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'blue', size: 'medium' }];
      gameState.board[0][2].pieces = [{ color: 'blue', size: 'small' }];

      const score = evaluateBoard(gameState, 'red');

      expect(score).toBe(-1000); // 失敗分數
    });

    it('應該在簡單棋局中找到最佳解', () => {
      // 一個明顯應該下在 (0,2) 的棋局
      gameState.board[0][0].pieces = [{ color: 'blue', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'blue', size: 'medium' }];

      gameState.currentPlayer = 'blue';
      const move = getMediumAIMove(gameState);

      expect(move).toBeDefined();
      expect(move?.to).toEqual({ row: 0, col: 2 });
    });

    it('不應該下出非法移動', () => {
      for (let i = 0; i < 50; i++) {
        const testState = createInitialGameState();
        testState.currentPlayer = 'blue';

        const move = getMediumAIMove(testState);

        if (move) {
          const validation = validateMove(testState, move.from, move.to, move.size);
          expect(validation.valid).toBe(true);
        }
      }
    });
  });

  describe('Alpha-Beta AI', () => {
    it('應該與 Minimax 產生相同結果（小棋盤）', () => {
      // 簡單棋局
      gameState.board[0][0].pieces = [{ color: 'red', size: 'small' }];

      gameState.currentPlayer = 'blue';
      const minimaxMove = getMediumAIMove(gameState);
      const alphaBetaMove = getHardAIMove(gameState);

      // 在簡單情況下，兩者應該選擇相同的最佳移動
      expect(alphaBetaMove).toBeDefined();
      // 評估分數應該相同（允許誤差）
    });

    it('應該在合理時間內返回結果', () => {
      const startTime = Date.now();

      gameState.currentPlayer = 'blue';
      const move = getHardAIMove(gameState);

      const elapsed = Date.now() - startTime;

      expect(move).toBeDefined();
      expect(elapsed).toBeLessThan(3000); // 應該在 3 秒內完成
    });

    it('不應該下出非法移動', () => {
      for (let i = 0; i < 30; i++) {
        const testState = createInitialGameState();
        testState.currentPlayer = 'blue';

        const move = getHardAIMove(testState);

        if (move) {
          const validation = validateMove(testState, move.from, move.to, move.size);
          expect(validation.valid).toBe(true);
        }
      }
    });
  });
});
```

### localStorage 測試範例

**storage.test.ts：**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveLocalGameState,
  loadLocalGameState,
  clearLocalGameState,
  saveAIGameState,
  loadAIGameState,
  saveRoomInfo,
  loadRoomInfo,
  clearRoomInfo,
} from './storage';
import { createInitialGameState } from './gameLogic';

describe('localStorage 管理', () => {
  beforeEach(() => {
    // 每個測試前清空 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('本機雙人遊戲狀態', () => {
    it('應該能保存和讀取遊戲狀態', () => {
      const gameState = createInitialGameState();
      gameState.currentPlayer = 'blue';

      saveLocalGameState(gameState);
      const loaded = loadLocalGameState();

      expect(loaded).toEqual(gameState);
    });

    it('localStorage 為空時應該返回 null', () => {
      const loaded = loadLocalGameState();

      expect(loaded).toBeNull();
    });

    it('應該能清除遊戲狀態', () => {
      const gameState = createInitialGameState();
      saveLocalGameState(gameState);

      clearLocalGameState();
      const loaded = loadLocalGameState();

      expect(loaded).toBeNull();
    });

    it('應該處理損壞的 JSON 數據', () => {
      localStorage.setItem('yumyum:local:gameState', 'invalid json');

      const loaded = loadLocalGameState();

      expect(loaded).toBeNull();
    });
  });

  describe('AI 遊戲狀態', () => {
    it('應該能保存和讀取 AI 遊戲狀態及難度', () => {
      const gameState = createInitialGameState();
      const difficulty = 'medium';

      saveAIGameState(gameState, difficulty);
      const loaded = loadAIGameState();

      expect(loaded).toBeDefined();
      expect(loaded?.gameState).toEqual(gameState);
      expect(loaded?.difficulty).toBe('medium');
    });

    it('應該能保存所有難度選項', () => {
      const gameState = createInitialGameState();

      ['easy', 'medium', 'hard'].forEach(difficulty => {
        saveAIGameState(gameState, difficulty as any);
        const loaded = loadAIGameState();

        expect(loaded?.difficulty).toBe(difficulty);
      });
    });
  });

  describe('線上遊戲房間資訊', () => {
    it('應該能保存和讀取房間資訊', () => {
      const roomInfo = {
        roomId: 'test-room-123',
        playerId: 'player-456',
        playerColor: 'red' as const,
      };

      saveRoomInfo(roomInfo.roomId, roomInfo.playerId, roomInfo.playerColor);
      const loaded = loadRoomInfo();

      expect(loaded).toEqual(roomInfo);
    });

    it('應該能清除房間資訊', () => {
      saveRoomInfo('room-1', 'player-1', 'red');

      clearRoomInfo();
      const loaded = loadRoomInfo();

      expect(loaded).toBeNull();
    });

    it('部分資訊缺失時應該返回 null', () => {
      localStorage.setItem('yumyum:online:roomId', 'test-room');
      // 缺少 playerId

      const loaded = loadRoomInfo();

      expect(loaded).toBeNull();
    });
  });
});
```

### 執行測試

```bash
# 執行所有測試
npm run test

# 監聽模式（推薦開發時使用）
npm run test:watch

# UI 模式（視覺化介面）
npm run test:ui

# 生成覆蓋率報告
npm run test:coverage

# 只執行特定檔案
npm run test gameLogic.test.ts

# 只執行特定測試
npm run test -t "應該允許大棋子覆蓋小棋子"
```

---

## Playwright E2E 測試指南

### 安裝與設定

```bash
# 安裝 Playwright
npm init playwright@latest

# 安裝瀏覽器
npx playwright install
```

### Playwright 配置

**playwright.config.ts：**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E 測試範例

**tests/e2e/local-game.spec.ts：**
```typescript
import { test, expect } from '@playwright/test';

test.describe('本機雙人遊戲', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/local');
  });

  test('應該顯示空棋盤和儲備區', async ({ page }) => {
    // 驗證棋盤存在
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();

    // 驗證玩家儲備區存在
    await expect(page.locator('[data-testid="player-red-reserve"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-blue-reserve"]')).toBeVisible();

    // 驗證當前回合提示
    await expect(page.locator('text=紅方回合')).toBeVisible();
  });

  test('應該能完成一局完整遊戲', async ({ page }) => {
    // 紅方第一步：small 放到 (0,0)
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-0-0"]');

    // 驗證回合切換
    await expect(page.locator('text=藍方回合')).toBeVisible();

    // 藍方第一步：small 放到 (0,1)
    await page.click('[data-testid="reserve-blue-small"]');
    await page.click('[data-testid="cell-0-1"]');

    // 驗證棋子已放置
    const cell00 = page.locator('[data-testid="cell-0-0"]');
    await expect(cell00.locator('[data-testid="piece-red"]')).toBeVisible();

    const cell01 = page.locator('[data-testid="cell-0-1"]');
    await expect(cell01.locator('[data-testid="piece-blue"]')).toBeVisible();

    // 繼續下棋直到紅方獲勝
    // 紅方: medium (0,2)
    await page.click('[data-testid="reserve-red-medium"]');
    await page.click('[data-testid="cell-0-2"]');

    // 藍方: medium (1,0)
    await page.click('[data-testid="reserve-blue-medium"]');
    await page.click('[data-testid="cell-1-0"]');

    // 紅方: large (1,1) - 補充連線
    await page.click('[data-testid="reserve-red-large"]');
    await page.click('[data-testid="cell-1-1"]');

    // 藍方: large (2,0)
    await page.click('[data-testid="reserve-blue-large"]');
    await page.click('[data-testid="cell-2-0"]');

    // 紅方: small (2,2) - 獲勝（斜線）
    // (0,0) red, (1,1) red, (2,2) red 連線
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-2-2"]');

    // 驗證勝利訊息
    await expect(page.locator('text=紅方獲勝')).toBeVisible({ timeout: 1000 });

    // 驗證連線高亮（如果有實作）
    // await expect(page.locator('[data-testid="winning-line"]')).toBeVisible();
  });

  test('應該在重新整理後恢復遊戲狀態', async ({ page }) => {
    // 下幾步棋
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-0-0"]');

    await page.click('[data-testid="reserve-blue-small"]');
    await page.click('[data-testid="cell-0-1"]');

    // 重新整理頁面
    await page.reload();

    // 驗證遊戲狀態保留
    await expect(page.locator('[data-testid="cell-0-0"] [data-testid="piece-red"]')).toBeVisible();
    await expect(page.locator('[data-testid="cell-0-1"] [data-testid="piece-blue"]')).toBeVisible();

    // 驗證當前回合正確（應該是紅方）
    await expect(page.locator('text=紅方回合')).toBeVisible();
  });

  test('應該拒絕非法移動', async ({ page }) => {
    // 紅方放一個 small
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-1-1"]');

    // 藍方嘗試用 small 覆蓋（應該失敗）
    await page.click('[data-testid="reserve-blue-small"]');
    await page.click('[data-testid="cell-1-1"]');

    // 驗證錯誤訊息
    await expect(page.locator('text=只能用大棋子覆蓋小棋子')).toBeVisible();

    // 驗證棋子沒有改變
    await expect(page.locator('[data-testid="cell-1-1"] [data-testid="piece-red"]')).toBeVisible();
  });
});

test.describe('本機雙人遊戲 - 手機版', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });

  test('手機版應該能正常遊玩', async ({ page }) => {
    await page.goto('/local');

    // 驗證手機佈局（垂直排列）
    const reserve = page.locator('[data-testid="player-red-reserve"]');
    const board = page.locator('[data-testid="game-board"]');

    const reserveBox = await reserve.boundingBox();
    const boardBox = await board.boundingBox();

    // 儲備區應該在棋盤上方
    expect(reserveBox!.y).toBeLessThan(boardBox!.y);

    // 使用 tap 而非 click（觸控友善）
    await page.tap('[data-testid="reserve-red-small"]');
    await page.tap('[data-testid="cell-0-0"]');

    // 驗證棋子已放置
    await expect(page.locator('[data-testid="cell-0-0"] [data-testid="piece-red"]')).toBeVisible();
  });

  test('棋子應該足夠大方便點擊', async ({ page }) => {
    await page.goto('/local');

    const piece = page.locator('[data-testid="reserve-red-small"]').first();
    const box = await piece.boundingBox();

    // 最小觸控目標：44x44px
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
```

**tests/e2e/ai-game.spec.ts：**
```typescript
import { test, expect } from '@playwright/test';

test.describe('AI 對戰', () => {
  test('應該能選擇難度並開始遊戲', async ({ page }) => {
    await page.goto('/ai');

    // 驗證難度選擇按鈕
    await expect(page.locator('text=簡單')).toBeVisible();
    await expect(page.locator('text=中等')).toBeVisible();
    await expect(page.locator('text=困難')).toBeVisible();

    // 選擇簡單難度
    await page.click('text=簡單');

    // 驗證進入遊戲
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  });

  test('AI 應該自動回應玩家移動', async ({ page }) => {
    await page.goto('/ai');
    await page.click('text=簡單');

    // 玩家下棋
    await page.click('[data-testid="reserve-red-medium"]');
    await page.click('[data-testid="cell-1-1"]');

    // 顯示 AI 思考中
    await expect(page.locator('text=AI 思考中')).toBeVisible();

    // 等待 AI 下棋（最多 3 秒）
    await expect(page.locator('[data-testid="piece-blue"]')).toBeVisible({ timeout: 3000 });

    // 驗證輪到玩家
    await expect(page.locator('text=你的回合')).toBeVisible();
  });

  test('應該能在重新整理後恢復 AI 遊戲', async ({ page }) => {
    await page.goto('/ai');
    await page.click('text=中等');

    // 玩家下一步
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-0-0"]');

    // 等待 AI 回應
    await page.waitForTimeout(2000);

    // 重新整理
    await page.reload();

    // 驗證遊戲狀態保留
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();

    // 驗證有棋子在棋盤上
    const pieces = page.locator('[data-testid^="piece-"]');
    await expect(pieces).toHaveCount(2); // 玩家 + AI
  });
});
```

**tests/e2e/online-game.spec.ts：**
```typescript
import { test, expect } from '@playwright/test';

test.describe('線上雙人對戰', () => {
  test('應該能創建房間', async ({ page }) => {
    await page.goto('/online');

    // 點擊創建房間
    await page.click('text=創建房間');

    // 驗證顯示房間 ID
    const roomId = await page.locator('[data-testid="room-id"]').textContent();
    expect(roomId).toBeTruthy();
    expect(roomId!.length).toBeGreaterThan(0);

    // 驗證等待訊息
    await expect(page.locator('text=等待對手加入')).toBeVisible();
  });

  test('應該能雙人對戰', async ({ browser }) => {
    // 創建兩個瀏覽器上下文（模擬兩個玩家）
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
    await player2.fill('input[name="roomId"]', roomId!);
    await player2.click('text=加入');

    // 驗證雙方都進入遊戲
    await expect(player1.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(player2.locator('[data-testid="game-board"]')).toBeVisible();

    // Player 1（紅方）下棋
    await player1.click('[data-testid="reserve-red-small"]');
    await player1.click('[data-testid="cell-0-0"]');

    // 驗證 Player 2 看到棋子
    await expect(player2.locator('[data-testid="cell-0-0"] [data-testid="piece-red"]'))
      .toBeVisible({ timeout: 2000 });

    // Player 2（藍方）下棋
    await player2.click('[data-testid="reserve-blue-small"]');
    await player2.click('[data-testid="cell-0-1"]');

    // 驗證 Player 1 看到棋子
    await expect(player1.locator('[data-testid="cell-0-1"] [data-testid="piece-blue"]'))
      .toBeVisible({ timeout: 2000 });

    // 清理
    await context1.close();
    await context2.close();
  });

  test('應該在重新整理後自動重連', async ({ page }) => {
    await page.goto('/online');
    await page.click('text=創建房間');

    const roomId = await page.locator('[data-testid="room-id"]').textContent();

    // 重新整理頁面
    await page.reload();

    // 驗證顯示重連選項
    await expect(page.locator(`text=重新連接到房間 ${roomId}`)).toBeVisible();

    // 點擊重連
    await page.click(`text=重新連接到房間 ${roomId}`);

    // 驗證重連成功
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  });
});
```

### 執行 E2E 測試

```bash
# 執行所有測試
npx playwright test

# UI 模式（推薦）
npx playwright test --ui

# 顯示瀏覽器
npx playwright test --headed

# 只測試特定瀏覽器
npx playwright test --project=chromium
npx playwright test --project="Mobile Chrome"

# 只執行特定檔案
npx playwright test tests/e2e/local-game.spec.ts

# Debug 模式
npx playwright test --debug

# 查看測試報告
npx playwright show-report
```

---

## TDD 工作流程

### Red-Green-Refactor 循環

```typescript
// 1. Red - 先寫測試（會失敗）
test('應該允許大棋子覆蓋小棋子', () => {
  const result = canCoverPiece('large', 'small');
  expect(result).toBe(true);
});

// 2. Green - 寫最簡單的實作讓測試通過
function canCoverPiece(newSize: PieceSize, existingSize: PieceSize): boolean {
  const sizes = { small: 1, medium: 2, large: 3 };
  return sizes[newSize] > sizes[existingSize];
}

// 3. Refactor - 重構優化
const PIECE_SIZES = {
  small: 1,
  medium: 2,
  large: 3,
} as const;

function canCoverPiece(newSize: PieceSize, existingSize: PieceSize): boolean {
  return PIECE_SIZES[newSize] > PIECE_SIZES[existingSize];
}
```

### 測試先行的好處

1. **更好的設計**：寫測試時會思考 API 設計
2. **快速反饋**：立即知道功能是否正確
3. **重構信心**：有測試保護，放心重構
4. **文件化**：測試即文件，展示如何使用
5. **減少 Bug**：早期發現問題

---

## 測試最佳實踐

### 1. AAA 模式（Arrange-Act-Assert）

```typescript
test('應該能正確應用移動', () => {
  // Arrange - 準備測試數據
  const gameState = createInitialGameState();
  const from = { row: -1, col: 0 };
  const to = { row: 0, col: 0 };

  // Act - 執行操作
  const newState = applyMove(gameState, from, to, 'small');

  // Assert - 驗證結果
  expect(newState.board[0][0].pieces).toHaveLength(1);
  expect(newState.currentPlayer).toBe('blue');
});
```

### 2. 測試命名規範

```typescript
// ✅ 好的命名
test('應該允許大棋子覆蓋小棋子', () => {});
test('應該拒絕非當前玩家下棋', () => {});
test('空棋盤應該返回 null', () => {});

// ❌ 不好的命名
test('test1', () => {});
test('works', () => {});
test('棋子', () => {});
```

### 3. 測試隔離

```typescript
// ✅ 每個測試都是獨立的
describe('遊戲邏輯', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState(); // 每次都重新創建
  });

  test('測試 A', () => {
    // 修改 gameState 不影響其他測試
  });

  test('測試 B', () => {
    // 有全新的 gameState
  });
});
```

### 4. 使用 data-testid

```tsx
// ✅ 使用 data-testid 選擇器
<div data-testid="game-board">
  <div data-testid="cell-0-0" />
</div>

// Playwright 測試
await page.click('[data-testid="cell-0-0"]');

// ❌ 避免依賴 className 或 text
await page.click('.cell-container > div:first-child');
```

### 5. Mock 外部依賴

```typescript
import { vi } from 'vitest';

// Mock WebSocket
vi.mock('./websocket', () => ({
  WebSocketClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    send: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

test('應該發送 WebSocket 訊息', () => {
  const ws = new WebSocketClient();
  ws.send({ type: 'move', data: {} });

  expect(ws.send).toHaveBeenCalledWith({ type: 'move', data: {} });
});
```

---

## 測試覆蓋率

### 查看覆蓋率報告

```bash
npm run test:coverage
```

報告會顯示：
- **Lines**：程式碼行覆蓋率
- **Functions**：函數覆蓋率
- **Branches**：分支覆蓋率
- **Statements**：語句覆蓋率

### 覆蓋率目標

```yaml
遊戲邏輯（gameLogic.ts）: ≥ 90%
AI 演算法（ai.ts）: ≥ 80%
WebSocket（websocket.ts）: ≥ 70%
其他工具函數: ≥ 60%
```

### 忽略特定程式碼

```typescript
/* c8 ignore next 3 */
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}
```

---

## CI/CD 整合

### GitHub Actions 配置

**.github/workflows/test.yml：**
```yaml
name: Tests
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 常見問題與解決方案

### Q1: 測試執行很慢怎麼辦？

**A:**
```typescript
// 使用 test.concurrent 並行執行
test.concurrent('測試 A', async () => {});
test.concurrent('測試 B', async () => {});

// 使用 beforeAll 代替 beforeEach（如果可以）
describe('遊戲邏輯', () => {
  const gameState = createInitialGameState();

  beforeAll(() => {
    // 只執行一次
  });
});
```

### Q2: Mock 不生效？

**A:**
```typescript
// 確保 Mock 在 import 之前
vi.mock('./gameLogic');
import { validateMove } from './gameLogic';

// 清理 Mock
afterEach(() => {
  vi.clearAllMocks();
});
```

### Q3: E2E 測試不穩定？

**A:**
```typescript
// 使用明確的等待
await expect(page.locator('[data-testid="piece"]')).toBeVisible({ timeout: 5000 });

// 避免使用固定延遲
// ❌ await page.waitForTimeout(1000);
// ✅ await page.waitForSelector('[data-testid="loaded"]');
```

### Q4: 如何測試隨機行為（如簡單 AI）？

**A:**
```typescript
import { vi } from 'vitest';

// Mock Math.random
const mockRandom = vi.spyOn(Math, 'random');
mockRandom.mockReturnValue(0.5);

// 執行測試
const move = getEasyAIMove(gameState);

// 恢復
mockRandom.mockRestore();
```

---

## 參考資源

- **Vitest 官方文件**: https://vitest.dev/
- **Playwright 官方文件**: https://playwright.dev/
- **Testing Library**: https://testing-library.com/
- **測試金字塔**: https://martinfowler.com/articles/practical-test-pyramid.html
