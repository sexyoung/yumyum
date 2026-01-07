import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 建立一個 QueryClient 實例
const queryClient = new QueryClient();

// 建立一個渲染輔助函數，自動包含所有 providers
const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  // 注意: 在 JSDOM 環境中，window.history.pushState 並不直接影響路由，
  // 而是由 MemoryRouter 的 initialEntries 屬性控制。
  // 但 QueryClientProvider 仍然需要被正確提供。
  return render(
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
  );
};

describe('App 路由測試', () => {

  it('應該在根路徑渲染首頁', () => {
    renderWithProviders(<AppRoutes />);
    expect(screen.getByText('YumYum 吞吞棋')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /單人遊戲/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /本機雙人/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /線上雙人/i })).toBeInTheDocument();
  });

  it('點擊單人遊戲連結應該導航到 AI 遊戲頁面', async () => {
    renderWithProviders(<AppRoutes />);

    fireEvent.click(screen.getByRole('link', { name: /單人遊戲/i }));

    expect(await screen.findByText('單人 AI 遊戲')).toBeInTheDocument();
  });

  it('點擊本機雙人連結應該導航到本機雙人遊戲頁面', async () => {
    renderWithProviders(<AppRoutes />);

    fireEvent.click(screen.getByRole('link', { name: /本機雙人/i }));

    expect(await screen.findByText('本機雙人遊戲')).toBeInTheDocument();
  });

  it('點擊線上雙人連結應該導航到線上雙人對戰頁面', async () => {
    renderWithProviders(<AppRoutes />);

    fireEvent.click(screen.getByRole('link', { name: /線上雙人/i }));

    expect(await screen.findByText('線上雙人對戰')).toBeInTheDocument();
  });
});
