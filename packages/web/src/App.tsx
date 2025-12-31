import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { api } from './lib/api';
import { GameWebSocket } from './lib/websocket';
import type { ServerMessage } from '@yumyum/types';

function App() {
  // 使用 React Query 呼叫 API
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
  });

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: api.getPlayers,
  });

  // WebSocket 狀態
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [playerName, setPlayerName] = useState('Player-' + Math.floor(Math.random() * 1000));
  const wsRef = useRef<GameWebSocket | null>(null);

  useEffect(() => {
    // 建立 WebSocket 實例
    const ws = new GameWebSocket();
    wsRef.current = ws;

    // 註冊事件監聽
    const unsubMessage = ws.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    const unsubConnect = ws.onConnect(() => {
      setIsWsConnected(true);
      // 連線成功後自動加入房間
      ws.send({
        type: 'join',
        playerId: playerName,
        playerName: playerName,
      });
    });

    const unsubDisconnect = ws.onDisconnect(() => {
      setIsWsConnected(false);
    });

    // 清理函數
    return () => {
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      ws.disconnect();
    };
  }, [playerName]);

  const handleConnect = () => {
    wsRef.current?.connect('test-room');
  };

  const handleDisconnect = () => {
    wsRef.current?.disconnect();
  };

  const handleSendChat = () => {
    if (chatInput.trim() && wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'chat',
        message: chatInput,
      });
      setChatInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-8">
      <div className="text-center text-white max-w-4xl w-full">
        <h1 className="text-6xl font-bold mb-4">YumYum 吞吞棋</h1>
        <p className="text-xl mb-8">Monorepo 初始化成功！</p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* API 連線狀態卡片 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">🔗 REST API 測試</h2>

            <div className="space-y-4 text-left">
              {/* 健康檢查 */}
              <div className="bg-white/5 rounded p-4">
                <h3 className="font-semibold mb-2">API Gateway 狀態</h3>
                {healthLoading && <p className="text-sm">載入中...</p>}
                {healthError && <p className="text-red-300 text-sm">❌ 連線失敗</p>}
                {healthData && (
                  <p className="text-sm">
                    ✅ {healthData.service} - {healthData.status}
                  </p>
                )}
              </div>

              {/* 房間列表 */}
              <div className="bg-white/5 rounded p-4">
                <h3 className="font-semibold mb-2">房間列表</h3>
                {roomsLoading && <p className="text-sm">載入中...</p>}
                {roomsData && (
                  <p className="text-sm">
                    📋 目前房間數量: {roomsData.length} 個
                    {roomsData.length === 0 && ' (尚無房間)'}
                  </p>
                )}
              </div>

              {/* 玩家列表 */}
              <div className="bg-white/5 rounded p-4">
                <h3 className="font-semibold mb-2">🎮 玩家列表</h3>
                {playersLoading && <p className="text-sm">載入中...</p>}
                {playersData && playersData.length > 0 && (
                  <div className="space-y-2">
                    {playersData.map((player) => (
                      <div key={player.id} className="flex items-center gap-3 bg-white/5 rounded p-2">
                        {player.avatarUrl && (
                          <img
                            src={player.avatarUrl}
                            alt={player.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">{player.username}</p>
                          <p className="text-xs text-white/60">
                            ELO: {player.eloRating} | 勝場: {player.gamesWon}/{player.gamesPlayed}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {playersData && playersData.length === 0 && (
                  <p className="text-sm text-white/60">目前沒有玩家</p>
                )}
              </div>
            </div>
          </div>

          {/* WebSocket 連線測試 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">⚡ WebSocket 測試</h2>

            <div className="space-y-4 text-left">
              {/* 連線狀態 */}
              <div className="bg-white/5 rounded p-4">
                <h3 className="font-semibold mb-2">連線狀態</h3>
                <p className="text-sm mb-2">
                  玩家名稱: <code className="bg-white/20 px-2 py-1 rounded">{playerName}</code>
                </p>
                <p className="text-sm mb-3">
                  {isWsConnected ? (
                    <span className="text-green-300">✅ 已連線到 test-room</span>
                  ) : (
                    <span className="text-yellow-300">⚪ 未連線</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConnect}
                    disabled={isWsConnected}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 rounded text-sm"
                  >
                    連線
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={!isWsConnected}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 rounded text-sm"
                  >
                    斷線
                  </button>
                </div>
              </div>

              {/* 聊天室 */}
              {isWsConnected && (
                <div className="bg-white/5 rounded p-4">
                  <h3 className="font-semibold mb-2">聊天室</h3>
                  <div className="bg-black/20 rounded p-2 h-32 overflow-y-auto mb-2 text-xs">
                    {messages.map((msg, idx) => (
                      <div key={idx} className="mb-1">
                        {msg.type === 'connected' && (
                          <span className="text-green-300">✅ 已連線</span>
                        )}
                        {msg.type === 'player_joined' && (
                          <span className="text-blue-300">👤 {msg.player.username} 加入了房間</span>
                        )}
                        {msg.type === 'player_left' && (
                          <span className="text-gray-300">👋 玩家離開了</span>
                        )}
                        {msg.type === 'chat' && (
                          <span>
                            <strong className="text-yellow-300">{msg.playerName}:</strong> {msg.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="輸入訊息..."
                      className="flex-1 px-3 py-2 rounded bg-white/10 text-white placeholder-white/50 text-sm"
                    />
                    <button
                      onClick={handleSendChat}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-sm"
                    >
                      發送
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 技術棧說明 */}
        <div className="text-sm text-white/80 space-y-1 mt-6">
          <p>前端: <code className="bg-white/20 px-2 py-1 rounded">React + Vite + TanStack Query + Axios + WebSocket</code></p>
          <p>後端: <code className="bg-white/20 px-2 py-1 rounded">Hono.js + ws + TypeScript</code></p>
          <p className="text-xs mt-2">
            前端: localhost:5173 | API: localhost:3000 | Game: localhost:3002
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
