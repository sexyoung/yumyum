import { test, expect, Page } from '@playwright/test';

// Helper: 設定暱稱（首次進入線上大廳時需要）
async function setNickname(page: Page, nickname: string = '測試玩家') {
  // 等待暱稱 Modal 出現
  const nicknameModal = page.locator('text=設定暱稱');
  if (await nicknameModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.fill('#nickname', nickname);
    await page.click('button:has-text("確定")');
    // 等待 Modal 消失
    await expect(nicknameModal).not.toBeVisible({ timeout: 5000 });
  }
}

test.describe('線上對戰 - 暱稱設定', () => {
  test.beforeEach(async ({ page }) => {
    // 清空 localStorage 確保每次測試都是全新狀態
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('首次進入線上大廳應該顯示暱稱設定 Modal', async ({ page }) => {
    await page.goto('/online');

    // 應該顯示暱稱設定 Modal
    await expect(page.locator('text=設定暱稱')).toBeVisible();
    await expect(page.locator('text=請輸入你的暱稱')).toBeVisible();
    await expect(page.locator('#nickname')).toBeVisible();
  });

  test('暱稱太短應該顯示錯誤', async ({ page }) => {
    await page.goto('/online');

    // 輸入 1 個字元
    await page.fill('#nickname', 'A');

    // 確定按鈕應該被禁用
    const submitButton = page.locator('button:has-text("確定")');
    await expect(submitButton).toBeDisabled();
  });

  test('設定暱稱後應該能看到玩家資訊', async ({ page }) => {
    await page.goto('/online');

    // 設定暱稱
    await page.fill('#nickname', '好吃棋大師');
    await page.click('button:has-text("確定")');

    // 等待 Modal 消失，並顯示大廳
    await expect(page.locator('text=設定暱稱')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=線上雙人對戰')).toBeVisible();

    // 應該顯示 ELO 等資訊
    await expect(page.locator('text=ELO:')).toBeVisible();
  });
});

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

    // 先設定暱稱
    await setNickname(page);

    // 創建房間按鈕
    await expect(page.locator('text=創建新房間')).toBeVisible();

    // 加入房間輸入框
    await expect(page.locator('input[placeholder="例如：ABCD"]')).toBeVisible();

    // 加入房間按鈕
    await expect(page.locator('text=加入房間')).toBeVisible();

    // 排行榜按鈕
    await expect(page.locator('text=排行榜')).toBeVisible();

    // 返回首頁按鈕
    await expect(page.locator('text=返回首頁')).toBeVisible();
  });

  test('輸入房間 ID 後應該能點擊加入房間', async ({ page }) => {
    await page.goto('/online');

    // 先設定暱稱
    await setNickname(page);

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

    // 先設定暱稱
    await setNickname(page);

    await page.click('text=返回首頁');
    await expect(page).toHaveURL('/');
  });

  test('點擊排行榜應該進入排行榜頁面', async ({ page }) => {
    await page.goto('/online');

    // 先設定暱稱
    await setNickname(page);

    await page.click('text=排行榜');
    await expect(page).toHaveURL('/leaderboard');
    await expect(page.locator('h1:has-text("排行榜")')).toBeVisible();
  });

  test('可以修改暱稱', async ({ page }) => {
    await page.goto('/online');

    // 先設定暱稱
    await setNickname(page, '原本的名字');

    // 點擊修改暱稱
    await page.click('text=修改暱稱');

    // 應該顯示修改暱稱 Modal
    await expect(page.locator('text=修改暱稱').first()).toBeVisible();
  });
});

test.describe('排行榜', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('應該能直接進入排行榜頁面', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.locator('h1:has-text("排行榜")')).toBeVisible();
  });

  test('排行榜應該有時段切換', async ({ page }) => {
    await page.goto('/leaderboard');

    // 應該有四個時段按鈕
    await expect(page.locator('button:has-text("日榜")')).toBeVisible();
    await expect(page.locator('button:has-text("週榜")')).toBeVisible();
    await expect(page.locator('button:has-text("月榜")')).toBeVisible();
    await expect(page.locator('button:has-text("總榜")')).toBeVisible();
  });

  test('點擊返回大廳應該回到線上大廳', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.click('text=返回大廳');
    await expect(page).toHaveURL('/online');
  });

  test('可以切換排行榜時段', async ({ page }) => {
    await page.goto('/leaderboard');

    // 預設應該是總榜（有特殊樣式）
    const allTimeButton = page.locator('button:has-text("總榜")');
    await expect(allTimeButton).toHaveClass(/bg-white/);

    // 點擊日榜
    await page.click('button:has-text("日榜")');
    const dailyButton = page.locator('button:has-text("日榜")');
    await expect(dailyButton).toHaveClass(/bg-white/);
  });
});

// 需要後端服務的測試（暫時跳過）
test.describe('線上對戰（需要後端服務）', () => {
  // 這些測試需要 game-service 運行中
  // 執行前請確保：npm run dev:game

  test.skip('創建房間後應該顯示房間 ID', async ({ page }) => {
    await page.goto('/online');

    // 先設定暱稱
    await setNickname(page);

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
    await setNickname(player1, '玩家一');
    await player1.click('text=創建新房間');
    await player1.waitForURL(/\/online\/game\/[A-Z0-9]+/);

    // 從 URL 取得房間 ID
    const url = player1.url();
    const roomId = url.split('/').pop();

    // Player 2 加入房間
    await player2.goto('/online');
    await setNickname(player2, '玩家二');
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
