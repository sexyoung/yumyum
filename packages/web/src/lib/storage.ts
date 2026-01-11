// packages/web/src/lib/storage.ts

import { GameState, PieceColor, PlayerIdentity } from '@yumyum/types';

const LANGUAGE_KEY = 'yumyum:language';
const LOCAL_GAME_STATE_KEY = 'yumyum:local:gameState';
const AI_GAME_STATE_KEY = 'yumyum:ai:gameState';
const AI_DIFFICULTY_KEY = 'yumyum:ai:difficulty';
const ONLINE_ROOM_ID_KEY = 'yumyum:online:roomId';
const ONLINE_PLAYER_ID_KEY = 'yumyum:online:playerId';
const ONLINE_PLAYER_COLOR_KEY = 'yumyum:online:playerColor';

// 玩家身份相關
const PLAYER_UUID_KEY = 'yumyum:player:uuid';
const PLAYER_USERNAME_KEY = 'yumyum:player:username';
const PLAYER_DB_ID_KEY = 'yumyum:player:id';

type AIDifficulty = 'easy' | 'medium' | 'hard';

// --- 本機雙人遊戲狀態 ---
export const saveLocalGameState = (gameState: GameState): void => {
  try {
    localStorage.setItem(LOCAL_GAME_STATE_KEY, JSON.stringify(gameState));
  } catch (error) {
    console.error('儲存本機遊戲狀態失敗:', error);
  }
};

export const loadLocalGameState = (): GameState | null => {
  try {
    const serializedGameState = localStorage.getItem(LOCAL_GAME_STATE_KEY);
    if (serializedGameState === null) {
      return null;
    }
    return JSON.parse(serializedGameState);
  } catch (error) {
    console.error('載入本機遊戲狀態失敗:', error);
    return null;
  }
};

export const clearLocalGameState = (): void => {
  try {
    localStorage.removeItem(LOCAL_GAME_STATE_KEY);
  } catch (error) {
    console.error('清除本機遊戲狀態失敗:', error);
  }
};

// --- 單人 AI 遊戲狀態 ---
export const saveAIGameState = (gameState: GameState, difficulty: AIDifficulty): void => {
  try {
    localStorage.setItem(AI_GAME_STATE_KEY, JSON.stringify(gameState));
    localStorage.setItem(AI_DIFFICULTY_KEY, difficulty);
  } catch (error) {
    console.error('儲存 AI 遊戲狀態失敗:', error);
  }
};

export const loadAIGameState = (): { gameState: GameState; difficulty: AIDifficulty } | null => {
  try {
    const serializedGameState = localStorage.getItem(AI_GAME_STATE_KEY);
    const difficulty = localStorage.getItem(AI_DIFFICULTY_KEY) as AIDifficulty | null;

    if (serializedGameState === null || difficulty === null) {
      return null;
    }
    return {
      gameState: JSON.parse(serializedGameState),
      difficulty: difficulty,
    };
  } catch (error) {
    console.error('載入 AI 遊戲狀態失敗:', error);
    return null;
  }
};

export const clearAIGameState = (): void => {
  try {
    localStorage.removeItem(AI_GAME_STATE_KEY);
    localStorage.removeItem(AI_DIFFICULTY_KEY);
  } catch (error) {
    console.error('清除 AI 遊戲狀態失敗:', error);
  }
};

// --- 線上遊戲房間資訊 ---
export const saveOnlineRoomInfo = (roomId: string, playerId: string, playerColor: PieceColor): void => {
  try {
    localStorage.setItem(ONLINE_ROOM_ID_KEY, roomId);
    localStorage.setItem(ONLINE_PLAYER_ID_KEY, playerId);
    localStorage.setItem(ONLINE_PLAYER_COLOR_KEY, playerColor);
  } catch (error) {
    console.error('儲存線上房間資訊失敗:', error);
  }
};

export const loadOnlineRoomInfo = (): { roomId: string; playerId: string; playerColor: PieceColor } | null => {
  try {
    const roomId = localStorage.getItem(ONLINE_ROOM_ID_KEY);
    const playerId = localStorage.getItem(ONLINE_PLAYER_ID_KEY);
    const playerColor = localStorage.getItem(ONLINE_PLAYER_COLOR_KEY) as PieceColor | null;

    if (roomId === null || playerId === null || playerColor === null) {
      return null;
    }
    return { roomId, playerId, playerColor };
  } catch (error) {
    console.error('載入線上房間資訊失敗:', error);
    return null;
  }
};

export const clearOnlineRoomInfo = (): void => {
  try {
    localStorage.removeItem(ONLINE_ROOM_ID_KEY);
    localStorage.removeItem(ONLINE_PLAYER_ID_KEY);
    localStorage.removeItem(ONLINE_PLAYER_COLOR_KEY);
  } catch (error) {
    console.error('清除線上房間資訊失敗:', error);
  }
};

// --- 玩家身份管理 ---

// 生成新的 UUID（支援舊版瀏覽器）
export const generatePlayerUuid = (): string => {
  // 優先使用原生 API
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: 使用 crypto.getRandomValues 手動生成 UUID v4
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // 設定 version (4) 和 variant (RFC4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // 最後備案：使用 Math.random（不推薦但至少能用）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 獲取玩家身份
export const getPlayerIdentity = (): PlayerIdentity | null => {
  try {
    const uuid = localStorage.getItem(PLAYER_UUID_KEY);
    const username = localStorage.getItem(PLAYER_USERNAME_KEY);

    if (!uuid || !username) {
      return null;
    }

    const playerIdStr = localStorage.getItem(PLAYER_DB_ID_KEY);
    const playerId = playerIdStr ? parseInt(playerIdStr, 10) : undefined;

    return { uuid, username, playerId };
  } catch (error) {
    console.error('載入玩家身份失敗:', error);
    return null;
  }
};

// 儲存玩家身份
export const setPlayerIdentity = (identity: PlayerIdentity): void => {
  try {
    localStorage.setItem(PLAYER_UUID_KEY, identity.uuid);
    localStorage.setItem(PLAYER_USERNAME_KEY, identity.username);
    if (identity.playerId !== undefined) {
      localStorage.setItem(PLAYER_DB_ID_KEY, identity.playerId.toString());
    }
  } catch (error) {
    console.error('儲存玩家身份失敗:', error);
  }
};

// 更新玩家暱稱
export const updatePlayerUsername = (username: string): void => {
  try {
    localStorage.setItem(PLAYER_USERNAME_KEY, username);
  } catch (error) {
    console.error('更新玩家暱稱失敗:', error);
  }
};

// 清除玩家身份
export const clearPlayerIdentity = (): void => {
  try {
    localStorage.removeItem(PLAYER_UUID_KEY);
    localStorage.removeItem(PLAYER_USERNAME_KEY);
    localStorage.removeItem(PLAYER_DB_ID_KEY);
  } catch (error) {
    console.error('清除玩家身份失敗:', error);
  }
};

// --- 語言偏好設定 ---
export const getLanguagePreference = (): string | null => {
  try {
    return localStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('讀取語言偏好失敗:', error);
    return null;
  }
};

export const setLanguagePreference = (lang: string): void => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.error('儲存語言偏好失敗:', error);
  }
};
