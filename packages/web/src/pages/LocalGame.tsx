import { useState, useEffect } from 'react';
import { GameState, PieceSize, PieceColor } from '@yumyum/types';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';
import {
  canPlacePieceFromReserve,
  canMovePieceOnBoard,
  placePieceFromReserve as executePlacePiece,
  movePieceOnBoard as executeMovePiece,
} from '../lib/gameLogic';
import {
  saveLocalGameState,
  loadLocalGameState,
  clearLocalGameState,
} from '../lib/storage';

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
  const [gameState, setGameState] = useState<GameState>(() => {
    // 初始化時嘗試載入保存的狀態
    return loadLocalGameState() || initialGameState;
  });
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // 點擊儲備區棋子
  const handlePieceClick = (color: PieceColor, size: PieceSize) => {
    // 遊戲已結束，不允許操作
    if (gameState.winner) {
      return;
    }

    // 只能選擇當前玩家的棋子
    if (color !== gameState.currentPlayer) {
      return;
    }

    // 檢查是否還有剩餘棋子
    if (gameState.reserves[color][size] === 0) {
      return;
    }

    // 如果已經選中同一個棋子，則取消選擇
    if (
      selectedPiece?.type === 'reserve' &&
      selectedPiece.color === color &&
      selectedPiece.size === size
    ) {
      setSelectedPiece(null);
      return;
    }

    // 選中棋子
    setSelectedPiece({
      type: 'reserve',
      color,
      size,
    });
  };

  // 點擊棋盤格子
  const handleCellClick = (row: number, col: number) => {
    // 遊戲已結束，不允許操作
    if (gameState.winner) {
      return;
    }

    if (!selectedPiece) {
      // 沒有選中棋子，嘗試選中格子上的棋子
      const cell = gameState.board[row][col];
      if (cell.pieces.length > 0) {
        const topPiece = cell.pieces[cell.pieces.length - 1];
        // 只能選擇當前玩家的棋子
        if (topPiece.color === gameState.currentPlayer) {
          setSelectedPiece({
            type: 'board',
            row,
            col,
          });
        }
      }
      return;
    }

    // 有選中棋子，執行放置或移動
    if (selectedPiece.type === 'reserve') {
      // 從儲備區放置棋子
      placePieceFromReserve(row, col, selectedPiece.color, selectedPiece.size);
    } else {
      // 從棋盤移動棋子
      movePieceOnBoard(selectedPiece.row, selectedPiece.col, row, col);
    }
  };

  // 從儲備區放置棋子到棋盤
  const placePieceFromReserve = (row: number, col: number, color: PieceColor, size: PieceSize) => {
    // 驗證移動是否合法
    const validation = canPlacePieceFromReserve(gameState, row, col, color, size);

    if (!validation.valid) {
      // 顯示錯誤訊息
      setErrorMessage(validation.error || '無法放置');
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }

    // 執行放置
    const newGameState = executePlacePiece(gameState, row, col, color, size);
    setGameState(newGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  // 在棋盤上移動棋子
  const movePieceOnBoard = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    // 驗證移動是否合法
    const validation = canMovePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol);

    if (!validation.valid) {
      // 顯示錯誤訊息
      setErrorMessage(validation.error || '無法移動');
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }

    // 執行移動
    const newGameState = executeMovePiece(gameState, fromRow, fromCol, toRow, toCol);
    setGameState(newGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  // 重新開始遊戲
  const handleRestart = () => {
    setGameState(initialGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {/* 標題 - 不使用 fixed，改用 flex-none */}
      <div className="flex-none p-2 md:p-4 bg-white shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold flex-1 text-center">本機雙人遊戲</h1>
          <button
            onClick={handleRestart}
            className="px-3 py-1 md:px-4 md:py-2 text-sm md:text-base bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            data-testid="restart-button"
          >
            重新開始
          </button>
        </div>

        {/* 勝利訊息 */}
        {gameState.winner ? (
          <p className="text-center text-base md:text-xl font-bold mt-1 md:mt-2">
            <span className={gameState.winner === 'red' ? 'text-red-600' : 'text-blue-600'}>
              {gameState.winner === 'red' ? '🎉 紅方獲勝！' : '🎉 藍方獲勝！'}
            </span>
          </p>
        ) : (
          <p className="text-center text-sm md:text-base text-gray-600 mt-0.5 md:mt-1">
            當前回合：
            <span className={`font-bold ${gameState.currentPlayer === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
              {gameState.currentPlayer === 'red' ? '紅方' : '藍方'}
            </span>
          </p>
        )}

        {/* 錯誤訊息 */}
        {errorMessage && (
          <p className="text-center text-sm text-red-600 mt-1 font-semibold">
            ⚠️ {errorMessage}
          </p>
        )}
      </div>

      {/* 遊戲區域 - 使用 flex-1 佔滿剩餘空間 */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-between md:justify-center overflow-hidden">
        {/* 手機佈局：垂直排列，紅方頂部、藍方底部 */}
        {/* 桌機佈局：水平排列 */}

        {/* 紅方儲備區（手機：頂部，桌機：左側） */}
        <div className="flex-none h-28 md:h-auto flex items-center justify-center px-2 md:p-4">
          <PlayerReserve
            color="red"
            reserves={gameState.reserves.red}
            onPieceClick={(size) => handlePieceClick('red', size)}
            selectedSize={
              selectedPiece?.type === 'reserve' && selectedPiece.color === 'red'
                ? selectedPiece.size
                : null
            }
          />
        </div>

        {/* 棋盤（手機：中間填滿，桌機：中間） */}
        <div className="flex-1 flex items-center justify-center md:flex-none">
          <Board
            board={gameState.board}
            onCellClick={handleCellClick}
            selectedCell={
              selectedPiece?.type === 'board'
                ? { row: selectedPiece.row, col: selectedPiece.col }
                : null
            }
          />
        </div>

        {/* 藍方儲備區（手機：底部，桌機：右側） */}
        <div className="flex-none h-28 md:h-auto flex items-center justify-center px-2 md:p-4">
          <PlayerReserve
            color="blue"
            reserves={gameState.reserves.blue}
            onPieceClick={(size) => handlePieceClick('blue', size)}
            selectedSize={
              selectedPiece?.type === 'reserve' && selectedPiece.color === 'blue'
                ? selectedPiece.size
                : null
            }
          />
        </div>
      </div>

      {/* 除錯資訊（開發時使用） - 手機版隱藏 */}
      <div className="hidden md:block fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded max-w-xs">
        <p>棋盤: {gameState.board.flat().filter(cell => cell.pieces.length > 0).length} 個棋子</p>
        <p>紅方剩餘: {Object.values(gameState.reserves.red).reduce((a, b) => a + b, 0)} 個</p>
        <p>藍方剩餘: {Object.values(gameState.reserves.blue).reduce((a, b) => a + b, 0)} 個</p>
        {selectedPiece && (
          <p className="mt-1 text-yellow-300">
            選中: {selectedPiece.type === 'reserve'
              ? `${selectedPiece.color} ${selectedPiece.size}`
              : `棋盤 (${selectedPiece.row},${selectedPiece.col})`}
          </p>
        )}
      </div>
    </div>
  );
}
