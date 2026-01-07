// services/game-service/src/websocket/gameHandler.ts
import { WebSocket } from 'ws';
import type { GameClientMessage, GameServerMessage, PieceColor } from '@yumyum/types';
import * as roomManager from '../game/roomManager.js';
import { validateMove, applyMove } from '../game/gameLogic.js';

// 儲存房間內的 WebSocket 連線（roomId -> Map<color, WebSocket>）
const gameRooms = new Map<string, Map<PieceColor, WebSocket>>();

// 儲存 WebSocket 對應的玩家資訊
const gamePlayers = new Map<
  WebSocket,
  { playerName: string; roomId: string; color: PieceColor }
>();

export function handleGameWebSocketConnection(ws: WebSocket, roomId: string) {
  console.log(`WebSocket connection: roomId=${roomId}`);

  // 處理客戶端訊息
  ws.on('message', async (data) => {
    try {
      const message: GameClientMessage = JSON.parse(data.toString());
      await handleGameClientMessage(ws, message);
    } catch (error) {
      console.error('Error processing game message:', error);
      const errorMsg: GameServerMessage = {
        type: 'error',
        message: '無效的訊息格式',
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  // 處理連線關閉
  ws.on('close', async () => {
    const playerInfo = gamePlayers.get(ws);
    if (playerInfo) {
      console.log(`Player left: ${playerInfo.playerName} (${playerInfo.roomId})`);

      // 從房間移除 WebSocket
      const roomConnections = gameRooms.get(playerInfo.roomId);
      if (roomConnections) {
        roomConnections.delete(playerInfo.color);
        if (roomConnections.size === 0) {
          gameRooms.delete(playerInfo.roomId);
        }
      }

      // 從 Redis 移除玩家
      await roomManager.leaveRoom(playerInfo.roomId, playerInfo.color);

      // 刪除玩家資訊
      gamePlayers.delete(ws);

      // 通知對手
      const leaveMsg: GameServerMessage = {
        type: 'opponent_left',
      };
      broadcastToRoom(playerInfo.roomId, leaveMsg, ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

async function handleGameClientMessage(
  ws: WebSocket,
  message: GameClientMessage
) {
  switch (message.type) {
    case 'join_room': {
      try {
        console.log(`Join room request: ${message.roomId}, player: ${message.playerName}`);

        // 檢查是否已經在某個房間中
        const existingPlayerInfo = gamePlayers.get(ws);
        if (existingPlayerInfo) {
          console.log(`Player already in room ${existingPlayerInfo.roomId}, skipping`);
          return;
        }

        const result = await roomManager.joinRoom(message.roomId, message.playerName);

        console.log(`Join room result:`, result);

        if (!result.success || !result.room || !result.color) {
          console.error(`Failed to join room:`, result.error);
          sendError(ws, result.error || '加入房間失敗');
          return;
        }

        // 加入房間
        joinGameRoom(ws, result.room.roomId, message.playerName, result.color);

        // 通知加入者
        const joinedMsg: GameServerMessage = {
          type: 'room_joined',
          roomId: result.room.roomId,
          color: result.color,
        };
        ws.send(JSON.stringify(joinedMsg));

        // 根據情況處理
        if (result.room.status === 'waiting') {
          // 第一個玩家，等待對手
          const waitingMsg: GameServerMessage = {
            type: 'waiting_for_opponent',
          };
          ws.send(JSON.stringify(waitingMsg));
          console.log(`Player waiting: ${message.playerName} → ${result.room.roomId}`);
        } else if (result.room.status === 'playing') {
          // 第二個玩家加入，開始遊戲

          // 通知房主對手已加入
          const opponentJoinedMsg: GameServerMessage = {
            type: 'opponent_joined',
            opponentName: message.playerName,
          };
          broadcastToRoom(result.room.roomId, opponentJoinedMsg, ws);

          // 發送遊戲開始給新加入的玩家
          const gameStartMsg: GameServerMessage = {
            type: 'game_start',
            gameState: result.room.gameState,
            yourColor: result.color,
          };
          ws.send(JSON.stringify(gameStartMsg));

          // 發送遊戲開始給房主（第一個玩家）
          const hostStartMsg: GameServerMessage = {
            type: 'game_start',
            gameState: result.room.gameState,
            yourColor: 'red',
          };
          broadcastToRoom(result.room.roomId, hostStartMsg, ws);

          console.log(`Game started: ${result.room.roomId}`);
        }
      } catch (error) {
        console.error('Error joining room:', error);
        sendError(ws, '加入房間失敗');
      }
      break;
    }

    case 'make_move': {
      const playerInfo = gamePlayers.get(ws);
      if (!playerInfo) {
        sendError(ws, '請先加入房間');
        return;
      }

      try {
        const roomData = await roomManager.getRoom(playerInfo.roomId);
        if (!roomData) {
          sendError(ws, '房間不存在');
          return;
        }

        // 驗證移動
        const validation = validateMove(roomData.gameState, message.move, playerInfo.color);
        if (!validation.valid) {
          const invalidMsg: GameServerMessage = {
            type: 'invalid_move',
            reason: validation.error || '非法移動',
          };
          ws.send(JSON.stringify(invalidMsg));
          return;
        }

        // 執行移動
        const newGameState = applyMove(roomData.gameState, message.move, playerInfo.color);

        // 更新房間狀態
        await roomManager.updateGameState(playerInfo.roomId, newGameState);

        // 廣播移動給所有玩家
        const moveMadeMsg: GameServerMessage = {
          type: 'move_made',
          gameState: newGameState,
          lastMove: message.move,
          movedBy: playerInfo.color,
        };
        broadcastToRoom(playerInfo.roomId, moveMadeMsg);

        // 檢查遊戲是否結束
        if (newGameState.winner) {
          const gameOverMsg: GameServerMessage = {
            type: 'game_over',
            winner: newGameState.winner,
            gameState: newGameState,
          };
          broadcastToRoom(playerInfo.roomId, gameOverMsg);
          console.log(`Game over: ${playerInfo.roomId}, winner: ${newGameState.winner}`);
        }

        console.log(`Move made: ${playerInfo.playerName} (${playerInfo.color})`);
      } catch (error) {
        console.error('Error making move:', error);
        sendError(ws, '執行移動失敗');
      }
      break;
    }

    case 'leave_room': {
      ws.close();
      break;
    }
  }
}

// 加入遊戲房間
function joinGameRoom(
  ws: WebSocket,
  roomId: string,
  playerName: string,
  color: PieceColor
) {
  if (!gameRooms.has(roomId)) {
    gameRooms.set(roomId, new Map());
  }

  gameRooms.get(roomId)!.set(color, ws);
  gamePlayers.set(ws, { playerName, roomId, color });
}

// 廣播訊息給房間內的所有人
function broadcastToRoom(roomId: string, message: GameServerMessage, exclude?: WebSocket) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  const data = JSON.stringify(message);
  room.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 發送錯誤訊息
function sendError(ws: WebSocket, message: string) {
  const errorMsg: GameServerMessage = {
    type: 'error',
    message,
  };
  ws.send(JSON.stringify(errorMsg));
  console.error(`Error: ${message}`);
}

// 取得遊戲統計資訊
export function getGameStats() {
  return {
    totalGameRooms: gameRooms.size,
    totalGamePlayers: gamePlayers.size,
    rooms: Array.from(gameRooms.entries()).map(([roomId, clients]) => ({
      roomId,
      playerCount: clients.size,
    })),
  };
}
