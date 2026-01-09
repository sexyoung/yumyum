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
import {
  getAIMove,
  AIDifficulty,
} from '../lib/ai';
import { playSound } from '../lib/sounds';
import {
  saveAIGameState,
  loadAIGameState,
  clearAIGameState,
} from '../lib/storage';
import { trackGameStart, trackGameEnd, trackGameRestart } from '../lib/analytics';

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
  const navigate = useNavigate();
  const [difficulty] = useState<AIDifficulty>('hard');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // 歷史記錄相關狀態
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(0);

  // 玩家顏色固定為紅色，AI 為藍色
  const playerColor: PieceColor = 'red';
  const aiColor: PieceColor = 'blue';

  // 遊戲開始時間
  const [gameStartTime] = useState(() => Date.now());

  // 取得當前顯示的遊戲狀態（遊戲結束或回放模式時根據 replayStep 顯示歷史狀態）
  const showReplay = isReplaying || gameState.winner;
  const displayState = showReplay
    ? (replayStep === 0 ? initialGameState : moveHistory[replayStep - 1]?.gameStateAfter || gameState)
    : gameState;

  // 遊戲開始時追蹤
  useEffect(() => {
    trackGameStart({ game_mode: 'ai', difficulty });
  }, [difficulty]);

  // 遊戲結束時，預設顯示最後一步並追蹤
  useEffect(() => {
    if (gameState.winner) {
      setReplayStep(moveHistory.length);
      trackGameEnd({
        game_mode: 'ai',
        result: gameState.winner === playerColor ? 'win' : 'lose',
        winner_color: gameState.winner,
        total_moves: moveHistory.length,
        duration_seconds: Math.floor((Date.now() - gameStartTime) / 1000),
        difficulty,
      });
    }
  }, [gameState.winner, moveHistory.length, gameStartTime, difficulty, playerColor]);

  // 載入保存的遊戲
  useEffect(() => {
    const saved = loadAIGameState();
    if (saved) {
      setGameState(saved.gameState);
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
          let isCapture = false;
          let capturedPiece;

          if (aiMove.type === 'place') {
            // 檢查是否為吃子
            const targetCell = gameState.board[aiMove.row][aiMove.col];
            isCapture = targetCell.pieces.length > 0;
            if (isCapture) {
              capturedPiece = targetCell.pieces[targetCell.pieces.length - 1];
            }
            newState = executePlacePiece(gameState, aiMove.row, aiMove.col, aiColor, aiMove.size);
          } else {
            // 檢查是否為吃子
            const targetCell = gameState.board[aiMove.toRow][aiMove.toCol];
            isCapture = targetCell.pieces.length > 0;
            if (isCapture) {
              capturedPiece = targetCell.pieces[targetCell.pieces.length - 1];
            }
            newState = executeMovePiece(gameState, aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);
          }

          // 記錄 AI 移動
          const fromCell = aiMove.type === 'move'
            ? gameState.board[aiMove.fromRow][aiMove.fromCol]
            : null;
          const pieceSize = aiMove.type === 'place'
            ? aiMove.size
            : fromCell!.pieces[fromCell!.pieces.length - 1].size;

          const moveRecord: MoveRecord = {
            step: moveHistory.length + 1,
            player: aiColor,
            move: {
              ...aiMove,
              color: aiColor,
              size: pieceSize,
            },
            capturedPiece,
            gameStateAfter: newState,
          };
          setMoveHistory(prev => [...prev, moveRecord]);

          // 播放音效
          if (newState.winner) {
            // AI 贏了，玩家聯到失敗音效
            playSound('lose');
          } else {
            playSound(isCapture ? 'capture' : 'place');
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

    const move = { type: 'place' as const, row, col, color, size };
    console.log('Player Move:', JSON.stringify(move));

    // 判斷是否為吃子
    const targetCell = gameState.board[row][col];
    const isCapture = targetCell.pieces.length > 0;
    const capturedPiece = isCapture ? targetCell.pieces[targetCell.pieces.length - 1] : undefined;

    const newGameState = executePlacePiece(gameState, row, col, color, size);

    // 記錄移動
    const moveRecord: MoveRecord = {
      step: moveHistory.length + 1,
      player: color,
      move: { ...move, color, size },
      capturedPiece,
      gameStateAfter: newGameState,
    };
    setMoveHistory(prev => [...prev, moveRecord]);

    // 播放音效
    if (newGameState.winner) {
      playSound('win');
    } else {
      playSound(isCapture ? 'capture' : 'place');
    }

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

    // 取得移動棋子的資訊
    const fromCell = gameState.board[fromRow][fromCol];
    const movingPiece = fromCell.pieces[fromCell.pieces.length - 1];

    const move = { type: 'move' as const, fromRow, fromCol, toRow, toCol };
    console.log('Player Move:', JSON.stringify(move));

    // 判斷是否為吃子
    const targetCell = gameState.board[toRow][toCol];
    const isCapture = targetCell.pieces.length > 0;
    const capturedPiece = isCapture ? targetCell.pieces[targetCell.pieces.length - 1] : undefined;

    const newGameState = executeMovePiece(gameState, fromRow, fromCol, toRow, toCol);

    // 記錄移動
    const moveRecord: MoveRecord = {
      step: moveHistory.length + 1,
      player: playerColor,
      move: { ...move, color: movingPiece.color, size: movingPiece.size },
      capturedPiece,
      gameStateAfter: newGameState,
    };
    setMoveHistory(prev => [...prev, moveRecord]);

    // 播放音效
    if (newGameState.winner) {
      playSound('win');
    } else {
      playSound(isCapture ? 'capture' : 'place');
    }

    setGameState(newGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
  };

  // 處理拖曳放置
  const handleDrop = (row: number, col: number, data: DragData) => {
    // 遊戲已結束或 AI 正在思考，不允許操作
    if (gameState.winner || aiThinking) {
      return;
    }

    // 只能操作玩家的棋子
    if (data.color !== playerColor) {
      return;
    }

    if (data.type === 'reserve') {
      // 從儲備區放置
      placePieceFromReserve(row, col, data.color, data.size);
    } else if (data.fromRow !== undefined && data.fromCol !== undefined) {
      // 從棋盤移動
      movePieceOnBoard(data.fromRow, data.fromCol, row, col);
    }
  };

  // 重新開始
  const handleRestart = () => {
    trackGameRestart('ai');
    setGameState(initialGameState);
    setSelectedPiece(null);
    setErrorMessage(null);
    setMoveHistory([]);
    setIsReplaying(false);
    setReplayStep(0);
    clearAIGameState();
  };

  // 回放步驟變更
  const handleReplayStepChange = useCallback((step: number) => {
    setReplayStep(Math.max(0, Math.min(step, moveHistory.length)));
  }, [moveHistory.length]);

  // 遊戲界面
  return (
    <GameDndContext onDrop={handleDrop}>
      <div className="h-[100dvh] bg-gradient-to-br from-green-400 to-emerald-600 flex flex-col">
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
              {isReplaying ? (
                <p className="text-base md:text-xl lg:text-2xl font-bold text-yellow-600">
                  回放模式 ({replayStep}/{moveHistory.length})
                </p>
              ) : gameState.winner ? (
                <p className={`text-base md:text-xl lg:text-2xl font-bold ${gameState.winner === playerColor ? 'text-red-600' : 'text-blue-600'}`}>
                  {gameState.winner === playerColor ? '你獲勝了！' : 'AI 獲勝了'}
                </p>
              ) : aiThinking ? (
                <p className="text-base md:text-xl lg:text-2xl font-bold text-blue-600">
                  AI 思考中...
                </p>
              ) : (
                <p className={`text-base md:text-xl lg:text-2xl font-bold ${gameState.currentPlayer === playerColor ? 'text-red-600' : 'text-blue-600'}`}>
                  {gameState.currentPlayer === playerColor ? '你的回合' : 'AI 的回合'}
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

        {/* 遊戲區域：手機垂直排列，桌機水平排列 */}
        <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center md:gap-6 lg:gap-10">
          {/* AI 儲備區 - 手機頂部 / 桌機左側（遊戲結束或回放時隱藏） */}
          {!isReplaying && !gameState.winner && (
            <div className="flex-none p-3 md:p-0 flex justify-center md:order-1">
              <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
                <PlayerReserve
                  color={aiColor}
                  reserves={displayState.reserves[aiColor]}
                  selectedSize={null}
                  disabled={true}
                />
              </div>
            </div>
          )}

          {/* 棋盤 - 中間置中 */}
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
                canDrag={!isReplaying && !gameState.winner && !aiThinking && gameState.currentPlayer === playerColor}
                currentPlayer={playerColor}
                winningCells={getWinningLine(displayState)?.cells}
              />
            </div>
          </div>

          {/* 玩家儲備區 - 手機底部 / 桌機右側（遊戲結束或回放時隱藏） */}
          {!isReplaying && !gameState.winner && (
            <div className="flex-none p-3 md:p-0 flex justify-center md:order-3">
              <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
                <PlayerReserve
                  color={playerColor}
                  reserves={displayState.reserves[playerColor]}
                  onPieceClick={(size) => handlePieceClick(playerColor, size)}
                  selectedSize={
                    selectedPiece?.type === 'reserve' && selectedPiece.color === playerColor
                      ? selectedPiece.size
                      : null
                  }
                  canDrag={!gameState.winner && !aiThinking && gameState.currentPlayer === playerColor}
                  disabled={!gameState.winner && (aiThinking || gameState.currentPlayer !== playerColor)}
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
