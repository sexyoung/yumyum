# Playwright E2E 測試詳細指南

## 安裝與設定

```bash
npm init playwright@latest
npx playwright install
```

## 配置檔案

**playwright.config.ts：**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 本機雙人測試

```typescript
import { test, expect } from '@playwright/test';

test.describe('本機雙人遊戲', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/local');
  });

  test('應該顯示空棋盤和儲備區', async ({ page }) => {
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-red-reserve"]')).toBeVisible();
    await expect(page.locator('text=紅方回合')).toBeVisible();
  });

  test('應該能完成一局完整遊戲', async ({ page }) => {
    // 紅方下棋
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-0-0"]');
    await expect(page.locator('text=藍方回合')).toBeVisible();

    // 藍方下棋
    await page.click('[data-testid="reserve-blue-small"]');
    await page.click('[data-testid="cell-0-1"]');

    // 繼續直到獲勝...
    await expect(page.locator('text=紅方獲勝')).toBeVisible({ timeout: 1000 });
  });

  test('應該在重新整理後恢復遊戲狀態', async ({ page }) => {
    await page.click('[data-testid="reserve-red-small"]');
    await page.click('[data-testid="cell-0-0"]');

    await page.reload();

    await expect(page.locator('[data-testid="cell-0-0"] [data-testid="piece-red"]')).toBeVisible();
  });
});
```

---

## AI 對戰測試

```typescript
test.describe('AI 對戰', () => {
  test('AI 應該自動回應玩家移動', async ({ page }) => {
    await page.goto('/ai');

    await page.click('[data-testid="reserve-red-medium"]');
    await page.click('[data-testid="cell-1-1"]');

    await expect(page.locator('[data-testid="piece-blue"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=你的回合')).toBeVisible();
  });
});
```

---

## 線上對戰測試（雙瀏覽器）

```typescript
test.describe('線上雙人對戰', () => {
  test('應該能雙人對戰', async ({ browser }) => {
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
    await player2.fill('input[name="roomId"]', roomId!);
    await player2.click('text=加入');

    // Player 1 下棋
    await player1.click('[data-testid="reserve-red-small"]');
    await player1.click('[data-testid="cell-0-0"]');

    // Player 2 看到棋子
    await expect(player2.locator('[data-testid="cell-0-0"] [data-testid="piece-red"]'))
      .toBeVisible({ timeout: 2000 });

    await context1.close();
    await context2.close();
  });
});
```

---

## 手機版測試

```typescript
test.describe('手機版', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });

  test('手機版應該能正常遊玩', async ({ page }) => {
    await page.goto('/local');

    await page.tap('[data-testid="reserve-red-small"]');
    await page.tap('[data-testid="cell-0-0"]');

    await expect(page.locator('[data-testid="cell-0-0"] [data-testid="piece-red"]')).toBeVisible();
  });

  test('棋子應該足夠大方便點擊', async ({ page }) => {
    await page.goto('/local');
    const piece = page.locator('[data-testid="reserve-red-small"]').first();
    const box = await piece.boundingBox();

    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
```

---

## 執行指令

```bash
npx playwright test                    # 執行所有測試
npx playwright test --ui               # UI 模式（推薦）
npx playwright test --headed           # 顯示瀏覽器
npx playwright test --project=chromium # 特定瀏覽器
npx playwright test --debug            # Debug 模式
npx playwright show-report             # 查看報告
```

---

## 常見問題

### 測試不穩定？

```typescript
// ✅ 使用明確的等待
await expect(page.locator('[data-testid="piece"]')).toBeVisible({ timeout: 5000 });

// ❌ 避免固定延遲
await page.waitForTimeout(1000);
```

### 選擇器最佳實踐

```typescript
// ✅ 使用 data-testid
await page.click('[data-testid="cell-0-0"]');

// ❌ 避免依賴 class 或結構
await page.click('.cell-container > div:first-child');
```
