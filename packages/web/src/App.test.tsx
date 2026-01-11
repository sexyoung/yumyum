import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AppRoutes from './AppRoutes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 建立一個 QueryClient 實例
const queryClient = new QueryClient();

// 建立一個渲染輔助函數，自動包含所有 providers
const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[route]}
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('App 路由測試', () => {

  it('應該在根路徑渲染首頁', async () => {
    renderWithProviders(<AppRoutes />);

    // 使用 findByText 等待 lazy loading 完成
    expect(await screen.findByText('啊呣啊呣')).toBeInTheDocument();

    const expectedLinks = ['對戰電腦', '本機雙人', '線上雙人'];
    for (const linkName of expectedLinks) {
      expect(await screen.findByRole('link', { name: new RegExp(linkName, 'i') })).toBeInTheDocument();
    }
  });

  it('點擊對戰電腦連結應該導航到 AI 遊戲頁面', async () => {
    renderWithProviders(<AppRoutes />);

    // 等待首頁載入完成
    const aiLink = await screen.findByRole('link', { name: /對戰電腦/i });
    fireEvent.click(aiLink);

    // AI 遊戲頁面顯示「你的回合」（玩家先手）
    expect(await screen.findByText('你的回合')).toBeInTheDocument();
  });

  it('點擊本機雙人連結應該導航到本機雙人遊戲頁面', async () => {
    renderWithProviders(<AppRoutes />);

    // 等待首頁載入完成
    const localLink = await screen.findByRole('link', { name: /本機雙人/i });
    fireEvent.click(localLink);

    // 新的 UI 不顯示標題，改為檢查回合提示
    expect(await screen.findByText(/紅方.*回合|藍方.*回合/)).toBeInTheDocument();
  });

  it('點擊線上雙人連結應該導航到線上雙人對戰頁面', async () => {
    renderWithProviders(<AppRoutes />);

    // 等待首頁載入完成
    const onlineLink = await screen.findByRole('link', { name: /線上雙人/i });
    fireEvent.click(onlineLink);

    expect(await screen.findByText('線上雙人對戰')).toBeInTheDocument();
  });
});
