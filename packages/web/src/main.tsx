import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import './i18n';
import { initializeGA } from './lib/analytics';

// 延遲初始化 Google Analytics，避免阻擋首屏渲染
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => initializeGA());
  } else {
    setTimeout(() => initializeGA(), 0);
  }
}

// 建立 QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div className="min-h-dvh bg-gradient-to-br from-purple-600 to-blue-500" />}>
          <App />
        </Suspense>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
