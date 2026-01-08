import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',  // 失敗時錄製影片
    screenshot: 'only-on-failure',  // 失敗時截圖
  },
  projects: [
    {
      name: 'Desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },  // iPhone 14 尺寸
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -w @yumyum/web',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
