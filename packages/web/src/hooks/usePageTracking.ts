import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

/**
 * 自動追蹤頁面瀏覽的 Hook
 * 在 App 層級使用一次即可
 */
export const usePageTracking = (): void => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
};
