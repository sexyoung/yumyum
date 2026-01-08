import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import MoveHistory from './MoveHistory';
import type { MoveRecord, GameState } from '@yumyum/types';

// Mock scrollIntoView（jsdom 不支援）
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// 建立測試用的空遊戲狀態
const createEmptyGameState = (): GameState => ({
  board: [
    [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
    [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
    [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
  ],
  reserves: {
    red: { small: 2, medium: 2, large: 2 },
    blue: { small: 2, medium: 2, large: 2 },
  },
  currentPlayer: 'red',
  winner: null,
});

// 建立測試用的移動記錄
const createMockHistory = (steps: number): MoveRecord[] => {
  const history: MoveRecord[] = [];
  for (let i = 1; i <= steps; i++) {
    history.push({
      step: i,
      player: i % 2 === 1 ? 'red' : 'blue',
      move: {
        type: 'place',
        row: 0,
        col: (i - 1) % 3,
        size: 'small',
        color: i % 2 === 1 ? 'red' : 'blue',
      },
      gameStateAfter: createEmptyGameState(),
    });
  }
  return history;
};

describe('MoveHistory 組件', () => {
  it('歷史記錄為空時不渲染任何內容', () => {
    const { container } = render(
      <MoveHistory
        history={[]}
        currentStep={0}
        onStepChange={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('應該渲染第 0 步按鈕', () => {
    const history = createMockHistory(3);
    render(
      <MoveHistory
        history={history}
        currentStep={0}
        onStepChange={() => {}}
      />
    );

    const step0Button = screen.getByRole('button', { name: '0' });
    expect(step0Button).toBeInTheDocument();
    expect(step0Button).toHaveAttribute('data-step', '0');
  });

  it('應該渲染所有歷史步驟', () => {
    const history = createMockHistory(5);
    render(
      <MoveHistory
        history={history}
        currentStep={5}
        onStepChange={() => {}}
      />
    );

    // 第 0 步 + 5 個歷史步驟
    for (let i = 0; i <= 5; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
    }
  });

  it('點擊第 0 步應該呼叫 onStepChange(0)', () => {
    const onStepChange = vi.fn();
    const history = createMockHistory(3);
    render(
      <MoveHistory
        history={history}
        currentStep={3}
        onStepChange={onStepChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '0' }));
    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  it('點擊歷史步驟應該呼叫 onStepChange 並傳入正確步數', () => {
    const onStepChange = vi.fn();
    const history = createMockHistory(5);
    render(
      <MoveHistory
        history={history}
        currentStep={5}
        onStepChange={onStepChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onStepChange).toHaveBeenCalledWith(3);
  });

  it('當前步驟的圈圈應該較大（w-10 h-10）', () => {
    const history = createMockHistory(3);
    render(
      <MoveHistory
        history={history}
        currentStep={2}
        onStepChange={() => {}}
      />
    );

    const currentStepButton = screen.getByRole('button', { name: '2' });
    expect(currentStepButton.className).toContain('w-10');
    expect(currentStepButton.className).toContain('h-10');
  });

  it('非當前步驟的圈圈應該較小（w-8 h-8）', () => {
    const history = createMockHistory(3);
    render(
      <MoveHistory
        history={history}
        currentStep={2}
        onStepChange={() => {}}
      />
    );

    const step1Button = screen.getByRole('button', { name: '1' });
    expect(step1Button.className).toContain('w-8');
    expect(step1Button.className).toContain('h-8');
  });

  it('未來步驟應該半透明（opacity-30）', () => {
    const history = createMockHistory(5);
    render(
      <MoveHistory
        history={history}
        currentStep={2}
        onStepChange={() => {}}
      />
    );

    // 第 3、4、5 步是未來步驟
    const step3Button = screen.getByRole('button', { name: '3' });
    const step4Button = screen.getByRole('button', { name: '4' });
    const step5Button = screen.getByRole('button', { name: '5' });

    expect(step3Button.className).toContain('opacity-30');
    expect(step4Button.className).toContain('opacity-30');
    expect(step5Button.className).toContain('opacity-30');

    // 過去步驟不應該有 opacity-30
    const step1Button = screen.getByRole('button', { name: '1' });
    expect(step1Button.className).not.toContain('opacity-30');
  });

  it('紅方步驟應該使用紅色樣式', () => {
    const history = createMockHistory(2);
    render(
      <MoveHistory
        history={history}
        currentStep={1}
        onStepChange={() => {}}
      />
    );

    // 第 1 步是紅方
    const step1Button = screen.getByRole('button', { name: '1' });
    expect(step1Button.className).toContain('bg-red');
    expect(step1Button.className).toContain('border-red');
  });

  it('藍方步驟應該使用藍色樣式', () => {
    const history = createMockHistory(2);
    render(
      <MoveHistory
        history={history}
        currentStep={2}
        onStepChange={() => {}}
      />
    );

    // 第 2 步是藍方
    const step2Button = screen.getByRole('button', { name: '2' });
    expect(step2Button.className).toContain('bg-blue');
    expect(step2Button.className).toContain('border-blue');
  });

  it('第 0 步為當前步驟時應該高亮', () => {
    const history = createMockHistory(3);
    render(
      <MoveHistory
        history={history}
        currentStep={0}
        onStepChange={() => {}}
      />
    );

    const step0Button = screen.getByRole('button', { name: '0' });
    expect(step0Button.className).toContain('w-10');
    expect(step0Button.className).toContain('h-10');
    expect(step0Button.className).toContain('bg-gray-200');
    expect(step0Button.className).toContain('border-gray-500');
  });

  it('所有步驟按鈕都應該有 data-step 屬性', () => {
    const history = createMockHistory(3);
    render(
      <MoveHistory
        history={history}
        currentStep={3}
        onStepChange={() => {}}
      />
    );

    for (let i = 0; i <= 3; i++) {
      const button = screen.getByRole('button', { name: String(i) });
      expect(button).toHaveAttribute('data-step', String(i));
    }
  });
});
