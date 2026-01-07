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
  getAIMove,
  AIDifficulty,
} from '../lib/ai';
import {
  saveAIGameState,
  loadAIGameState,
  clearAIGameState,
} from '../lib/storage';

// 選擇狀態類型
type SelectedPiece = {
  type: 'reserve';
  color: PieceColor;
  size: PieceSize;
} | {
  type: 'board';
  row: number;
  col: number;
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

export default function AIGame() {
  const [difficulty, setDifficulty] = useState<AIDifficulty | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // 玩家顏色固定為紅色，AI 為藍色
  const playerColor: PieceColor = 'red';
  const aiColor: PieceColor = 'blue';

  // 載入保存的遊戲
  useEffect(() => {
    const saved = loadAIGameState();
    if (saved) {
      setGameState(saved.gameState);
      setDifficulty(saved.difficulty);
    }
  }, []);

  // 每次遊戲狀態更新時自動保存
  useEffect(() => {
    if (difficulty) {
      saveAIGameState(gameState, difficulty);
    }
  }, [gameState, difficulty]);

  // 離開頁面時清空遊戲狀態（但重新整理時不清空）
  useEffect(() => {
    const REFRESH_KEY = 'yumyum:ai:isRefreshing';

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
        clearAIGameState();
      }
    };
  }, []);

  // AI 自動下棋
  useEffect(() => {
    if (
      difficulty &&
      gameState.currentPlayer === aiColor &&
      !gameState.winner &&
      !aiThinking
    ) {
      // AI 的回合
      setAiThinking(true);

      // 模擬思考時間（0.5-1 秒）
      const thinkingTime = 500 + Math.random() * 500;

      setTimeout(() => {
        const aiMove = getAIMove(gameState, aiColor, difficulty);

        if (aiMove) {
          console.log('AI Move:', JSON.stringify(aiMove));
          let newState: GameState;
          if (aiMove.type === 'place') {
            newState = executePlacePiece(gameState, aiMove.row, aiMove.col, aiColor, aiMove.size);
          } else {
            newState = executeMovePiece(gameState, aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);
          }
          setGameState(newState);
        }

        setAiThinking(false);
      }, thinkingTime);
    }
  }, [gameState, difficulty, aiThinking, aiColor]);

  // 點擊儲備區棋子
  const handlePieceClick = (color: PieceColor, size: PieceSize) => {
    if (gameState.winner || aiThinking) {
      return;
    }

    // 只能選擇玩家的棋子
    if (color !== playerColor) {
      return;
    }

    if (gameState.reserves[color][size] === 0) {
      return;
    }

    if (
      selectedPiece?.type === 'reserve' &&
      selectedPiece.color === color &&
      selectedPiece.size === size
    ) {
      setSelectedPiece(null);
      return;
    }

    setSelectedPiece({
      type: 'reserve',
      color,
      size,
    });
  };

  // 點擊棋盤格子
  const handleCellClick = (row: number, col: number) => {
    if (gameState.winner || aiThinking) {
      return;
    }

    if (!selectedPiece) {
      const cell = gameState.board[row][col];
      if (cell.pieces.length > 0) {
        const topPiece = cell.pieces[cell.pieces.length - 1];
        if (topPiece.color === playerColor) {
          setSelectedPiece({
            type: 'board',
            row,
            col,
          });
        }
      }
      return;
    }

    if (selectedPiece.type === 'reserve') {
      placePieceFromReserve(row, col, selectedPiece.color, selectedPiece.size);
    } else {
      movePieceOnBoard(selectedPiece.row, selectedPiece.col, row, col);
    }
  };

  // 從儲備區放置棋子到棋盤
  const placePieceFromReserve = (row: number, col: number, color: PieceColor, size: PieceSize) => {
    const validation = canPlacePieceFromReserve(gameState, row, col, color, size);

    if (!validation.valid) {
      setErrorMessage(validation.error || '無法放置');
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }

    const move = { type: 'place', row, col, color, size };
    console.log('Player Move:', JSON.stringify(move));

    const newGameState = executePlacePiece(gameState, row, col, color, size);
    setGameState(newGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  // 在棋盤上移動棋子
  const movePieceOnBoard = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    const validation = canMovePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol);

    if (!validation.valid) {
      setErrorMessage(validation.error || '無法移動');
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }

    const move = { type: 'move', fromRow, fromCol, toRow, toCol, color: playerColor };
    console.log('Player Move:', JSON.stringify(move));

    const newGameState = executeMovePiece(gameState, fromRow, fromCol, toRow, toCol);
    setGameState(newGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  // 開始新遊戲
  const handleNewGame = (selectedDifficulty: AIDifficulty) => {
    setDifficulty(selectedDifficulty);
    setGameState(initialGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
    clearAIGameState();
  };

  // 重新開始
  const handleRestart = () => {
    setDifficulty(null);
    setGameState(initialGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
    clearAIGameState();
  };

  // 難度選擇界面
  if (!difficulty) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl md:text-4xl font-bold mb-8 text-center">單人 AI 遊戲</h1>

        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">選擇難度</h2>

          <div className="space-y-4">
            <button
              onClick={() => handleNewGame('easy')}
              className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg text-lg font-semibold transition-colors"
              data-testid="difficulty-easy"
            >
              簡單
              <p className="text-sm font-normal mt-1">隨機 + 基本策略</p>
            </button>

            <button
              onClick={() => handleNewGame('medium')}
              className="w-full px-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-lg font-semibold transition-colors"
              data-testid="difficulty-medium"
            >
              中等
              <p className="text-sm font-normal mt-1">Minimax 算法（3 層）</p>
            </button>

            <button
              onClick={() => handleNewGame('hard')}
              className="w-full px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-lg font-semibold transition-colors"
              data-testid="difficulty-hard"
            >
              困難
              <p className="text-sm font-normal mt-1">Alpha-Beta 剪枝（5 層）</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 遊戲界面
  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {/* 標題 */}
      <div className="flex-none p-2 md:p-4 bg-white shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold flex-1 text-center">
            單人 AI 遊戲
            <span className="ml-2 text-sm md:text-base font-normal text-gray-600">
              ({difficulty === 'easy' ? '簡單' : difficulty === 'medium' ? '中等' : '困難'})
            </span>
          </h1>
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
            <span className={gameState.winner === playerColor ? 'text-red-600' : 'text-blue-600'}>
              {gameState.winner === playerColor ? '🎉 你獲勝了！' : '😔 AI 獲勝了'}
            </span>
          </p>
        ) : aiThinking ? (
          <p className="text-center text-sm md:text-base text-blue-600 mt-0.5 md:mt-1 font-semibold">
            🤔 AI 思考中...
          </p>
        ) : (
          <p className="text-center text-sm md:text-base text-gray-600 mt-0.5 md:mt-1">
            當前回合：
            <span className={`font-bold ${gameState.currentPlayer === playerColor ? 'text-red-600' : 'text-blue-600'}`}>
              {gameState.currentPlayer === playerColor ? '你的回合' : 'AI 的回合'}
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

      {/* 遊戲區域 */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-between md:justify-center overflow-hidden">
        {/* 玩家儲備區（手機：頂部，桌機：左側） */}
        <div className="flex-none h-28 md:h-auto flex items-center justify-center px-2 md:p-4">
          <PlayerReserve
            color={playerColor}
            reserves={gameState.reserves[playerColor]}
            onPieceClick={(size) => handlePieceClick(playerColor, size)}
            selectedSize={
              selectedPiece?.type === 'reserve' && selectedPiece.color === playerColor
                ? selectedPiece.size
                : null
            }
          />
        </div>

        {/* 棋盤 */}
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

        {/* AI 儲備區（手機：底部，桌機：右側） */}
        <div className="flex-none h-28 md:h-auto flex items-center justify-center px-2 md:p-4">
          <PlayerReserve
            color={aiColor}
            reserves={gameState.reserves[aiColor]}
            selectedSize={null}
          />
        </div>
      </div>
    </div>
  );
}
