import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { getAIMove, AIDifficulty } from '../lib/ai';
import { playSound } from '../lib/sounds';
import {
  saveAIGameState,
  loadAIGameState,
  clearAIGameState,
} from '../lib/storage';
import { trackGameStart, trackGameEnd, trackGameRestart } from '../lib/analytics';
import { initialGameState, SelectedPiece } from '../lib/gameConstants';
import { getTopPiece, getDisplayState, createShowError } from '../lib/gameHelpers';
import SEO from '../components/SEO';

// 玩家顏色固定為紅色，AI 為藍色
const playerColor: PieceColor = 'red';
const aiColor: PieceColor = 'blue';

export default function AIGame() {
  const navigate = useNavigate();
  const { t } = useTranslation(['game', 'common', 'errors']);
  const [difficulty] = useState<AIDifficulty>('hard');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // 歷史記錄相關狀態
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(0);

  // 遊戲開始時間
  const [gameStartTime] = useState(() => Date.now());

  // 取得當前顯示的遊戲狀態（遊戲結束或回放模式時根據 replayStep 顯示歷史狀態）
  const displayState = useMemo(
    () => getDisplayState(gameState, moveHistory, replayStep, isReplaying),
    [gameState, moveHistory, replayStep, isReplaying]
  );

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
  }, [gameState.winner, moveHistory.length, gameStartTime, difficulty]);

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

  // --- 輔助函數 ---

  // 顯示錯誤訊息並在 2 秒後清除
  const showError = useMemo(() => createShowError(setErrorMessage), []);

  // 取得目標格的頂部棋子（如果有）
  const getTopPieceAt = (row: number, col: number) => getTopPiece(gameState.board, row, col);

  // 播放適當的音效（根據遊戲結果或移動類型）
  const playSoundForMove = (newGameState: GameState, isCapture: boolean): void => {
    if (newGameState.winner) {
      playSound(newGameState.winner === playerColor ? 'win' : 'lose');
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

  // --- AI 自動下棋 ---

  // 執行 AI 移動並更新狀態
  const executeAIMove = useCallback(() => {
    const aiMove = getAIMove(gameState, aiColor, difficulty);
    if (!aiMove) {
      setAiThinking(false);
      return;
    }

    console.log('AI Move:', JSON.stringify(aiMove));

    // 根據移動類型取得目標格座標和被吃的棋子
    const targetRow = aiMove.type === 'place' ? aiMove.row : aiMove.toRow;
    const targetCol = aiMove.type === 'place' ? aiMove.col : aiMove.toCol;
    const capturedPiece = getTopPieceAt(targetRow, targetCol);
    const isCapture = capturedPiece !== undefined;

    // 執行移動
    const newState = aiMove.type === 'place'
      ? executePlacePiece(gameState, aiMove.row, aiMove.col, aiColor, aiMove.size)
      : executeMovePiece(gameState, aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);

    // 取得移動棋子的大小
    const pieceSize = aiMove.type === 'place'
      ? aiMove.size
      : getTopPieceAt(aiMove.fromRow, aiMove.fromCol)!.size;

    // 記錄 AI 移動
    const moveRecord: MoveRecord = {
      step: moveHistory.length + 1,
      player: aiColor,
      move: { ...aiMove, color: aiColor, size: pieceSize },
      capturedPiece,
      gameStateAfter: newState,
    };
    setMoveHistory(prev => [...prev, moveRecord]);

    // 播放音效（判斷勝負是誰）
    playSoundForMove(newState, isCapture);
    setGameState(newState);
    setAiThinking(false);
  }, [gameState, difficulty, moveHistory.length]);

  // AI 自動下棋
  useEffect(() => {
    // 檢查是否為 AI 回合且遊戲尚未結束
    const isAITurn = difficulty && gameState.currentPlayer === aiColor && !gameState.winner && !aiThinking;
    if (!isAITurn) return;

    // AI 的回合
    setAiThinking(true);

    // 模擬思考時間（0.5-1 秒）
    const thinkingTime = 500 + Math.random() * 500;
    setTimeout(executeAIMove, thinkingTime);
  }, [gameState, difficulty, aiThinking, executeAIMove]);

  // --- 事件處理 ---

  // 點擊儲備區棋子
  const handlePieceClick = (color: PieceColor, size: PieceSize): void => {
    // 遊戲已結束、AI 正在思考、不是玩家的棋子、或沒有剩餘棋子，不允許操作
    if (gameState.winner || aiThinking || color !== playerColor || gameState.reserves[color][size] === 0) {
      return;
    }

    // 如果已經選中同一個棋子，則取消選擇；否則選中棋子
    const isSamePiece = selectedPiece?.type === 'reserve' && selectedPiece.color === color && selectedPiece.size === size;
    setSelectedPiece(isSamePiece ? null : { type: 'reserve', color, size });
  };

  // 點擊棋盤格子
  const handleCellClick = (row: number, col: number): void => {
    // 遊戲已結束或 AI 正在思考，不允許操作
    if (gameState.winner || aiThinking) {
      return;
    }

    // 沒有選中棋子，嘗試選中格子上的棋子
    if (!selectedPiece) {
      const topPiece = getTopPieceAt(row, col);
      // 只能選擇玩家的棋子
      if (topPiece?.color === playerColor) {
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
      showError(t('errors:game.cannotPlace'));
      return;
    }

    // 判斷是否為吃子（目標格有對手棋子）
    const capturedPiece = getTopPieceAt(row, col);
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
      showError(t('errors:game.cannotMove'));
      return;
    }

    // 取得移動的棋子資訊
    const movingPiece = getTopPieceAt(fromRow, fromCol)!;

    // 判斷是否為吃子（目標格有對手棋子）
    const capturedPiece = getTopPieceAt(toRow, toCol);
    const isCapture = capturedPiece !== undefined;

    // 執行移動
    const newGameState = executeMovePiece(gameState, fromRow, fromCol, toRow, toCol);

    // 記錄移動
    const moveRecord: MoveRecord = {
      step: moveHistory.length + 1,
      player: playerColor,
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
    // 遊戲已結束、AI 正在思考、或不是玩家的棋子，不允許操作
    if (gameState.winner || aiThinking || data.color !== playerColor) {
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
    // 限制步驟範圍
    const clampedStep = Math.max(0, Math.min(step, moveHistory.length));
    setReplayStep(clampedStep);
  }, [moveHistory.length]);

  // 渲染遊戲狀態文字
  function renderGameStatus() {
    if (isReplaying) {
      return (
        <p className="text-base md:text-xl lg:text-2xl font-bold text-yellow-600">
          {t('game:replay.mode')} ({t('game:replay.step', { current: replayStep, total: moveHistory.length })})
        </p>
      );
    }

    if (gameState.winner) {
      const isPlayerWin = gameState.winner === playerColor;
      const colorClass = isPlayerWin ? 'text-red-600' : 'text-blue-600';
      const winnerText = isPlayerWin ? t('game:status.youWin') : t('game:status.aiWins');
      return (
        <p className={`text-base md:text-xl lg:text-2xl font-bold ${colorClass}`}>
          {winnerText}
        </p>
      );
    }

    if (aiThinking) {
      return (
        <p className="text-base md:text-xl lg:text-2xl font-bold text-blue-600">
          {t('game:status.aiThinking')}
        </p>
      );
    }

    const isPlayerTurn = gameState.currentPlayer === playerColor;
    const colorClass = isPlayerTurn ? 'text-red-600' : 'text-blue-600';
    const turnText = isPlayerTurn ? t('game:status.yourTurn') : t('game:status.aiTurn');
    return (
      <p className={`text-base md:text-xl lg:text-2xl font-bold ${colorClass}`}>
        {turnText}
      </p>
    );
  }

  // 遊戲界面
  return (
    <>
      <SEO titleKey="ai.title" descriptionKey="ai.description" />
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
                  {t('common:buttons.leave')}
                </button>
                <SoundToggle />
              </div>
              {renderGameStatus()}
              <button
                onClick={handleRestart}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                data-testid="restart-button"
              >
                {t('common:buttons.restart')}
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
    </>
  );
}
