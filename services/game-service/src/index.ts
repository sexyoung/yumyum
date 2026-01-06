import { Hono } from 'hono';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleWebSocketConnection, getRoomStats } from './websocket/handler.js';
import { handleGameWebSocketConnection, getGameStats } from './websocket/gameHandler.js';

const app = new Hono();

// 健康檢查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'game-service',
    timestamp: new Date().toISOString(),
  });
});

// WebSocket 房間統計（聊天室）
app.get('/stats', (c) => {
  return c.json(getRoomStats());
});

// 遊戲房間統計
app.get('/stats/game', (c) => {
  return c.json(getGameStats());
});

// 遊戲狀態路由
app.get('/game/:roomId', (c) => {
  const roomId = c.req.param('roomId');

  // TODO: 實作從 Redis 取得遊戲狀態
  return c.json({
    roomId,
    gameState: 'waiting',
    players: [],
    board: null,
    currentTurn: null,
  });
});

// 執行移動
app.post('/game/:roomId/move', async (c) => {
  const roomId = c.req.param('roomId');
  const moveData = await c.req.json();

  // TODO: 實作遊戲邏輯驗證
  // TODO: 更新 Redis 遊戲狀態
  // TODO: 透過 WebSocket 通知所有玩家

  return c.json({
    success: true,
    roomId,
    move: moveData,
  });
});

const port = parseInt(process.env.PORT || '3002', 10);

// 建立 HTTP server
const server = createServer(async (req, res) => {
  const response = await app.fetch(
    new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers as any,
    })
  );

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.text();
  res.end(body);
});

// 建立 WebSocket server（不限制 path，在 handler 中驗證）
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // 區分聊天室和遊戲房間
  // /chat/:roomId -> 聊天室 WebSocket
  // /game/:roomId -> 遊戲房間 WebSocket

  if (pathname.startsWith('/chat/')) {
    const roomId = pathname.split('/')[2] || 'default';
    console.log(`💬 聊天室 WebSocket 連線: roomId=${roomId}`);
    handleWebSocketConnection(ws, roomId);
  } else if (pathname.startsWith('/game/')) {
    const roomId = pathname.split('/')[2] || 'default';
    console.log(`🎮 遊戲 WebSocket 連線: roomId=${roomId}`);
    handleGameWebSocketConnection(ws, roomId);
  } else {
    console.log(`❌ 無效的 WebSocket 路徑: ${pathname}`);
    ws.close(1008, 'Invalid path. Expected /chat/:roomId or /game/:roomId');
  }
});

// 啟動 server
server.listen(port, '0.0.0.0', () => {
  console.log(`Game Service running on http://0.0.0.0:${port}`);
  console.log(`WebSocket endpoint: ws://0.0.0.0:${port}/game/:roomId`);
});
