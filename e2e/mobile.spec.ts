import { test, expect } from '@playwright/test';

// 只在 Mobile project 執行這些測試
test.describe('手機版測試', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile', 'Only run on Mobile project');
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('首頁應該正常顯示', async ({ page }) => {
    await page.goto('/');

    // 標題應該可見
    await expect(page.getByRole('heading', { name: 'YumYum 好吃棋' })).toBeVisible();

    // 三個按鈕應該可見
    const menuLinks = ['link-ai', 'link-local', 'link-online'];
    for (const testId of menuLinks) {
      await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible();
    }
  });

  test('本機雙人遊戲應該能正常遊玩', async ({ page }) => {
    await page.goto('/local');

    // 驗證初始狀態
    await expect(page.locator('text=紅方回合')).toBeVisible();

    // 使用 tap 模擬觸控（手機操作）
    await page.tap('[data-testid="reserve-red-small"]');
    await page.tap('[data-testid="cell-1-1"]');

    // 驗證輪到藍方
    await expect(page.locator('text=藍方回合')).toBeVisible();

    // 藍方下棋
    await page.tap('[data-testid="reserve-blue-small"]');
    await page.tap('[data-testid="cell-0-0"]');

    // 驗證輪到紅方
    await expect(page.locator('text=紅方回合')).toBeVisible();
  });

  test('棋盤和棋子應該有足夠的觸控區域', async ({ page }) => {
    await page.goto('/local');

    // 檢查格子大小（手機版應該至少 96x96 px）
    const cell = page.locator('[data-testid="cell-0-0"]');
    const cellBox = await cell.boundingBox();

    expect(cellBox).not.toBeNull();
    expect(cellBox!.width).toBeGreaterThanOrEqual(96);
    expect(cellBox!.height).toBeGreaterThanOrEqual(96);
  });

  test('AI 對戰應該能正常遊玩', async ({ page }) => {
    await page.goto('/ai');

    // 驗證初始狀態
    await expect(page.locator('text=你的回合')).toBeVisible();

    // 使用 tap 模擬觸控
    await page.tap('[data-testid="reserve-red-medium"]');
    await page.tap('[data-testid="cell-1-1"]');

    // 等待 AI 回應
    await expect(page.locator('text=你的回合')).toBeVisible({ timeout: 5000 });
  });

  test('線上大廳應該正常顯示', async ({ page }) => {
    await page.goto('/online');

    // 標題應該可見
    await expect(page.locator('text=線上雙人對戰')).toBeVisible();

    // 按鈕應該可見且可點擊
    await expect(page.locator('text=創建新房間')).toBeVisible();
    await expect(page.locator('text=加入房間')).toBeVisible();
  });
});
