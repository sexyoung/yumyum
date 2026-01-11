import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GameState, PieceSize, PieceColor } from '@yumyum/types';
import Shepherd from 'shepherd.js';
import type { Tour } from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';
import SEO from '../components/SEO';
import { trackTutorialProgress } from '../lib/analytics';

// 選擇狀態類型
type SelectedPiece = {
  type: 'reserve';
  color: PieceColor;
  size: PieceSize;
} | null;

// 初始遊戲狀態
const initialGameState: GameState = {
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
};

// 展示獲勝狀態
const winningGameState: GameState = {
  board: [
    [{ pieces: [{ color: 'red', size: 'large' }] }, { pieces: [{ color: 'blue', size: 'small' }] }, { pieces: [{ color: 'red', size: 'medium' }] }],
    [{ pieces: [] }, { pieces: [{ color: 'red', size: 'medium' }] }, { pieces: [] }],
    [{ pieces: [{ color: 'blue', size: 'medium' }] }, { pieces: [] }, { pieces: [{ color: 'red', size: 'small' }] }],
  ],
  reserves: {
    red: { small: 1, medium: 0, large: 1 },
    blue: { small: 1, medium: 1, large: 2 },
  },
  currentPlayer: 'blue',
  winner: 'red',
};

export default function Tutorial() {
  const navigate = useNavigate();
  const { t } = useTranslation(['tutorial', 'common']);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const tourRef = useRef<Tour | null>(null);
  const isInitialized = useRef(false);

  // 建立教學步驟（只建立一次）
  const tutorialSteps = useMemo(() => [
    {
      id: 'welcome',
      text: t('tutorial:steps.welcome'),
    },
    {
      id: 'board',
      attachTo: { element: '[data-testid="cell-1-1"]', on: 'bottom' as const },
      text: t('tutorial:steps.board'),
    },
    {
      id: 'reserves',
      attachTo: { element: '[data-testid="reserve-red-medium"]', on: 'top' as const },
      text: t('tutorial:steps.reserves'),
    },
    {
      id: 'select-piece',
      attachTo: { element: '[data-testid="reserve-red-medium"]', on: 'top' as const },
      text: t('tutorial:steps.selectPiece'),
    },
    {
      id: 'place-piece',
      attachTo: { element: '[data-testid="cell-1-1"]', on: 'bottom' as const },
      text: t('tutorial:steps.placePiece'),
    },
    {
      id: 'blue-turn',
      attachTo: { element: '[data-testid="reserve-blue-small"]', on: 'bottom' as const },
      text: t('tutorial:steps.blueTurn'),
    },
    {
      id: 'blue-place',
      attachTo: { element: '[data-testid="cell-0-0"]', on: 'bottom' as const },
      text: t('tutorial:steps.bluePlace'),
    },
    {
      id: 'capture-intro',
      attachTo: { element: '[data-testid="reserve-red-large"]', on: 'top' as const },
      text: t('tutorial:steps.captureIntro'),
    },
    {
      id: 'capture-demo',
      attachTo: { element: '[data-testid="cell-0-0"]', on: 'bottom' as const },
      text: t('tutorial:steps.captureDemo'),
    },
    {
      id: 'move-piece',
      attachTo: { element: '[data-testid="cell-0-0"]', on: 'bottom' as const },
      text: t('tutorial:steps.movePiece'),
    },
    {
      id: 'move-demo',
      attachTo: { element: '[data-testid="cell-2-2"]', on: 'top' as const },
      text: t('tutorial:steps.moveDemo'),
    },
    {
      id: 'winning',
      classes: 'shepherd-top',
      text: t('tutorial:steps.winning'),
    },
    {
      id: 'complete',
      text: t('tutorial:steps.complete'),
    },
  ], [t]);

  // 步驟對應的遊戲狀態更新
  const updateGameStateForStep = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
      case 'board':
      case 'reserves':
        setGameState(initialGameState);
        setSelectedPiece(null);
        break;
      case 'select-piece':
        setGameState(initialGameState);
        setTimeout(() => {
          setSelectedPiece({ type: 'reserve', color: 'red', size: 'medium' });
        }, 300);
        break;
      case 'place-piece':
        setTimeout(() => {
          setGameState({
            ...initialGameState,
            board: [
              [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [{ color: 'red', size: 'medium' }] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
            ],
            reserves: {
              ...initialGameState.reserves,
              red: { ...initialGameState.reserves.red, medium: 1 },
            },
            currentPlayer: 'blue',
          });
          setSelectedPiece(null);
        }, 300);
        break;
      case 'blue-turn':
        setTimeout(() => {
          setSelectedPiece({ type: 'reserve', color: 'blue', size: 'small' });
        }, 300);
        break;
      case 'blue-place':
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            board: [
              [{ pieces: [{ color: 'blue', size: 'small' }] }, { pieces: [] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [{ color: 'red', size: 'medium' }] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
            ],
            reserves: {
              ...prev.reserves,
              blue: { ...prev.reserves.blue, small: 1 },
            },
            currentPlayer: 'red',
          }));
          setSelectedPiece(null);
        }, 300);
        break;
      case 'capture-intro':
        setTimeout(() => {
          setSelectedPiece({ type: 'reserve', color: 'red', size: 'large' });
        }, 300);
        break;
      case 'capture-demo':
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            board: [
              [{ pieces: [{ color: 'blue', size: 'small' }, { color: 'red', size: 'large' }] }, { pieces: [] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [{ color: 'red', size: 'medium' }] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
            ],
            reserves: {
              ...prev.reserves,
              red: { ...prev.reserves.red, large: 1 },
            },
            currentPlayer: 'blue',
          }));
          setSelectedPiece(null);
        }, 300);
        break;
      case 'move-piece':
        // 維持 capture-demo 的狀態，只是說明可以移動
        break;
      case 'move-demo':
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            board: [
              [{ pieces: [{ color: 'blue', size: 'small' }] }, { pieces: [] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [{ color: 'red', size: 'medium' }] }, { pieces: [] }],
              [{ pieces: [] }, { pieces: [] }, { pieces: [{ color: 'red', size: 'large' }] }],
            ],
            currentPlayer: 'red',
          }));
          setSelectedPiece(null);
        }, 300);
        break;
      case 'winning':
        setGameState(winningGameState);
        setSelectedPiece(null);
        break;
      case 'complete':
        // 最後一步，不需要額外動作
        break;
    }
  };

  // 初始化並啟動教學
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shadow-xl rounded-lg',
        scrollTo: false,
        cancelIcon: { enabled: true },
      },
    });

    tutorialSteps.forEach((step, index) => {
      const isLastStep = index === tutorialSteps.length - 1;
      tour.addStep({
        id: step.id,
        text: step.text,
        attachTo: step.attachTo,
        classes: step.classes,
        buttons: isLastStep
          ? [
              {
                text: t('tutorial:buttons.prev'),
                action: () => {
                  trackTutorialProgress({ step_id: step.id, step_number: index, action: 'back' });
                  tour.back();
                },
                classes: 'shepherd-button-secondary',
              },
              {
                text: t('common:buttons.backHome'),
                action: () => {
                  trackTutorialProgress({ step_id: step.id, step_number: index, action: 'complete' });
                  tour.cancel();
                  navigate('/');
                },
                classes: 'shepherd-button-primary',
              },
            ]
          : [
              ...(index > 0
                ? [{
                    text: t('tutorial:buttons.prev'),
                    action: () => {
                      trackTutorialProgress({ step_id: step.id, step_number: index, action: 'back' });
                      tour.back();
                    },
                    classes: 'shepherd-button-secondary',
                  }]
                : []),
              {
                text: t('tutorial:buttons.next'),
                action: () => {
                  trackTutorialProgress({ step_id: step.id, step_number: index, action: 'next' });
                  tour.next();
                },
                classes: 'shepherd-button-primary',
              },
            ],
        when: {
          show: () => {
            updateGameStateForStep(step.id);
            if (index === 0) {
              trackTutorialProgress({ step_id: step.id, step_number: index, action: 'start' });
            }
          },
        },
      });
    });

    tour.on('complete', () => {
      // 教學完成，不需要額外動作（最後一步已有按鈕）
    });

    tour.on('cancel', () => {
      trackTutorialProgress({ step_id: 'cancelled', step_number: -1, action: 'skip' });
      navigate('/');
    });

    tourRef.current = tour;

    // 立即啟動教學
    tour.start();

    // 清理：離開頁面時關閉教學並重置狀態
    return () => {
      tour.hide();
      isInitialized.current = false;
    };
  }, [navigate, tutorialSteps, t]);

  // 重新開始教學
  const handleRestart = () => {
    setGameState(initialGameState);
    setSelectedPiece(null);
    tourRef.current?.start();
  };

  return (
    <>
      <SEO titleKey="tutorial.title" descriptionKey="tutorial.description" />
      <div className="h-[100dvh] bg-gradient-to-br from-purple-400 to-indigo-500 flex flex-col overflow-hidden">
      {/* 頂部資訊 */}
      <div className="flex-none px-3 pt-3">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
            >
              {t('common:buttons.leave')}
            </button>
            <p className="text-base md:text-xl lg:text-2xl font-bold text-purple-600">
              {t('tutorial:title')}
            </p>
            <button
              onClick={handleRestart}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
            >
              {t('tutorial:buttons.restart')}
            </button>
          </div>
        </div>
      </div>

      {/* 遊戲區域 */}
      <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center md:gap-6 lg:gap-10">
        {/* 藍方儲備區 */}
        <div className="flex-none p-3 md:p-0 flex justify-center md:order-1">
          <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
            <PlayerReserve
              color="blue"
              reserves={gameState.reserves.blue}
              onPieceClick={() => {}}
              selectedSize={
                selectedPiece?.type === 'reserve' && selectedPiece.color === 'blue'
                  ? selectedPiece.size
                  : null
              }
              canDrag={false}
              disabled={gameState.currentPlayer !== 'blue'}
            />
          </div>
        </div>

        {/* 棋盤 */}
        <div className="flex-1 md:flex-none flex items-center justify-center md:order-2">
          <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
            <Board
              board={gameState.board}
              onCellClick={() => {}}
              selectedCell={null}
              canDrag={false}
              currentPlayer={gameState.currentPlayer}
              winningCells={gameState.winner ? [
                { row: 0, col: 0 },
                { row: 1, col: 1 },
                { row: 2, col: 2 },
              ] : undefined}
            />
          </div>
        </div>

        {/* 紅方儲備區 */}
        <div className="flex-none p-3 md:p-0 flex justify-center md:order-3">
          <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
            <PlayerReserve
              color="red"
              reserves={gameState.reserves.red}
              onPieceClick={() => {}}
              selectedSize={
                selectedPiece?.type === 'reserve' && selectedPiece.color === 'red'
                  ? selectedPiece.size
                  : null
              }
              canDrag={false}
              disabled={gameState.currentPlayer !== 'red'}
            />
          </div>
        </div>
        </div>

      </div>
    </>
  );
}
