// services/game-service/src/websocket/gameHandler.ts
import { WebSocket } from 'ws';
import type { GameClientMessage, GameServerMessage, PieceColor } from '@yumyum/types';
import * as roomManager from '../game/roomManager.js';
import { validateMove, applyMove } from '../game/gameLogic.js';

// 儲存房間內的 WebSocket 連線（roomId -> Set<WebSocket>）
const gameRooms = new Map<string, Set<WebSocket>>();

// 儲存 WebSocket 對應的玩家資訊
const gamePlayers = new Map<
  WebSocket,
  { playerId: string; playerName: string; roomId: string; color: PieceColor }
>();

export function handleGameWebSocketConnection(ws: WebSocket, roomId: string) {
  console.log(`🎮 遊戲 WebSocket 連線: roomId=${roomId}`);

  // 處理客戶端訊息
  ws.on('message', async (data) => {
    try {
      const message: GameClientMessage = JSON.parse(data.toString());
      await handleGameClientMessage(ws, message);
    } catch (error) {
      console.error('處理遊戲訊息錯誤:', error);
      const errorMsg: GameServerMessage = {
        type: 'error',
        message: '無效的訊息格式',
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  // 處理連線關閉
  ws.on('close', () => {
    const playerInfo = gamePlayers.get(ws);
    if (playerInfo) {
      console.log(`🚪 玩家離開: ${playerInfo.playerName} (${playerInfo.roomId})`);

      // 從房間移除
      gameRooms.get(playerInfo.roomId)?.delete(ws);
      gamePlayers.delete(ws);

      // 通知對手
      const leaveMsg: GameServerMessage = {
        type: 'opponent_left',
      };
      broadcastToRoom(playerInfo.roomId, leaveMsg, ws);

      // 清理空房間
      if (gameRooms.get(playerInfo.roomId)?.size === 0) {
        gameRooms.delete(playerInfo.roomId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('🔴 WebSocket 錯誤:', error);
  });
}

async function handleGameClientMessage(
  ws: WebSocket,
  message: GameClientMessage
) {
  switch (message.type) {
    case 'create_room': {
      try {
        const roomData = await roomManager.createRoom(
          generatePlayerId(),
          message.playerName
        );

        // 加入房間
        joinGameRoom(ws, roomData.roomId, roomData.players.red!.playerId, message.playerName, 'red');

        const response: GameServerMessage = {
          type: 'room_created',
          roomId: roomData.roomId,
          playerId: roomData.players.red!.playerId,
        };
        ws.send(JSON.stringify(response));

        const waitingMsg: GameServerMessage = {
          type: 'waiting_for_opponent',
        };
        ws.send(JSON.stringify(waitingMsg));

        console.log(`✅ 房間創建成功: ${roomData.roomId}`);
      } catch (_error) {
        sendError(ws, '創建房間失敗');
      }
      break;
    }

    case 'join_room': {
      try {
        const playerId = generatePlayerId();
        const result = await roomManager.joinRoom(message.roomId, playerId, message.playerName);

        if (!result.success || !result.room || !result.color) {
          sendError(ws, result.error || '加入房間失敗');
          return;
        }

        // 加入房間
        joinGameRoom(ws, result.room.roomId, playerId, message.playerName, result.color);

        // 通知加入者
        const joinedMsg: GameServerMessage = {
          type: 'room_joined',
          roomId: result.room.roomId,
          playerId,
          color: result.color,
        };
        ws.send(JSON.stringify(joinedMsg));

        // 通知房主對手已加入
        const opponentJoinedMsg: GameServerMessage = {
          type: 'opponent_joined',
          opponentName: message.playerName,
        };
        broadcastToRoom(result.room.roomId, opponentJoinedMsg, ws);

        // 開始遊戲 - 廣播給雙方
        const gameStartMsg: GameServerMessage = {
          type: 'game_start',
          gameState: result.room.gameState,
          yourColor: result.color,
        };
        ws.send(JSON.stringify(gameStartMsg));

        const hostStartMsg: GameServerMessage = {
          type: 'game_start',
          gameState: result.room.gameState,
          yourColor: 'red',
        };
        broadcastToRoom(result.room.roomId, hostStartMsg, ws);

        console.log(`✅ 玩家加入: ${message.playerName} → ${result.room.roomId}`);
      } catch (_error) {
        sendError(ws, '加入房間失敗');
      }
      break;
    }

    case 'rejoin_room': {
      try {
        const result = await roomManager.rejoinRoom(message.roomId, message.playerId);

        if (!result.success || !result.room || !result.color) {
          sendError(ws, result.error || '重連失敗');
          return;
        }

        const playerName =
          result.color === 'red'
            ? result.room.players.red?.playerName || 'Unknown'
            : result.room.players.blue?.playerName || 'Unknown';

        // 重新加入房間
        joinGameRoom(ws, result.room.roomId, message.playerId, playerName, result.color);

        // 發送重連成功訊息
        const reconnectedMsg: GameServerMessage = {
          type: 'reconnected',
          gameState: result.room.gameState,
          yourColor: result.color,
        };
        ws.send(JSON.stringify(reconnectedMsg));

        console.log(`🔄 重連成功: ${message.playerId} → ${result.room.roomId}`);
      } catch (_error) {
        sendError(ws, '重連失敗');
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
          console.log(`🏆 遊戲結束: ${playerInfo.roomId}, 勝利者: ${newGameState.winner}`);
        }

        console.log(`♟️ 移動成功: ${playerInfo.playerName} (${playerInfo.color})`);
      } catch (error) {
        console.error('執行移動失敗:', error);
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
  playerId: string,
  playerName: string,
  color: PieceColor
) {
  if (!gameRooms.has(roomId)) {
    gameRooms.set(roomId, new Set());
  }

  gameRooms.get(roomId)!.add(ws);
  gamePlayers.set(ws, { playerId, playerName, roomId, color });
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
  console.error(`❌ 錯誤: ${message}`);
}

// 生成玩家 ID
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
