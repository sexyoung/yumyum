// packages/web/src/pages/OnlineGame.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import type { GameState, PieceColor, GameMove, MoveRecord, PieceSize } from '@yumyum/types';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';
import GameDndContext from '../components/GameDndContext';
import { DragData } from '../components/Piece';
import SoundToggle from '../components/SoundToggle';
import MoveHistory from '../components/MoveHistory';
import {
  canPlacePieceFromReserve,
  canMovePieceOnBoard,
  placePieceFromReserve,
  movePieceOnBoard,
  getWinningLine,
} from '../lib/gameLogic';
import { playSound } from '../lib/sounds';
import {
  trackGameStart,
  trackGameEnd,
  trackRoomJoin,
  trackRematchRequest,
  trackEmojiSend,
  trackError,
} from '../lib/analytics';
import { getPlayerIdentity } from '../lib/storage';
import { initialGameState } from '../lib/gameConstants';
import { getTopPiece } from '../lib/gameHelpers';

type GamePhase = 'connecting' | 'waiting' | 'playing' | 'finished' | 'opponent_left' | 'error';

// Emoji 狀態類型
type EmojiState = { emoji: string; key: number; x: number } | null;

function OnlineGame() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  // 從 localStorage 取得玩家身份
  const playerIdentity = getPlayerIdentity();
  const [playerName] = useState(() => playerIdentity?.username || `玩家${Math.floor(Math.random() * 1000)}`);

  // 遊戲狀態
  const [phase, setPhase] = useState<GamePhase>('connecting');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  // 選擇狀態（用於下棋）
  const [selectedReserveSize, setSelectedReserveSize] = useState<PieceSize | null>(null);
  const [selectedBoardPos, setSelectedBoardPos] = useState<{ row: number; col: number } | null>(null);

  // 等待伺服器回應（樂觀更新時使用）
  const [waitingForServer, setWaitingForServer] = useState(false);

  // 再戰狀態
  const [rematchRequested, setRematchRequested] = useState(false); // 我是否已請求
  const [opponentRequestedRematch, setOpponentRequestedRematch] = useState(false); // 對方是否請求
  const [rematchDeclined, setRematchDeclined] = useState(false); // 對方拒絕我
  const [iDeclinedRematch, setIDeclinedRematch] = useState(false); // 我拒絕對方
  const [loserStartsColor, setLoserStartsColor] = useState<PieceColor | null>(null); // 下局先手

  // Emoji 狀態（分開處理自己和對手的 emoji）
  const [myEmoji, setMyEmoji] = useState<EmojiState>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<EmojiState>(null);
  const myEmojiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const opponentEmojiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 歷史記錄狀態
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [replayStep, setReplayStep] = useState(0);
  const prevGameStateRef = useRef<GameState | null>(null);

  // 遊戲開始時間
  const gameStartTimeRef = useRef<number>(Date.now());

  // --- 輔助函數 ---

  // 取得目標格的頂部棋子（如果有）- 使用共用函數
  const getTopPieceAt = useCallback((state: GameState, row: number, col: number) => {
    return getTopPiece(state.board, row, col);
  }, []);

  // 播放適當的音效（根據遊戲結果或移動類型）
  const playSoundForMove = useCallback((newState: GameState, isCapture: boolean, currentColor: PieceColor) => {
    if (newState.winner) {
      playSound(newState.winner === currentColor ? 'win' : 'lose');
    } else {
      playSound(isCapture ? 'capture' : 'place');
    }
  }, []);

  // 顯示 Emoji 並設定自動清除
  const showEmoji = useCallback((
    emoji: string,
    setEmoji: React.Dispatch<React.SetStateAction<EmojiState>>,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // x: 隨機水平位置 (20% ~ 80%)
    const x = 20 + Math.random() * 60;
    setEmoji({ emoji, key: Date.now(), x });
    timeoutRef.current = setTimeout(() => setEmoji(null), 2000);
  }, []);

  // 重置所有再戰狀態
  const resetRematchState = useCallback(() => {
    setRematchRequested(false);
    setOpponentRequestedRematch(false);
    setRematchDeclined(false);
    setIDeclinedRematch(false);
    setLoserStartsColor(null);
  }, []);

  // 重置遊戲相關狀態
  const resetGameState = useCallback((newGameState: GameState, newColor: PieceColor) => {
    setGameState(newGameState);
    setMyColor(newColor);
    setPhase('playing');
    setSelectedReserveSize(null);
    setSelectedBoardPos(null);
    setMoveHistory([]);
    setReplayStep(0);
    prevGameStateRef.current = newGameState;
    gameStartTimeRef.current = Date.now();
  }, []);

  // 設定錯誤並進入錯誤狀態
  const showError = useCallback((message: string, details: string) => {
    setErrorMessage(message);
    setErrorDetails(details);
    setPhase('error');
  }, []);

  // WebSocket
  const { connect, sendMessage, isReconnecting, reconnectAttempt, isConnected } = useGameWebSocket({
    onRoomJoined: (joinedRoomId, color) => {
      console.log('已加入房間:', joinedRoomId, color);
      setMyColor(color);
      // 如果是第一個玩家，進入等待狀態
      if (color === 'red') {
        setPhase('waiting');
      }
    },
    onWaitingForOpponent: () => {
      setPhase('waiting');
    },
    onOpponentJoined: (name) => {
      console.log('對手加入:', name);
    },
    onGameStart: (serverInitialState, yourColor) => {
      console.log('遊戲開始:', yourColor);
      resetGameState(serverInitialState, yourColor);
      // 追蹤遊戲開始
      trackGameStart({ game_mode: 'online', room_id: roomId });
    },
    onMoveMade: (newGameState, lastMove, movedBy) => {
      console.log('收到移動:', newGameState, lastMove, movedBy);

      const prevState = prevGameStateRef.current;

      // 判斷是否為對手的移動，需要播放音效
      if (prevState && prevState.currentPlayer !== myColor && lastMove) {
        // 這是對手的移動，判斷是否吃子並播放音效
        const targetRow = lastMove.type === 'place' ? lastMove.row : lastMove.toRow;
        const targetCol = lastMove.type === 'place' ? lastMove.col : lastMove.toCol;
        const oldPieces = prevState.board[targetRow][targetCol].pieces;
        const isCapture = oldPieces.length > 0 && oldPieces[oldPieces.length - 1].color === myColor;
        playSound(isCapture ? 'capture' : 'place');
      }

      // 記錄移動歷史
      if (prevState && lastMove) {
        const targetRow = lastMove.type === 'place' ? lastMove.row : lastMove.toRow;
        const targetCol = lastMove.type === 'place' ? lastMove.col : lastMove.toCol;
        const targetCell = prevState.board[targetRow][targetCol];
        const capturedPiece = targetCell.pieces.length > 0 ? targetCell.pieces[targetCell.pieces.length - 1] : undefined;

        const pieceSize: PieceSize = lastMove.type === 'place'
          ? lastMove.size
          : prevState.board[lastMove.fromRow][lastMove.fromCol].pieces[prevState.board[lastMove.fromRow][lastMove.fromCol].pieces.length - 1].size;

        const moveRecord: MoveRecord = {
          step: moveHistory.length + 1,
          player: movedBy,
          move: { ...lastMove, color: movedBy, size: pieceSize },
          capturedPiece,
          gameStateAfter: newGameState,
        };
        setMoveHistory(prev => [...prev, moveRecord]);
      }

      setGameState(newGameState);
      prevGameStateRef.current = newGameState;
      setSelectedReserveSize(null);
      setSelectedBoardPos(null);
      setWaitingForServer(false);
    },
    onGameOver: (winner) => {
      console.log('遊戲結束:', winner);
      // 播放勝負音效
      if (myColor) {
        playSound(winner === myColor ? 'win' : 'lose');
        // 追蹤遊戲結束
        if (winner === 'red' || winner === 'blue') {
          trackGameEnd({
            game_mode: 'online',
            result: winner === myColor ? 'win' : 'lose',
            winner_color: winner,
            total_moves: moveHistory.length,
            duration_seconds: Math.floor((Date.now() - gameStartTimeRef.current) / 1000),
            room_id: roomId,
          });
        }
      }
      setPhase('finished');
    },
    onOpponentLeft: () => {
      setPhase('opponent_left');
    },
    onError: (message) => {
      console.error('錯誤:', message);

      // 如果是無效移動的錯誤，只在 console 顯示，不進入錯誤狀態
      if (message.includes('非法') || message.includes('無效') || message.includes('不能')) {
        return;
      }

      // 追蹤錯誤
      trackError('online_game', message);

      // 根據錯誤訊息提供更詳細的說明
      let details = '';
      if (message.includes('房間不存在') || message.includes('房間已滿') || message.includes('過期')) {
        details = '這個房間可能已經過期或已滿。請嘗試創建新房間或加入其他房間。';
      } else if (message.includes('連線')) {
        details = '無法連接到遊戲伺服器，請檢查網路連線後重試。';
      } else {
        details = '發生了一個未預期的錯誤。請返回大廳重試。';
      }

      showError(message, details);
    },
    onReconnecting: (attempt) => {
      console.log('正在重連:', attempt);
    },
    onRematchRequested: (by, loserStarts) => {
      console.log('對方請求再戰:', by, '輸家先手:', loserStarts);
      setLoserStartsColor(loserStarts);
      if (by !== myColor) {
        setOpponentRequestedRematch(true);
      }
    },
    onRematchDeclined: () => {
      console.log('再戰被拒絕');
      setRematchDeclined(true);
      setRematchRequested(false);
    },
    onRematchStart: (newGameState, yourColor) => {
      console.log('再戰開始:', yourColor);
      resetGameState(newGameState, yourColor);
      resetRematchState();
      // 追蹤再戰開始
      trackGameStart({ game_mode: 'online', room_id: roomId });
    },
    onEmoji: (emoji) => {
      console.log('收到對手 emoji:', emoji);
      showEmoji(emoji, setOpponentEmoji, opponentEmojiTimeoutRef);
    },
  });

  // 初始化連線
  useEffect(() => {
    if (!roomId) {
      showError('缺少房間 ID', '請從大廳創建或加入房間。');
      return;
    }

    // 追蹤加入房間
    trackRoomJoin(roomId);

    // 連接 WebSocket
    connect(roomId);
  }, [roomId, connect, showError]);

  // 等待 WebSocket 連線成功後發送 join_room
  useEffect(() => {
    if (!isConnected || !roomId) return;

    // 發送 join_room 訊息（帶上 UUID 以便記錄遊戲結果）
    sendMessage({
      type: 'join_room',
      roomId,
      playerName,
      uuid: playerIdentity?.uuid,
    });
  }, [isConnected, roomId, playerName, playerIdentity?.uuid, sendMessage]);

  // 執行放置棋子的移動
  const executePlace = useCallback((row: number, col: number, size: PieceSize) => {
    if (!gameState || !myColor) return;

    // 先驗證移動是否合法
    const validation = canPlacePieceFromReserve(gameState, row, col, myColor, size);
    if (!validation.valid) return;

    // 播放音效（判斷是否為吃子，以及勝負）
    const isCapture = gameState.board[row][col].pieces.length > 0;
    const newState = placePieceFromReserve(gameState, row, col, myColor, size);
    playSoundForMove(newState, isCapture, myColor);

    // 樂觀更新：立即更新本地狀態
    setGameState(newState);
    setWaitingForServer(true);
    setSelectedReserveSize(null);

    const move: GameMove = { type: 'place', row, col, size };
    sendMessage({ type: 'make_move', move });
  }, [gameState, myColor, sendMessage, playSoundForMove]);

  // 執行移動棋子的移動
  const executeMove = useCallback((fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    if (!gameState || !myColor) return;

    // 先驗證移動是否合法
    const validation = canMovePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol);
    if (!validation.valid) return;

    // 播放音效（判斷是否為吃子，以及勝負）
    const isCapture = gameState.board[toRow][toCol].pieces.length > 0;
    const newState = movePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol);
    playSoundForMove(newState, isCapture, myColor);

    // 樂觀更新：立即更新本地狀態
    setGameState(newState);
    setWaitingForServer(true);
    setSelectedBoardPos(null);

    const move: GameMove = { type: 'move', fromRow, fromCol, toRow, toCol };
    sendMessage({ type: 'make_move', move });
  }, [gameState, myColor, sendMessage, playSoundForMove]);

  // 處理棋子選擇
  const handleReserveClick = useCallback((size: PieceSize) => {
    if (phase !== 'playing' || !gameState || !myColor) return;
    if (gameState.currentPlayer !== myColor) return;
    if (waitingForServer) return; // 等待伺服器回應時禁止操作

    setSelectedReserveSize(size);
    setSelectedBoardPos(null);
  }, [phase, gameState, myColor, waitingForServer]);

  // 處理棋盤點擊
  const handleBoardClick = useCallback((row: number, col: number) => {
    if (phase !== 'playing' || !gameState || !myColor) return;
    if (gameState.currentPlayer !== myColor) return;
    if (waitingForServer) return; // 等待伺服器回應時禁止操作

    // 情況 1: 從儲備區放置
    if (selectedReserveSize) {
      executePlace(row, col, selectedReserveSize);
      return;
    }

    // 情況 2: 選擇棋盤上的棋子
    const topPiece = getTopPieceAt(gameState, row, col);
    if (topPiece?.color === myColor) {
      const isSameCell = selectedBoardPos?.row === row && selectedBoardPos?.col === col;
      setSelectedBoardPos(isSameCell ? null : { row, col });
      return;
    }

    // 情況 3: 移動已選擇的棋子
    if (selectedBoardPos) {
      executeMove(selectedBoardPos.row, selectedBoardPos.col, row, col);
    }
  }, [phase, gameState, myColor, selectedReserveSize, selectedBoardPos, waitingForServer, executePlace, executeMove, getTopPiece]);

  // 處理拖曳放置
  const handleDrop = useCallback((row: number, col: number, data: DragData) => {
    if (phase !== 'playing' || !gameState || !myColor) return;
    if (gameState.currentPlayer !== myColor) return;
    if (waitingForServer) return; // 等待伺服器回應時禁止操作

    // 只能操作自己的棋子
    if (data.color !== myColor) return;

    if (data.type === 'reserve') {
      executePlace(row, col, data.size);
    } else if (data.fromRow !== undefined && data.fromCol !== undefined) {
      executeMove(data.fromRow, data.fromCol, row, col);
    }
  }, [phase, gameState, myColor, waitingForServer, executePlace, executeMove]);

  // 返回大廳
  const handleBackToLobby = useCallback(() => {
    navigate('/online');
  }, [navigate]);

  // 發送 emoji（同時在自己畫面顯示）
  const handleSendEmoji = useCallback((emoji: string) => {
    // 追蹤發送 emoji
    trackEmojiSend(emoji);
    // 發送給對手
    sendMessage({ type: 'emoji', emoji });
    // 在自己畫面顯示
    showEmoji(emoji, setMyEmoji, myEmojiTimeoutRef);
  }, [sendMessage, showEmoji]);

  // 遊戲結束時預設顯示最後一步
  useEffect(() => {
    if (gameState?.winner) {
      setReplayStep(moveHistory.length);
    }
  }, [gameState?.winner, moveHistory.length]);

  // 回放步驟變更
  const handleReplayStepChange = useCallback((step: number) => {
    setReplayStep(Math.max(0, Math.min(step, moveHistory.length)));
  }, [moveHistory.length]);

  // --- 渲染輔助函數 ---

  // 渲染 Emoji 浮動顯示
  function renderEmojiFloat(emojiState: EmojiState, prefix: string) {
    if (!emojiState) return null;
    return (
      <div
        key={`${prefix}-${emojiState.key}`}
        className="fixed top-[12%] -translate-x-1/2 pointer-events-none z-50"
        style={{
          left: `${emojiState.x}%`,
          animation: 'emoji-float 2s ease-out forwards',
        }}
      >
        <span className="text-7xl drop-shadow-lg">{emojiState.emoji}</span>
      </div>
    );
  }

  // 渲染連線中畫面
  if (phase === 'connecting') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-800">連線中...</p>
        </div>
      </div>
    );
  }

  // 渲染錯誤畫面
  if (phase === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center max-w-lg">
          <div className="text-6xl mb-4">:(</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">發生錯誤</h2>

          {/* 錯誤訊息 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-semibold mb-2">{errorMessage}</p>
            {errorDetails && (
              <p className="text-red-600 text-sm">{errorDetails}</p>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleBackToLobby}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition"
            >
              返回大廳
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
            >
              重新整理
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 渲染等待對手畫面
  if (phase === 'waiting') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4 animate-bounce">...</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">等待對手加入</h2>
          <p className="text-gray-600 mb-2">房間 ID:</p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-3xl font-mono font-bold text-indigo-600">{roomId}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">分享這個 ID 或網址給朋友加入遊戲</p>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
          >
            取消並返回
          </button>
        </div>
      </div>
    );
  }

  // 渲染對手已離開畫面
  if (phase === 'opponent_left') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">...</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">對手已離開</h2>
          <p className="text-gray-600 mb-6">
            你可以在這裡等待對手重新加入，或是返回大廳開始新遊戲。
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">房間 ID</p>
            <p className="text-2xl font-mono font-bold text-indigo-600">{roomId}</p>
          </div>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition w-full"
          >
            返回大廳
          </button>
        </div>
      </div>
    );
  }

  // 渲染遊戲畫面
  if ((phase === 'playing' || phase === 'finished') && gameState && myColor) {
    const isMyTurn = gameState.currentPlayer === myColor;
    const isGameOver = phase === 'finished' || !!gameState.winner;
    const winner = gameState.winner;
    const isWinner = winner === myColor;

    // 計算顯示狀態（遊戲結束時根據 replayStep 顯示歷史）
    const displayState = isGameOver
      ? (replayStep === 0 ? initialGameState : moveHistory[replayStep - 1]?.gameStateAfter || gameState)
      : gameState;

    // 處理再戰相關操作
    const handleRematchRequest = () => {
      trackRematchRequest();
      sendMessage({ type: 'rematch_request' });
      setRematchRequested(true);
    };

    const handleRematchAccept = () => {
      sendMessage({ type: 'rematch_accept' });
    };

    const handleRematchDecline = () => {
      sendMessage({ type: 'rematch_decline' });
      setOpponentRequestedRematch(false);
      setIDeclinedRematch(true);
    };

    // 渲染遊戲狀態文字
    function renderGameStatus() {
      if (isGameOver) {
        const colorClass = isWinner ? 'text-green-600' : 'text-red-600';
        const statusText = isWinner ? '你獲勝了！' : '你輸了';
        return (
          <p className={`text-base md:text-xl lg:text-2xl font-bold ${colorClass}`}>
            {statusText}
          </p>
        );
      }
      const colorClass = isMyTurn ? 'text-green-600' : 'text-gray-400';
      const statusText = isMyTurn ? '你的回合' : '對手回合';
      return (
        <p className={`text-base md:text-xl lg:text-2xl font-bold ${colorClass}`}>
          {statusText}
        </p>
      );
    }

    // 渲染右上角按鈕（遊戲中為空，結束後為再戰按鈕）
    function renderRightButton() {
      if (!isGameOver) {
        // 遊戲進行中，顯示空白佔位
        return <div className="w-[52px] md:w-[68px]"></div>;
      }

      // 遊戲結束，顯示再戰相關按鈕
      if (opponentRequestedRematch && !rematchDeclined) {
        return (
          <div className="flex gap-1">
            <button
              onClick={handleRematchAccept}
              className="px-2 py-1.5 md:px-3 md:py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition"
            >
              接受
            </button>
            <button
              onClick={handleRematchDecline}
              className="px-2 py-1.5 md:px-3 md:py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium text-sm transition"
            >
              拒絕
            </button>
          </div>
        );
      }

      if (rematchRequested && !rematchDeclined) {
        return (
          <span className="text-sm text-blue-600 font-medium">等待中...</span>
        );
      }

      if (iDeclinedRematch || rematchDeclined) {
        return <div className="w-[52px] md:w-[68px]"></div>;
      }

      return (
        <button
          onClick={handleRematchRequest}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
        >
          再一場
        </button>
      );
    }

    // 渲染再戰狀態提示
    function renderRematchStatus() {
      if (!isGameOver) return null;

      const loserText = loserStartsColor ? `（${loserStartsColor === 'red' ? '紅方' : '藍方'}先手）` : '';

      if (opponentRequestedRematch && !rematchDeclined) {
        return (
          <p className="text-center text-sm text-yellow-600 mt-2 font-semibold">
            對方想要再來一局！{loserText}
          </p>
        );
      }

      if (rematchRequested && !rematchDeclined) {
        return (
          <p className="text-center text-sm text-blue-600 mt-2 font-semibold">
            已發送再戰請求，等待對方回應...{loserText}
          </p>
        );
      }

      if (iDeclinedRematch || rematchDeclined) {
        return (
          <p className="text-center text-sm text-gray-500 mt-2">
            {iDeclinedRematch ? '已拒絕再戰' : '對方拒絕了再戰'}
          </p>
        );
      }

      return null;
    }

    return (
      <GameDndContext onDrop={handleDrop}>
        <div className="h-[100dvh] bg-gradient-to-br from-red-400 to-rose-600 flex flex-col">
          {/* 重連提示浮層 */}
          {isReconnecting && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-2xl p-8 text-center max-w-md">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">正在重連...</h3>
                <p className="text-gray-600">
                  嘗試次數: {reconnectAttempt} / 5
                </p>
                <p className="text-sm text-gray-500 mt-2">請稍候，我們正在嘗試重新連線到遊戲伺服器</p>
              </div>
            </div>
          )}

          {/* Emoji 浮動顯示 */}
          {renderEmojiFloat(myEmoji, 'my')}
          {renderEmojiFloat(opponentEmoji, 'opponent')}

          {/* 頂部資訊 */}
          <div className="flex-none px-3 pt-3">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBackToLobby}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                  >
                    離開
                  </button>
                  <SoundToggle />
                </div>
                {renderGameStatus()}
                {renderRightButton()}
              </div>
              {renderRematchStatus()}
            </div>
          </div>

          {/* 棋盤區域 - 置中 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
              <Board
                board={displayState.board}
                onCellClick={isGameOver ? undefined : handleBoardClick}
                selectedCell={isGameOver ? null : selectedBoardPos}
                canDrag={!isGameOver && isMyTurn && !waitingForServer}
                currentPlayer={myColor}
                winningCells={getWinningLine(displayState)?.cells}
              />
            </div>
          </div>

          {/* Emoji 反應按鈕 */}
          <div className="flex-none px-3 flex justify-center">
            <div className="flex gap-2">
              {['👍', '❤️', '👎'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  className="w-12 h-12 bg-white rounded-full shadow-lg text-2xl hover:scale-110 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 遊戲結束時顯示歷史記錄，否則顯示儲備區 */}
          {isGameOver ? (
            <div className="flex-none p-3 flex justify-center">
              <MoveHistory
                history={moveHistory}
                currentStep={replayStep}
                onStepChange={handleReplayStepChange}
              />
            </div>
          ) : (
            <div className="flex-none p-3 flex justify-center">
              <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:p-5">
                <PlayerReserve
                  color={myColor}
                  reserves={gameState.reserves[myColor]}
                  onPieceClick={handleReserveClick}
                  selectedSize={selectedReserveSize}
                  canDrag={isMyTurn && !waitingForServer}
                  disabled={!isMyTurn || waitingForServer}
                />
              </div>
            </div>
          )}
        </div>
      </GameDndContext>
    );
  }

  return null;
}

export default OnlineGame;
