import { test, expect, Page } from '@playwright/test';

// 輔助函數：從儲備區放置棋子到指定格子
async function placePiece(page: Page, color: 'red' | 'blue', size: 'small' | 'medium' | 'large', row: number, col: number): Promise<void> {
  await page.click(`[data-testid="reserve-${color}-${size}"]`);
  await page.click(`[data-testid="cell-${row}-${col}"]`);
}

test.describe('本機雙人對戰', () => {
  test.beforeEach(async ({ page }) => {
    // 清除 localStorage 避免殘留狀態
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('應該能進入本機雙人遊戲頁面', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="link-local"]');
    await expect(page).toHaveURL('/local');
    await expect(page.locator('text=紅方回合')).toBeVisible();
  });

  test('應該能完成一局遊戲（紅方獲勝）', async ({ page }) => {
    await page.goto('/local');

    // 紅方下棋：放置 small 到 (0,0)
    await placePiece(page, 'red', 'small', 0, 0);
    await expect(page.locator('text=藍方回合')).toBeVisible();

    // 藍方下棋：放置 small 到 (1,0)
    await placePiece(page, 'blue', 'small', 1, 0);
    await expect(page.locator('text=紅方回合')).toBeVisible();

    // 紅方下棋：放置 small 到 (0,1)
    await placePiece(page, 'red', 'small', 0, 1);

    // 藍方下棋：放置 small 到 (1,1)
    await placePiece(page, 'blue', 'small', 1, 1);

    // 紅方下棋：放置 medium 到 (0,2) - 連成一線獲勝
    await placePiece(page, 'red', 'medium', 0, 2);

    // 驗證紅方獲勝
    await expect(page.locator('text=紅方獲勝')).toBeVisible();
  });

  test('應該能完成一局遊戲（藍方獲勝）', async ({ page }) => {
    await page.goto('/local');

    // 紅方下棋：放置 small 到 (0,0)
    await placePiece(page, 'red', 'small', 0, 0);

    // 藍方下棋：放置 small 到 (1,0)
    await placePiece(page, 'blue', 'small', 1, 0);

    // 紅方下棋：放置 small 到 (2,2)
    await placePiece(page, 'red', 'small', 2, 2);

    // 藍方下棋：放置 small 到 (1,1)
    await placePiece(page, 'blue', 'small', 1, 1);

    // 紅方下棋：放置 medium 到 (2,0)
    await placePiece(page, 'red', 'medium', 2, 0);

    // 藍方下棋：放置 medium 到 (1,2) - 連成一線獲勝
    await placePiece(page, 'blue', 'medium', 1, 2);

    // 驗證藍方獲勝
    await expect(page.locator('text=藍方獲勝')).toBeVisible();
  });

  test('點擊重新開始後棋盤應該清空', async ({ page }) => {
    await page.goto('/local');

    // 下一步棋
    await placePiece(page, 'red', 'small', 0, 0);

    // 點擊重新開始
    await page.click('[data-testid="restart-button"]');

    // 驗證回到紅方回合（初始狀態）
    await expect(page.locator('text=紅方回合')).toBeVisible();

    // 驗證儲備區棋子數量恢復（紅方小棋子應該顯示 2）
    const redSmallPiece = page.locator('[data-testid="reserve-red-small"]');
    await expect(redSmallPiece).toContainText('2');
  });

  test('重新整理後應該恢復遊戲狀態', async ({ page }) => {
    await page.goto('/local');

    // 下幾步棋
    await placePiece(page, 'red', 'small', 0, 0);
    await placePiece(page, 'blue', 'small', 1, 1);

    // 重新整理頁面
    await page.reload();

    // 驗證遊戲狀態保留（現在應該是紅方回合）
    await expect(page.locator('text=紅方回合')).toBeVisible();

    // 驗證儲備區棋子數量正確（紅方小棋子應該顯示 1）
    const redSmallPiece = page.locator('[data-testid="reserve-red-small"]');
    await expect(redSmallPiece).toContainText('1');
  });

  test('大棋子應該能吃小棋子', async ({ page }) => {
    await page.goto('/local');

    // 紅方放置 small 到 (1,1)
    await placePiece(page, 'red', 'small', 1, 1);

    // 藍方用 large 吃掉紅方的 small
    await placePiece(page, 'blue', 'large', 1, 1);

    // 驗證輪到紅方（表示藍方成功下棋）
    await expect(page.locator('text=紅方回合')).toBeVisible();

    // 驗證藍方 large 數量減少
    const blueLargePiece = page.locator('[data-testid="reserve-blue-large"]');
    await expect(blueLargePiece).toContainText('1');
  });
});
