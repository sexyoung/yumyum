import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    <div className="h-[100dvh] bg-gradient-to-br from-orange-400 to-red-500 flex flex-col">
      {/* 頂部資訊 */}
      <div className="flex-none px-3 pt-3">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
            >
              離開
            </button>
            {gameState.winner ? (
              <p className={`text-base md:text-xl font-bold ${gameState.winner === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
                {gameState.winner === 'red' ? '紅方獲勝！' : '藍方獲勝！'}
              </p>
            ) : (
              <p className={`text-base md:text-xl font-bold ${gameState.currentPlayer === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
                {gameState.currentPlayer === 'red' ? '紅方' : '藍方'}回合
              </p>
            )}
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

      {/* 紅方儲備區 - 頂部 */}
      <div className="flex-none p-3 flex justify-center">
        <div className="bg-white rounded-lg shadow-lg p-3">
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
      </div>

      {/* 棋盤 - 中間置中 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-3">
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
      </div>

      {/* 藍方儲備區 - 底部 */}
      <div className="flex-none p-3 flex justify-center">
        <div className="bg-white rounded-lg shadow-lg p-3">
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
    </div>
  );
}
