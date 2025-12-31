import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage, ConnectedPlayer } from '@yumyum/types';

// 儲存房間內的連線
const rooms = new Map<string, Set<WebSocket>>();
// 儲存玩家資訊
const players = new Map<WebSocket, { playerId: string; playerName: string; roomId: string }>();

export function handleWebSocketConnection(ws: WebSocket, roomId: string) {
  console.log(`New WebSocket connection for room: ${roomId}`);

  // 初始化房間
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  // 處理客戶端訊息
  ws.on('message', (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleClientMessage(ws, roomId, message);
    } catch (error) {
      const errorMsg: ServerMessage = {
        type: 'error',
        message: '無效的訊息格式',
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  // 處理連線關閉
  ws.on('close', () => {
    const playerInfo = players.get(ws);
    if (playerInfo) {
      console.log(`Player ${playerInfo.playerName} left room ${roomId}`);

      // 從房間移除
      rooms.get(roomId)?.delete(ws);
      players.delete(ws);

      // 通知其他玩家
      const leaveMsg: ServerMessage = {
        type: 'player_left',
        playerId: playerInfo.playerId,
      };
      broadcast(roomId, leaveMsg, ws);

      // 如果房間空了，清理房間
      if (rooms.get(roomId)?.size === 0) {
        rooms.delete(roomId);
      }
    }
  });

  // 處理錯誤
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function handleClientMessage(ws: WebSocket, roomId: string, message: ClientMessage) {
  switch (message.type) {
    case 'join': {
      // 將玩家加入房間
      rooms.get(roomId)?.add(ws);
      players.set(ws, {
        playerId: message.playerId,
        playerName: message.playerName,
        roomId,
      });

      // 發送連線成功訊息
      const connectedMsg: ServerMessage = {
        type: 'connected',
        playerId: message.playerId,
        roomId,
      };
      ws.send(JSON.stringify(connectedMsg));

      // 通知其他玩家
      const player: ConnectedPlayer = {
        id: message.playerId,
        username: message.playerName,
      };
      const joinedMsg: ServerMessage = {
        type: 'player_joined',
        player,
      };
      broadcast(roomId, joinedMsg, ws);

      console.log(`Player ${message.playerName} joined room ${roomId}`);
      break;
    }

    case 'chat': {
      const playerInfo = players.get(ws);
      if (!playerInfo) {
        const errorMsg: ServerMessage = {
          type: 'error',
          message: '請先加入房間',
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      // 廣播聊天訊息
      const chatMsg: ServerMessage = {
        type: 'chat',
        playerId: playerInfo.playerId,
        playerName: playerInfo.playerName,
        message: message.message,
      };
      broadcast(roomId, chatMsg);

      console.log(`[${roomId}] ${playerInfo.playerName}: ${message.message}`);
      break;
    }

    case 'leave': {
      // 關閉連線（會觸發 close 事件）
      ws.close();
      break;
    }
  }
}

// 廣播訊息給房間內的所有人（可選擇排除某個連線）
function broadcast(roomId: string, message: ServerMessage, exclude?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;

  const data = JSON.stringify(message);
  room.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 取得房間狀態（供 debug 使用）
export function getRoomStats() {
  return {
    totalRooms: rooms.size,
    totalPlayers: players.size,
    rooms: Array.from(rooms.entries()).map(([roomId, clients]) => ({
      roomId,
      playerCount: clients.size,
    })),
  };
}
