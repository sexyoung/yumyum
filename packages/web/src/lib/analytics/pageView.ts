import ReactGA from 'react-ga4';
import { ensureInitialized, isDebugMode } from './config';

// 頁面路徑到標題的映射
const PAGE_TITLES: Record<string, string> = {
  '/': '首頁',
  '/local': '本機雙人對戰',
  '/ai': 'AI 對戰',
  '/online': '線上大廳',
  '/tutorial': '遊戲教學',
  '/dev': '開發測試',
};

// 取得頁面標題
const getPageTitle = (path: string): string => {
  // 處理動態路由 /online/game/:roomId
  if (path.startsWith('/online/game/')) {
    return '線上遊戲房間';
  }
  return PAGE_TITLES[path] || '未知頁面';
};

// 發送頁面瀏覽事件
export const trackPageView = (path: string): void => {
  if (!ensureInitialized()) return;

  const pageTitle = getPageTitle(path);

  ReactGA.send({
    hitType: 'pageview',
    page: path,
    title: pageTitle,
  });

  if (isDebugMode()) {
    console.log('[Analytics] Page view:', { path, title: pageTitle });
  }
};
