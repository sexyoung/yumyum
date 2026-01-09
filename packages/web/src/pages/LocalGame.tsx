import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, PieceSize, PieceColor, MoveRecord } from '@yumyum/types';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';
import GameDndContext from '../components/GameDndContext';
import SoundToggle from '../components/SoundToggle';
import MoveHistory from '../components/MoveHistory';
import { DragData } from '../components/Piece';
import {
  canPlacePieceFromReserve,
  canMovePieceOnBoard,
  placePieceFromReserve as executePlacePiece,
  movePieceOnBoard as executeMovePiece,
  getWinningLine,
} from '../lib/gameLogic';
import { playSound } from '../lib/sounds';
import {
  saveLocalGameState,
  loadLocalGameState,
  clearLocalGameState,
} from '../lib/storage';
import { trackGameStart, trackGameEnd, trackGameRestart } from '../lib/analytics';

// 選擇狀態類型
type SelectedPiece = {
  type: 'reserve'; // 從儲備區選擇
  color: PieceColor;
  size: PieceSize;
} | {
  type: 'board'; // 從棋盤選擇
  row: number;
  col: number;
} | null;

// 初始遊戲狀態：空棋盤，每個玩家各有 2 個小/中/大棋子
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

export default function LocalGame() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>(() => {
    // 初始化時嘗試載入保存的狀態
    return loadLocalGameState() || initialGameState;
  });
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 歷史記錄相關狀態
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(0);

  // 遊戲開始時間（用於計算遊戲時長）
  const [gameStartTime] = useState(() => Date.now());

  // 取得當前顯示的遊戲狀態（遊戲結束或回放模式時根據 replayStep 顯示歷史狀態）
  const showReplay = isReplaying || gameState.winner;
  const displayState = showReplay
    ? (replayStep === 0 ? initialGameState : moveHistory[replayStep - 1]?.gameStateAfter || gameState)
    : gameState;

  // 遊戲開始時追蹤
  useEffect(() => {
    trackGameStart({ game_mode: 'local' });
  }, []);

  // 遊戲結束時，預設顯示最後一步並追蹤
  useEffect(() => {
    if (gameState.winner) {
      setReplayStep(moveHistory.length);
      trackGameEnd({
        game_mode: 'local',
        result: 'win', // 本地遊戲總有人贏
        winner_color: gameState.winner,
        total_moves: moveHistory.length,
        duration_seconds: Math.floor((Date.now() - gameStartTime) / 1000),
      });
    }
  }, [gameState.winner, moveHistory.length, gameStartTime]);

  // 每次遊戲狀態更新時自動保存到 localStorage
  useEffect(() => {
    saveLocalGameState(gameState);
  }, [gameState]);

  // 離開頁面時清空遊戲狀態（但重新整理時不清空）
  useEffect(() => {
    const REFRESH_KEY = 'yumyum:local:isRefreshing';

    // 檢查是否是重新整理（如果有標記，清除它）
    if (sessionStorage.getItem(REFRESH_KEY)) {
      sessionStorage.removeItem(REFRESH_KEY);
    }

    // 重新整理時設置標記
    const handleBeforeUnload = () => {
      sessionStorage.setItem(REFRESH_KEY, 'true');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 組件卸載時，如果不是重新整理就清空遊戲狀態
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!sessionStorage.getItem(REFRESH_KEY)) {
        clearLocalGameState();
      }
    };
  }, []);

  // --- 輔助函數 ---

  // 顯示錯誤訊息並在 2 秒後清除
  const showError = (message: string): void => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 2000);
  };

  // 取得目標格的頂部棋子（如果有）
  const getTopPiece = (row: number, col: number) => {
    const cell = gameState.board[row][col];
    return cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : undefined;
  };

  // 播放適當的音效（根據遊戲結果或移動類型）
  const playSoundForMove = (newGameState: GameState, isCapture: boolean): void => {
    // 移動前的 currentPlayer 是下棋的人
    if (newGameState.winner) {
      playSound(newGameState.winner === gameState.currentPlayer ? 'win' : 'lose');
    } else {
      playSound(isCapture ? 'capture' : 'place');
    }
  };

  // 完成移動後的狀態更新
  const finishMove = (newGameState: GameState, moveRecord: MoveRecord, isCapture: boolean): void => {
    setMoveHistory(prev => [...prev, moveRecord]);
    playSoundForMove(newGameState, isCapture);
    setGameState(newGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  // --- 事件處理 ---

  // 點擊儲備區棋子
  const handlePieceClick = (color: PieceColor, size: PieceSize): void => {
    // 遊戲已結束、不是當前玩家、或沒有剩餘棋子，不允許操作
    if (gameState.winner || color !== gameState.currentPlayer || gameState.reserves[color][size] === 0) {
      return;
    }

    // 如果已經選中同一個棋子，則取消選擇；否則選中棋子
    const isSamePiece = selectedPiece?.type === 'reserve' && selectedPiece.color === color && selectedPiece.size === size;
    setSelectedPiece(isSamePiece ? null : { type: 'reserve', color, size });
  };

  // 點擊棋盤格子
  const handleCellClick = (row: number, col: number): void => {
    // 遊戲已結束，不允許操作
    if (gameState.winner) {
      return;
    }

    // 沒有選中棋子，嘗試選中格子上的棋子
    if (!selectedPiece) {
      const topPiece = getTopPiece(row, col);
      // 只能選擇當前玩家的棋子
      if (topPiece?.color === gameState.currentPlayer) {
        setSelectedPiece({ type: 'board', row, col });
      }
      return;
    }

    // 有選中棋子，執行放置或移動
    if (selectedPiece.type === 'reserve') {
      placePieceFromReserve(row, col, selectedPiece.color, selectedPiece.size);
    } else {
      movePieceOnBoard(selectedPiece.row, selectedPiece.col, row, col);
    }
  };

  // 從儲備區放置棋子到棋盤
  const placePieceFromReserve = (row: number, col: number, color: PieceColor, size: PieceSize): void => {
    // 驗證移動是否合法
    const validation = canPlacePieceFromReserve(gameState, row, col, color, size);
    if (!validation.valid) {
      showError(validation.error || '無法放置');
      return;
    }

    // 判斷是否為吃子（目標格有對手棋子）
    const capturedPiece = getTopPiece(row, col);
    const isCapture = capturedPiece !== undefined;

    // 執行放置
    const newGameState = executePlacePiece(gameState, row, col, color, size);

    // 記錄移動
    const moveRecord: MoveRecord = {
      step: moveHistory.length + 1,
      player: color,
      move: { type: 'place', row, col, size, color },
      capturedPiece,
      gameStateAfter: newGameState,
    };

    finishMove(newGameState, moveRecord, isCapture);
  };

  // 在棋盤上移動棋子
  const movePieceOnBoard = (fromRow: number, fromCol: number, toRow: number, toCol: number): void => {
    // 驗證移動是否合法
    const validation = canMovePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol);
    if (!validation.valid) {
      showError(validation.error || '無法移動');
      return;
    }

    // 取得移動的棋子資訊
    const movingPiece = getTopPiece(fromRow, fromCol)!;

    // 判斷是否為吃子（目標格有對手棋子）
    const capturedPiece = getTopPiece(toRow, toCol);
    const isCapture = capturedPiece !== undefined;

    // 執行移動
    const newGameState = executeMovePiece(gameState, fromRow, fromCol, toRow, toCol);

    // 記錄移動
    const moveRecord: MoveRecord = {
      step: moveHistory.length + 1,
      player: gameState.currentPlayer,
      move: {
        type: 'move',
        fromRow,
        fromCol,
        toRow,
        toCol,
        color: movingPiece.color,
        size: movingPiece.size,
      },
      capturedPiece,
      gameStateAfter: newGameState,
    };

    finishMove(newGameState, moveRecord, isCapture);
  };

  // 處理拖曳放置
  const handleDrop = (row: number, col: number, data: DragData): void => {
    // 遊戲已結束或不是當前玩家的棋子，不允許操作
    if (gameState.winner || data.color !== gameState.currentPlayer) {
      return;
    }

    if (data.type === 'reserve') {
      placePieceFromReserve(row, col, data.color, data.size);
    } else if (data.fromRow !== undefined && data.fromCol !== undefined) {
      movePieceOnBoard(data.fromRow, data.fromCol, row, col);
    }
  };

  // 重新開始遊戲
  const handleRestart = (): void => {
    trackGameRestart('local');
    setGameState(initialGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
    setMoveHistory([]);
    setIsReplaying(false);
    setReplayStep(0);
  };

  // 回放步驟變更
  const handleReplayStepChange = useCallback((step: number) => {
    // 限制步驟範圍
    const clampedStep = Math.max(0, Math.min(step, moveHistory.length));
    setReplayStep(clampedStep);
  }, [moveHistory.length]);

  // 渲染遊戲狀態文字
  function renderGameStatus(): JSX.Element {
    if (isReplaying) {
      return (
        <p className="text-base md:text-xl lg:text-2xl font-bold text-purple-600">
          回放模式 ({replayStep}/{moveHistory.length})
        </p>
      );
    }

    if (displayState.winner) {
      const colorClass = displayState.winner === 'red' ? 'text-red-600' : 'text-blue-600';
      const winnerText = displayState.winner === 'red' ? '紅方獲勝！' : '藍方獲勝！';
      return (
        <p className={`text-base md:text-xl lg:text-2xl font-bold ${colorClass}`}>
          {winnerText}
        </p>
      );
    }

    const colorClass = displayState.currentPlayer === 'red' ? 'text-red-600' : 'text-blue-600';
    const playerText = displayState.currentPlayer === 'red' ? '紅方' : '藍方';
    return (
      <p className={`text-base md:text-xl lg:text-2xl font-bold ${colorClass}`}>
        {playerText}回合
      </p>
    );
  }

  return (
    <GameDndContext onDrop={handleDrop}>
      <div className="h-[100dvh] bg-gradient-to-br from-orange-400 to-red-500 flex flex-col">
        {/* 頂部資訊 */}
        <div className="flex-none px-3 pt-3">
          <div className="bg-white rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                >
                  離開
                </button>
                <SoundToggle />
              </div>
              {renderGameStatus()}
              <button
                onClick={handleRestart}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                data-testid="restart-button"
              >
                重新開始
              </button>
            </div>
            {/* 錯誤訊息 */}
            {errorMessage && (
              <p className="text-center text-sm text-red-600 mt-2 font-semibold">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* 遊戲區域：手機垂直排列，桌機水平排列 */}
        <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center md:gap-6 lg:gap-10">
          {/* 藍方儲備區 - 手機頂部 / 桌機左側（遊戲結束或回放時隱藏） */}
          {!isReplaying && !gameState.winner && (
            <div className="flex-none p-3 md:p-0 flex justify-center md:order-1">
              <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
                <PlayerReserve
                  color="blue"
                  reserves={displayState.reserves.blue}
                  onPieceClick={(size) => handlePieceClick('blue', size)}
                  selectedSize={
                    selectedPiece?.type === 'reserve' && selectedPiece.color === 'blue'
                      ? selectedPiece.size
                      : null
                  }
                  canDrag={!displayState.winner && displayState.currentPlayer === 'blue'}
                  disabled={!displayState.winner && displayState.currentPlayer !== 'blue'}
                />
              </div>
            </div>
          )}

          {/* 棋盤 - 中間 */}
          <div className="flex-1 md:flex-none flex items-center justify-center md:order-2">
            <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
              <Board
                board={displayState.board}
                onCellClick={isReplaying ? undefined : handleCellClick}
                selectedCell={
                  !isReplaying && selectedPiece?.type === 'board'
                    ? { row: selectedPiece.row, col: selectedPiece.col }
                    : null
                }
                canDrag={!isReplaying && !displayState.winner}
                currentPlayer={displayState.currentPlayer}
                winningCells={getWinningLine(displayState)?.cells}
              />
            </div>
          </div>

          {/* 紅方儲備區 - 手機底部 / 桌機右側（遊戲結束或回放時隱藏） */}
          {!isReplaying && !gameState.winner && (
            <div className="flex-none p-3 md:p-0 flex justify-center md:order-3">
              <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
                <PlayerReserve
                  color="red"
                  reserves={displayState.reserves.red}
                  onPieceClick={(size) => handlePieceClick('red', size)}
                  selectedSize={
                    selectedPiece?.type === 'reserve' && selectedPiece.color === 'red'
                      ? selectedPiece.size
                      : null
                  }
                  canDrag={!displayState.winner && displayState.currentPlayer === 'red'}
                  disabled={!displayState.winner && displayState.currentPlayer !== 'red'}
                />
              </div>
            </div>
          )}
        </div>

        {/* 遊戲結束或回放時顯示歷史記錄 - 底部 */}
        {(isReplaying || gameState.winner) && (
          <div className="flex-none p-3 flex justify-center">
            <MoveHistory
              history={moveHistory}
              currentStep={replayStep}
              onStepChange={handleReplayStepChange}
            />
          </div>
        )}
      </div>
    </GameDndContext>
  );
}
