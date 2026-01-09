import ReactGA from 'react-ga4';

// 檢查 GA 是否啟用
export const isAnalyticsEnabled = (): boolean => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  return !!measurementId && measurementId.startsWith('G-');
};

// 檢查是否為 debug 模式
export const isDebugMode = (): boolean => {
  return import.meta.env.VITE_GA_DEBUG === 'true';
};

// 初始化狀態
let isInitialized = false;

// 初始化 GA4
export const initializeGA = (): void => {
  if (isInitialized) return;

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!isAnalyticsEnabled()) {
    if (isDebugMode()) {
      console.log('[Analytics] GA4 disabled - no measurement ID configured');
    }
    return;
  }

  ReactGA.initialize(measurementId, {
    testMode: isDebugMode(),
    gaOptions: {
      debug_mode: isDebugMode(),
    },
  });

  isInitialized = true;

  if (isDebugMode()) {
    console.log('[Analytics] GA4 initialized with ID:', measurementId);
  }
};

// 確保已初始化（供內部使用）
export const ensureInitialized = (): boolean => {
  if (!isInitialized && isAnalyticsEnabled()) {
    initializeGA();
  }
  return isAnalyticsEnabled();
};
