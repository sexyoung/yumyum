// services/game-service/src/game/roomManager.ts
import redis from '../redis/client.js';
import type { GameState, PieceColor } from '@yumyum/types';

// 房間資料結構（玩家靠 WebSocket 連線識別，不需要 playerId）
export interface RoomData {
  roomId: string;
  players: {
    red: { playerName: string } | null;
    blue: { playerName: string } | null;
  };
  gameState: GameState;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  lastActivity: number;
}

const ROOM_PREFIX = 'room:';
const ROOM_TTL = 3600 * 24; // 24小時過期

// 創建初始遊戲狀態
function createInitialGameState(): GameState {
  return {
    board: Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => ({ pieces: [] }))
    ),
    reserves: {
      red: { small: 2, medium: 2, large: 2 },
      blue: { small: 2, medium: 2, large: 2 },
    },
    currentPlayer: 'red',
    winner: null,
  };
}

// 生成房間 ID（4位隨機字符）
function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 創建空房間（HTTP API 使用）
export async function createEmptyRoom(): Promise<string> {
  // 生成不重複的房間 ID
  let roomId: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    roomId = generateRoomId();
    const exists = await redis.exists(`${ROOM_PREFIX}${roomId}`);
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error('無法生成唯一的房間 ID，請稍後再試');
  }

  const now = Date.now();

  const roomData: RoomData = {
    roomId,
    players: {
      red: null,
      blue: null,
    },
    gameState: createInitialGameState(),
    status: 'waiting',
    createdAt: now,
    lastActivity: now,
  };

  await redis.setex(
    `${ROOM_PREFIX}${roomId}`,
    ROOM_TTL,
    JSON.stringify(roomData)
  );

  console.log(`🆕 空房間已創建: ${roomId}`);
  return roomId;
}

// 加入房間（自動找空位，紅方優先）
export async function joinRoom(
  roomId: string,
  playerName: string
): Promise<{ success: boolean; room?: RoomData; error?: string; color?: PieceColor }> {
  const roomData = await getRoom(roomId);

  if (!roomData) {
    return { success: false, error: '房間不存在或已過期' };
  }

  // 找到空位（紅方優先）
  let color: PieceColor | null = null;
  if (roomData.players.red === null) {
    color = 'red';
  } else if (roomData.players.blue === null) {
    color = 'blue';
  }

  if (!color) {
    return { success: false, error: '房間已滿' };
  }

  // 加入該位置
  roomData.players[color] = { playerName };
  roomData.lastActivity = Date.now();

  // 如果兩個玩家都加入了，開始遊戲
  if (roomData.players.red && roomData.players.blue) {
    roomData.status = 'playing';
  }

  await saveRoom(roomData);

  console.log(`👤 玩家加入房間: ${playerName} → ${roomId} (${color})`);
  return { success: true, room: roomData, color };
}

// 離開房間（將玩家設為 null，若房間空了則刪除）
export async function leaveRoom(
  roomId: string,
  color: PieceColor
): Promise<boolean> {
  const roomData = await getRoom(roomId);

  if (!roomData) {
    console.log(`⚠️ 房間不存在: ${roomId}`);
    return true; // 房間不存在視為已刪除
  }

  // 將該玩家設為 null
  roomData.players[color] = null;
  roomData.lastActivity = Date.now();

  console.log(`🚪 玩家離開房間: ${roomId} (${color})`);

  // 如果房間變空了，直接刪除
  if (!roomData.players.red && !roomData.players.blue) {
    await deleteRoom(roomId);
    return true; // 房間已刪除
  }

  // 還有玩家，將狀態改回 waiting
  roomData.status = 'waiting';

  // 如果遊戲已結束，重置棋盤狀態
  if (roomData.gameState.winner !== null) {
    roomData.gameState = createInitialGameState();
    console.log(`🔄 棋盤已重置: ${roomId}`);
  }

  await saveRoom(roomData);
  return false; // 房間仍存在
}

// 獲取房間資料
export async function getRoom(roomId: string): Promise<RoomData | null> {
  const data = await redis.get(`${ROOM_PREFIX}${roomId}`);
  if (!data) return null;

  try {
    return JSON.parse(data) as RoomData;
  } catch (error) {
    console.error('解析房間資料失敗:', error);
    return null;
  }
}

// 保存房間資料
export async function saveRoom(roomData: RoomData): Promise<void> {
  await redis.setex(
    `${ROOM_PREFIX}${roomData.roomId}`,
    ROOM_TTL,
    JSON.stringify(roomData)
  );
}

// 更新遊戲狀態
export async function updateGameState(
  roomId: string,
  gameState: GameState
): Promise<void> {
  const roomData = await getRoom(roomId);
  if (!roomData) {
    throw new Error('房間不存在');
  }

  roomData.gameState = gameState;
  roomData.lastActivity = Date.now();

  // 檢查遊戲是否結束
  if (gameState.winner !== null) {
    roomData.status = 'finished';
  }

  await saveRoom(roomData);
}

// 刪除房間
export async function deleteRoom(roomId: string): Promise<void> {
  await redis.del(`${ROOM_PREFIX}${roomId}`);
  console.log(`🗑️ 房間已刪除: ${roomId}`);
}

// 重置遊戲狀態（再來一局，輸家先手）
export async function resetGameForRematch(roomId: string, lastWinner: PieceColor | null): Promise<RoomData | null> {
  const roomData = await getRoom(roomId);
  if (!roomData) {
    return null;
  }

  // 重置遊戲狀態
  roomData.gameState = createInitialGameState();

  // 輸家先手（如果有 winner 的話）
  if (lastWinner) {
    roomData.gameState.currentPlayer = lastWinner === 'red' ? 'blue' : 'red';
  }

  roomData.status = 'playing';
  roomData.lastActivity = Date.now();

  await saveRoom(roomData);
  console.log(`🔄 房間重置（再來一局）: ${roomId}, 先手: ${roomData.gameState.currentPlayer}`);
  return roomData;
}
