import { test, expect, Page } from '@playwright/test';

// 輔助函數：玩家放置棋子並等待 AI 回應
async function placePieceAndWaitForAI(
  page: Page,
  size: 'small' | 'medium' | 'large',
  row: number,
  col: number
): Promise<void> {
  await page.click(`[data-testid="reserve-red-${size}"]`);
  await page.click(`[data-testid="cell-${row}-${col}"]`);
  // 等待 AI 思考並輪到玩家
  await expect(page.locator('text=你的回合')).toBeVisible({ timeout: 5000 });
}

// 輔助函數：計算 AI 剩餘棋子總數
async function getAIRemainingPieces(page: Page): Promise<number> {
  const blueSmall = page.locator('[data-testid="reserve-blue-small"]');
  const blueMedium = page.locator('[data-testid="reserve-blue-medium"]');
  const blueLarge = page.locator('[data-testid="reserve-blue-large"]');

  const smallText = await blueSmall.innerText();
  const mediumText = await blueMedium.innerText();
  const largeText = await blueLarge.innerText();

  return parseInt(smallText) + parseInt(mediumText) + parseInt(largeText);
}

test.describe('AI 對戰', () => {
  test.beforeEach(async ({ page }) => {
    // 清除 localStorage 避免殘留狀態
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('應該能進入 AI 對戰頁面', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="link-ai"]');
    await expect(page).toHaveURL('/ai');
    // 玩家是紅方，先手
    await expect(page.locator('text=你的回合')).toBeVisible();
  });

  test('玩家下棋後 AI 應該會回應', async ({ page }) => {
    await page.goto('/ai');

    // 玩家下棋：放置 medium 到中央
    await placePieceAndWaitForAI(page, 'medium', 1, 1);

    // 驗證 AI 已下棋（藍方棋子數量應該減少）
    const totalRemaining = await getAIRemainingPieces(page);
    // AI 應該用掉一個棋子，所以總數應該是 5
    expect(totalRemaining).toBe(5);
  });

  test('重新整理後應該恢復遊戲狀態', async ({ page }) => {
    await page.goto('/ai');

    // 玩家下棋
    await placePieceAndWaitForAI(page, 'small', 0, 0);

    // 重新整理頁面
    await page.reload();

    // 驗證遊戲狀態保留
    await expect(page.locator('text=你的回合')).toBeVisible();

    // 驗證儲備區棋子數量正確
    const redSmallPiece = page.locator('[data-testid="reserve-red-small"]');
    await expect(redSmallPiece).toContainText('1');
  });

  test('點擊重新開始後棋盤應該清空', async ({ page }) => {
    await page.goto('/ai');

    // 玩家下棋
    await placePieceAndWaitForAI(page, 'small', 0, 0);

    // 點擊重新開始
    await page.click('[data-testid="restart-button"]');

    // 驗證回到玩家回合
    await expect(page.locator('text=你的回合')).toBeVisible();

    // 驗證儲備區棋子數量恢復
    const redSmallPiece = page.locator('[data-testid="reserve-red-small"]');
    await expect(redSmallPiece).toContainText('2');
  });

  test('遊戲應該能正常進行多個回合', async ({ page }) => {
    await page.goto('/ai');

    // 第一回合
    await placePieceAndWaitForAI(page, 'small', 0, 0);

    // 第二回合
    await placePieceAndWaitForAI(page, 'small', 2, 2);

    // 驗證玩家棋子數量減少
    const redSmallPiece = page.locator('[data-testid="reserve-red-small"]');
    await expect(redSmallPiece).toContainText('0');
  });
});
