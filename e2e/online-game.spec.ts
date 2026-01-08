import { test, expect } from '@playwright/test';

test.describe('線上對戰大廳', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('應該能進入線上對戰大廳', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="link-online"]');
    await expect(page).toHaveURL('/online');
    await expect(page.locator('text=線上雙人對戰')).toBeVisible();
  });

  test('大廳應該顯示創建房間和加入房間選項', async ({ page }) => {
    await page.goto('/online');

    // 創建房間按鈕
    await expect(page.locator('text=創建新房間')).toBeVisible();

    // 加入房間輸入框
    await expect(page.locator('input[placeholder="例如：ABCD"]')).toBeVisible();

    // 加入房間按鈕
    await expect(page.locator('text=加入房間')).toBeVisible();

    // 返回首頁按鈕
    await expect(page.locator('text=返回首頁')).toBeVisible();
  });

  test('輸入房間 ID 後應該能點擊加入房間', async ({ page }) => {
    await page.goto('/online');

    // 加入房間按鈕初始應該是禁用的
    const joinButton = page.locator('button:has-text("加入房間")');
    await expect(joinButton).toBeDisabled();

    // 輸入房間 ID
    await page.fill('input[placeholder="例如：ABCD"]', 'TEST');

    // 加入房間按鈕應該啟用
    await expect(joinButton).toBeEnabled();

    // 點擊加入房間（會跳轉到遊戲頁面）
    await joinButton.click();
    await expect(page).toHaveURL('/online/game/TEST');
  });

  test('點擊返回首頁應該回到首頁', async ({ page }) => {
    await page.goto('/online');
    await page.click('text=返回首頁');
    await expect(page).toHaveURL('/');
  });
});

// 需要後端服務的測試（暫時跳過）
test.describe('線上對戰（需要後端服務）', () => {
  // 這些測試需要 game-service 運行中
  // 執行前請確保：npm run dev:game

  test.skip('創建房間後應該顯示房間 ID', async ({ page }) => {
    await page.goto('/online');
    await page.click('text=創建新房間');

    // 應該跳轉到遊戲頁面並顯示房間 ID
    await expect(page).toHaveURL(/\/online\/game\/[A-Z0-9]+/);
    await expect(page.locator('text=等待對手加入')).toBeVisible();
  });

  test.skip('雙人對戰流程', async ({ browser }) => {
    // 開兩個瀏覽器模擬雙人
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    // Player 1 創建房間
    await player1.goto('/online');
    await player1.click('text=創建新房間');
    await player1.waitForURL(/\/online\/game\/[A-Z0-9]+/);

    // 從 URL 取得房間 ID
    const url = player1.url();
    const roomId = url.split('/').pop();

    // Player 2 加入房間
    await player2.goto('/online');
    await player2.fill('input[placeholder="例如：ABCD"]', roomId!);
    await player2.click('text=加入房間');

    // 雙方都應該看到遊戲開始
    await expect(player1.locator('text=你的回合').or(player1.locator('text=對手回合'))).toBeVisible({ timeout: 10000 });
    await expect(player2.locator('text=你的回合').or(player2.locator('text=對手回合'))).toBeVisible({ timeout: 10000 });

    // 清理
    await context1.close();
    await context2.close();
  });
});
