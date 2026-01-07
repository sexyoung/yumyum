# Vitest 單元測試詳細指南

## 安裝與設定

```bash
cd packages/web
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

## 配置檔案

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

afterEach(() => {
  cleanup();
});
```

---

## 遊戲邏輯測試範例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialGameState, validateMove, applyMove, checkWinner } from './gameLogic';

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
    });
  });

  describe('validateMove - 吃子規則', () => {
    beforeEach(() => {
      gameState.board[0][0].pieces = [{ color: 'blue', size: 'small' }];
    });

    it('應該允許大棋子覆蓋小棋子', () => {
      const result = validateMove(gameState, { row: -1, col: 0 }, { row: 0, col: 0 }, 'large');
      expect(result.valid).toBe(true);
    });

    it('應該拒絕同尺寸棋子覆蓋', () => {
      const result = validateMove(gameState, { row: -1, col: 0 }, { row: 0, col: 0 }, 'small');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('只能用大棋子覆蓋小棋子');
    });
  });

  describe('checkWinner', () => {
    it('應該偵測橫向連線', () => {
      gameState.board[0][0].pieces = [{ color: 'red', size: 'large' }];
      gameState.board[0][1].pieces = [{ color: 'red', size: 'medium' }];
      gameState.board[0][2].pieces = [{ color: 'red', size: 'small' }];

      expect(checkWinner(gameState)).toBe('red');
    });

    it('應該只看最上層棋子的顏色', () => {
      gameState.board[0][0].pieces = [
        { color: 'blue', size: 'small' },
        { color: 'red', size: 'large' }
      ];
      // ... 其他格子
      expect(checkWinner(gameState)).toBe('red');
    });
  });
});
```

---

## AI 演算法測試

```typescript
describe('AI 對手（困難模式）', () => {
  it('應該優先選擇獲勝移動', () => {
    gameState.board[0][0].pieces = [{ color: 'blue', size: 'large' }];
    gameState.board[0][1].pieces = [{ color: 'blue', size: 'medium' }];
    gameState.currentPlayer = 'blue';

    const move = getAIMove(gameState, 'hard');
    expect(move?.to).toEqual({ row: 0, col: 2 });
  });

  it('應該在合理時間內返回結果', () => {
    const startTime = Date.now();
    getAIMove(gameState, 'hard');
    expect(Date.now() - startTime).toBeLessThan(3000);
  });
});
```

---

## localStorage 測試

```typescript
describe('localStorage 管理', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('應該能保存和讀取遊戲狀態', () => {
    const gameState = createInitialGameState();
    saveLocalGameState(gameState);
    expect(loadLocalGameState()).toEqual(gameState);
  });

  it('應該處理損壞的 JSON 數據', () => {
    localStorage.setItem('yumyum:local:gameState', 'invalid json');
    expect(loadLocalGameState()).toBeNull();
  });
});
```

---

## React 元件測試

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from './Board';

describe('Board 元件', () => {
  it('應該渲染 9 個格子', () => {
    render(<Board gameState={createInitialGameState()} />);
    const cells = screen.getAllByTestId(/cell-\d-\d/);
    expect(cells).toHaveLength(9);
  });

  it('點擊格子應該觸發 onCellClick', () => {
    const handleClick = vi.fn();
    render(<Board onCellClick={handleClick} />);

    fireEvent.click(screen.getByTestId('cell-0-0'));
    expect(handleClick).toHaveBeenCalledWith(0, 0);
  });
});
```

---

## 執行指令

```bash
npm run test                    # 執行所有測試
npm run test:watch              # 監聽模式
npm run test:ui                 # UI 介面
npm run test:coverage           # 覆蓋率報告
npm run test gameLogic.test.ts  # 特定檔案
npm run test -t "吃子"          # 特定測試名稱
```
