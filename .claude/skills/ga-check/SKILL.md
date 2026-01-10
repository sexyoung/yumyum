---
name: ga-check
description: 檢查並修復 Google Analytics 追蹤設定。當新增頁面或元件後使用此 skill 確保 GA 追蹤完整。
---

# GA 追蹤檢查

確保所有頁面都有正確的 Google Analytics 追蹤設定。

## 檢查項目

### 1. 頁面追蹤 (PAGE_TITLES)

檔案位置：`packages/web/src/lib/analytics/pageView.ts`

確認每個路由都有對應的標題映射：
```typescript
const PAGE_TITLES: Record<string, string> = {
  '/': '首頁',
  '/local': '本機雙人對戰',
  '/ai': 'AI 對戰',
  '/online': '線上大廳',
  '/tutorial': '遊戲教學',
  '/leaderboard': '排行榜',
  '/about': '關於',
  // 新頁面需要加在這裡
};
```

### 2. 路由設定

檔案位置：`packages/web/src/AppRoutes.tsx`

比對所有 `<Route>` 是否都有對應的 PAGE_TITLES。

### 3. 按鈕追蹤

重要按鈕應該有 `trackButtonClick` 追蹤：
```typescript
import { trackButtonClick } from '../lib/analytics';

onClick={() => trackButtonClick({
  button_name: '按鈕名稱',
  page_location: '/頁面路徑'
})}
```

## 執行步驟

1. 讀取 `AppRoutes.tsx` 取得所有路由
2. 讀取 `pageView.ts` 取得 PAGE_TITLES
3. 比對找出缺少的頁面
4. 自動新增缺少的 PAGE_TITLES 條目
5. 報告結果

## 常見事件追蹤

| 事件 | 函數 | 用途 |
|------|------|------|
| 頁面瀏覽 | `trackPageView` | 自動追蹤（usePageTracking） |
| 按鈕點擊 | `trackButtonClick` | 手動加在 onClick |
| 遊戲開始 | `trackGameStart` | 遊戲頁面 |
| 遊戲結束 | `trackGameEnd` | 遊戲頁面 |
| 錯誤 | `trackError` | 錯誤處理 |
