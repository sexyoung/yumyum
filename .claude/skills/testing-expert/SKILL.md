---
name: testing-expert
description: YumYum 測試專家，精通 Vitest（單元/整合測試）和 Playwright（E2E 測試）。當需要編寫測試、設定測試環境或解決測試問題時使用此 skill。
---

# YumYum 測試專家

## 測試策略

```yaml
單元測試（Vitest）:
  - 遊戲邏輯: ⭐⭐⭐ 必須（≥ 90%）
  - AI 演算法: ⭐⭐⭐ 必須（≥ 80%）
  - localStorage: ⭐⭐ 重要

E2E 測試（Playwright）:
  - 本機雙人: ⭐⭐⭐ 必須
  - AI 對戰: ⭐⭐ 重要
  - 線上對戰: ⭐⭐ 重要
```

## 快速指令

```bash
# 單元測試
npm run test              # 執行所有測試
npm run test:watch        # 監聽模式
npm run test:coverage     # 覆蓋率報告

# E2E 測試
npx playwright test       # 執行所有 E2E
npx playwright test --ui  # UI 模式
```

## 測試檔案位置

```
packages/web/
├── src/
│   ├── lib/
│   │   ├── gameLogic.test.ts  # 遊戲邏輯
│   │   └── ai.test.ts         # AI 測試
│   └── App.test.tsx           # 路由測試
└── tests/e2e/
    ├── local-game.spec.ts     # 本機雙人
    └── online-game.spec.ts    # 線上對戰
```

## 詳細指南

- **Vitest 單元測試**: [references/vitest.md](references/vitest.md)
- **Playwright E2E**: [references/playwright.md](references/playwright.md)

## TDD 流程

```typescript
// 1. Red - 先寫失敗的測試
test('應該允許大棋子覆蓋小棋子', () => {
  expect(canCoverPiece('large', 'small')).toBe(true);
});

// 2. Green - 最簡單的實作
// 3. Refactor - 重構優化
```

## 測試最佳實踐

### AAA 模式

```typescript
test('應該正確應用移動', () => {
  // Arrange
  const gameState = createInitialGameState();
  // Act
  const newState = applyMove(gameState, from, to, 'small');
  // Assert
  expect(newState.board[0][0].pieces).toHaveLength(1);
});
```

### data-testid

```tsx
<div data-testid="cell-0-0" />
await page.click('[data-testid="cell-0-0"]');
```

### Mock

```typescript
vi.mock('./websocket', () => ({
  WebSocketClient: vi.fn(() => ({ connect: vi.fn() })),
}));
```
