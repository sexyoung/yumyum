// packages/web/src/pages/OnlineGame.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import type { GameState, PieceColor, GameMove } from '@yumyum/types';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';
import GameDndContext from '../components/GameDndContext';
import { DragData } from '../components/Piece';
import { placePieceFromReserve, movePieceOnBoard, getWinningLine } from '../lib/gameLogic';

type GamePhase = 'connecting' | 'waiting' | 'playing' | 'finished' | 'opponent_left' | 'error';

const OnlineGame: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [playerName] = useState(() => `玩家${Math.floor(Math.random() * 1000)}`);

  // 遊戲狀態
  const [phase, setPhase] = useState<GamePhase>('connecting');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  // 選擇狀態（用於下棋）
  const [selectedReserveSize, setSelectedReserveSize] = useState<'small' | 'medium' | 'large' | null>(null);
  const [selectedBoardPos, setSelectedBoardPos] = useState<{ row: number; col: number } | null>(null);

  // 再戰狀態
  const [rematchRequested, setRematchRequested] = useState(false); // 我是否已請求
  const [opponentRequestedRematch, setOpponentRequestedRematch] = useState(false); // 對方是否請求
  const [rematchDeclined, setRematchDeclined] = useState(false); // 對方拒絕我
  const [iDeclinedRematch, setIDeclinedRematch] = useState(false); // 我拒絕對方
  const [loserStartsColor, setLoserStartsColor] = useState<PieceColor | null>(null); // 下局先手

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
    onGameStart: (initialGameState, yourColor) => {
      console.log('遊戲開始:', yourColor);
      setGameState(initialGameState);
      setMyColor(yourColor);
      setPhase('playing');
    },
    onMoveMade: (newGameState) => {
      console.log('收到移動:', newGameState);
      setGameState(newGameState);
      setSelectedReserveSize(null);
      setSelectedBoardPos(null);
    },
    onGameOver: (winner) => {
      console.log('遊戲結束:', winner);
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

      // 根據錯誤訊息提供更詳細的說明
      let details = '';
      if (message.includes('房間不存在') || message.includes('房間已滿') || message.includes('過期')) {
        details = '這個房間可能已經過期或已滿。請嘗試創建新房間或加入其他房間。';
      } else if (message.includes('連線')) {
        details = '無法連接到遊戲伺服器，請檢查網路連線後重試。';
      } else {
        details = '發生了一個未預期的錯誤。請返回大廳重試。';
      }

      setErrorMessage(message);
      setErrorDetails(details);
      setPhase('error');
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
      setGameState(newGameState);
      setMyColor(yourColor);
      setPhase('playing');
      // 重置所有再戰狀態
      setRematchRequested(false);
      setOpponentRequestedRematch(false);
      setRematchDeclined(false);
      setIDeclinedRematch(false);
      setLoserStartsColor(null);
      setSelectedReserveSize(null);
      setSelectedBoardPos(null);
    },
  });

  // 初始化連線
  useEffect(() => {
    if (!roomId) {
      setErrorMessage('缺少房間 ID');
      setErrorDetails('請從大廳創建或加入房間。');
      setPhase('error');
      return;
    }

    // 連接 WebSocket
    connect(roomId);
  }, [roomId, connect]);

  // 等待 WebSocket 連線成功後發送 join_room
  useEffect(() => {
    if (!isConnected || !roomId) return;

    // 發送 join_room 訊息
    sendMessage({ type: 'join_room', roomId, playerName });
  }, [isConnected, roomId, playerName, sendMessage]);

  // 處理棋子選擇
  const handleReserveClick = useCallback((size: 'small' | 'medium' | 'large') => {
    if (phase !== 'playing' || !gameState || !myColor) return;
    if (gameState.currentPlayer !== myColor) return;

    setSelectedReserveSize(size);
    setSelectedBoardPos(null);
  }, [phase, gameState, myColor]);

  // 處理棋盤點擊
  const handleBoardClick = useCallback((row: number, col: number) => {
    if (phase !== 'playing' || !gameState || !myColor) return;
    if (gameState.currentPlayer !== myColor) return;

    // 情況 1: 從儲備區放置
    if (selectedReserveSize) {
      const newState = placePieceFromReserve(gameState, row, col, myColor, selectedReserveSize);
      if (newState !== gameState) {
        const move: GameMove = {
          type: 'place',
          row,
          col,
          size: selectedReserveSize,
        };
        sendMessage({ type: 'make_move', move });
      }
      return;
    }

    // 情況 2: 選擇棋盤上的棋子
    const cell = gameState.board[row][col];
    if (cell.pieces.length > 0 && cell.pieces[cell.pieces.length - 1].color === myColor) {
      if (selectedBoardPos?.row === row && selectedBoardPos?.col === col) {
        setSelectedBoardPos(null);
      } else {
        setSelectedBoardPos({ row, col });
      }
      return;
    }

    // 情況 3: 移動已選擇的棋子
    if (selectedBoardPos) {
      const newState = movePieceOnBoard(
        gameState,
        selectedBoardPos.row,
        selectedBoardPos.col,
        row,
        col
      );
      if (newState !== gameState) {
        const move: GameMove = {
          type: 'move',
          fromRow: selectedBoardPos.row,
          fromCol: selectedBoardPos.col,
          toRow: row,
          toCol: col,
        };
        sendMessage({ type: 'make_move', move });
      }
    }
  }, [phase, gameState, myColor, selectedReserveSize, selectedBoardPos, sendMessage]);

  // 處理拖曳放置
  const handleDrop = useCallback((row: number, col: number, data: DragData) => {
    if (phase !== 'playing' || !gameState || !myColor) return;
    if (gameState.currentPlayer !== myColor) return;

    // 只能操作自己的棋子
    if (data.color !== myColor) return;

    if (data.type === 'reserve') {
      // 從儲備區放置
      const newState = placePieceFromReserve(gameState, row, col, myColor, data.size);
      if (newState !== gameState) {
        const move: GameMove = {
          type: 'place',
          row,
          col,
          size: data.size,
        };
        sendMessage({ type: 'make_move', move });
      }
    } else if (data.fromRow !== undefined && data.fromCol !== undefined) {
      // 從棋盤移動
      const newState = movePieceOnBoard(gameState, data.fromRow, data.fromCol, row, col);
      if (newState !== gameState) {
        const move: GameMove = {
          type: 'move',
          fromRow: data.fromRow,
          fromCol: data.fromCol,
          toRow: row,
          toCol: col,
        };
        sendMessage({ type: 'make_move', move });
      }
    }
  }, [phase, gameState, myColor, sendMessage]);

  // 返回大廳
  const handleBackToLobby = () => {
    navigate('/online');
  };

  // 渲染不同階段的畫面
  if (phase === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-800">連線中...</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600">
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

  if (phase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
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

  if (phase === 'opponent_left') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
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

  if ((phase === 'playing' || phase === 'finished') && gameState && myColor) {
    const isMyTurn = gameState.currentPlayer === myColor;
    const isGameOver = phase === 'finished' || !!gameState.winner;
    const winner = gameState.winner;
    const isWinner = winner === myColor;
    const opponentColor: PieceColor = myColor === 'red' ? 'blue' : 'red';

    const handleRematchRequest = () => {
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

    // 渲染右上角按鈕（遊戲中為空，結束後為再戰按鈕）
    const renderRightButton = () => {
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
    };

    // 渲染中間狀態文字
    const renderStatusText = () => {
      if (isGameOver) {
        return (
          <p className={`text-base md:text-xl font-bold ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
            {isWinner ? '你獲勝了！' : '你輸了'}
          </p>
        );
      }
      return (
        <p className={`text-base md:text-xl font-bold ${isMyTurn ? 'text-green-600' : 'text-gray-400'}`}>
          {isMyTurn ? '你的回合' : '對手回合'}
        </p>
      );
    };

    return (
      <GameDndContext onDrop={handleDrop}>
        <div className="h-[100dvh] bg-gradient-to-br from-green-400 to-blue-500 flex flex-col">
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

          {/* 頂部資訊 */}
          <div className="flex-none px-3 pt-3">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <div className="flex justify-between items-center">
                <button
                  onClick={handleBackToLobby}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                >
                  離開
                </button>
                {renderStatusText()}
                {renderRightButton()}
              </div>
              {/* 對方請求再戰的提示 */}
              {isGameOver && opponentRequestedRematch && !rematchDeclined && (
                <p className="text-center text-sm text-yellow-600 mt-2 font-semibold">
                  對方想要再來一局！{loserStartsColor && `（${loserStartsColor === 'red' ? '紅方' : '藍方'}先手）`}
                </p>
              )}
              {/* 等待對方回應的提示 */}
              {isGameOver && rematchRequested && !rematchDeclined && (
                <p className="text-center text-sm text-blue-600 mt-2 font-semibold">
                  已發送再戰請求，等待對方回應...{loserStartsColor && `（${loserStartsColor === 'red' ? '紅方' : '藍方'}先手）`}
                </p>
              )}
              {/* 拒絕提示 */}
              {isGameOver && (iDeclinedRematch || rematchDeclined) && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  {iDeclinedRematch ? '已拒絕再戰' : '對方拒絕了再戰'}
                </p>
              )}
            </div>
          </div>

          {/* 對手儲備區 - 頂部 */}
          <div className="flex-none p-3 flex justify-center">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <PlayerReserve
                color={opponentColor}
                reserves={gameState.reserves[opponentColor]}
                selectedSize={null}
                disabled={true}
              />
            </div>
          </div>

          {/* 棋盤區域 - 置中 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <Board
                board={gameState.board}
                onCellClick={handleBoardClick}
                selectedCell={selectedBoardPos}
                canDrag={!isGameOver && isMyTurn}
                currentPlayer={myColor}
                winningCells={getWinningLine(gameState)?.cells}
              />
            </div>
          </div>

          {/* 我的儲備區 - 底部 */}
          <div className="flex-none p-3 flex justify-center">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <PlayerReserve
                color={myColor}
                reserves={gameState.reserves[myColor]}
                onPieceClick={handleReserveClick}
                selectedSize={selectedReserveSize}
                canDrag={!isGameOver && isMyTurn}
                disabled={isGameOver || !isMyTurn}
              />
            </div>
          </div>
        </div>
      </GameDndContext>
    );
  }

  return null;
};

export default OnlineGame;
