// packages/web/src/pages/OnlineGame.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import type { GameState, PieceColor, GameMove } from '@yumyum/types';
import Board from '../components/Board';
import PlayerReserve from '../components/PlayerReserve';
import { placePieceFromReserve, movePieceOnBoard } from '../lib/gameLogic';

type GamePhase = 'connecting' | 'waiting' | 'playing' | 'finished' | 'error';

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
      setErrorMessage('對手已離開遊戲');
      setErrorDetails('你的對手已經離線，遊戲無法繼續。你可以返回大廳開始新的遊戲。');
      setPhase('error');
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

  if (phase === 'playing' && gameState && myColor) {
    const isMyTurn = gameState.currentPlayer === myColor;
    const opponentColor: PieceColor = myColor === 'red' ? 'blue' : 'red';

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4">
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

        <div className="max-w-6xl mx-auto">
          {/* 頂部資訊 */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-gray-600">房間 ID: {roomId}</p>
                  {/* 連線狀態指示器 */}
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    isConnected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {isConnected ? '已連線' : '已斷線'}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-800">
                  你的顏色: <span className={myColor === 'red' ? 'text-red-600' : 'text-blue-600'}>
                    {myColor === 'red' ? '紅色' : '藍色'}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${isMyTurn ? 'text-green-600' : 'text-gray-400'}`}>
                  {isMyTurn ? '你的回合' : '對手回合'}
                </p>
              </div>
            </div>
          </div>

          {/* 遊戲區域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 對手儲備區 */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-2 text-center text-gray-700">
                對手棋子 ({opponentColor === 'red' ? '紅' : '藍'})
              </h3>
              <PlayerReserve
                color={opponentColor}
                reserves={gameState.reserves[opponentColor]}
                onPieceClick={() => {}}
                selectedSize={null}
              />
            </div>

            {/* 棋盤 */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <Board
                board={gameState.board}
                onCellClick={handleBoardClick}
                selectedCell={selectedBoardPos}
              />
            </div>

            {/* 我的儲備區 */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-2 text-center text-gray-700">
                你的棋子 ({myColor === 'red' ? '紅' : '藍'})
              </h3>
              <PlayerReserve
                color={myColor}
                reserves={gameState.reserves[myColor]}
                onPieceClick={handleReserveClick}
                selectedSize={selectedReserveSize}
              />
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="mt-4 text-center">
            <button
              onClick={handleBackToLobby}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
            >
              離開遊戲
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'finished' && gameState) {
    const winner = gameState.winner;
    const isWinner = winner === myColor;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center max-w-md">
          <div className="text-8xl mb-4">{isWinner ? ':)' : ':('}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {isWinner ? '恭喜獲勝！' : '遊戲結束'}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {winner ? `${winner === 'red' ? '紅方' : '藍方'}獲勝！` : '平局'}
          </p>
          <button
            onClick={handleBackToLobby}
            className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-lg transition"
          >
            返回大廳
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OnlineGame;
