// services/game-service/src/game/roomManager.ts
import redis from '../redis/client.js';
import type { GameState, PieceColor } from '@yumyum/types';

// 房間資料結構
export interface RoomData {
  roomId: string;
  players: {
    red: { playerId: string; playerName: string } | null;
    blue: { playerId: string; playerName: string } | null;
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

// 生成房間 ID（8位隨機字符）
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 創建新房間
export async function createRoom(
  playerId: string,
  playerName: string
): Promise<RoomData> {
  const roomId = generateRoomId();
  const now = Date.now();

  const roomData: RoomData = {
    roomId,
    players: {
      red: { playerId, playerName },
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

  console.log(`🆕 房間已創建: ${roomId} by ${playerName}`);
  return roomData;
}

// 加入房間
export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string
): Promise<{ success: boolean; room?: RoomData; error?: string; color?: PieceColor }> {
  const roomData = await getRoom(roomId);

  if (!roomData) {
    return { success: false, error: '房間不存在' };
  }

  if (roomData.status !== 'waiting') {
    return { success: false, error: '房間已開始遊戲' };
  }

  // 檢查房間是否已滿
  if (roomData.players.blue !== null) {
    return { success: false, error: '房間已滿' };
  }

  // 加入為藍方
  roomData.players.blue = { playerId, playerName };
  roomData.status = 'playing';
  roomData.lastActivity = Date.now();

  await saveRoom(roomData);

  console.log(`👤 玩家加入房間: ${playerName} → ${roomId}`);
  return { success: true, room: roomData, color: 'blue' };
}

// 重新連線
export async function rejoinRoom(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; room?: RoomData; color?: PieceColor; error?: string }> {
  const roomData = await getRoom(roomId);

  if (!roomData) {
    return { success: false, error: '房間不存在或已過期' };
  }

  // 檢查玩家是否在房間中
  let color: PieceColor | undefined;
  if (roomData.players.red?.playerId === playerId) {
    color = 'red';
  } else if (roomData.players.blue?.playerId === playerId) {
    color = 'blue';
  }

  if (!color) {
    return { success: false, error: '你不在此房間中' };
  }

  roomData.lastActivity = Date.now();
  await saveRoom(roomData);

  console.log(`🔄 玩家重連: ${playerId} → ${roomId} (${color})`);
  return { success: true, room: roomData, color };
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
