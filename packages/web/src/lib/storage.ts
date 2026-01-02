// packages/web/src/lib/storage.ts

import { GameState, PieceColor } from '@yumyum/types'; // 假設 GameState 和 PieceColor 來自 shared/types

const LOCAL_GAME_STATE_KEY = 'yumyum:local:gameState';
const AI_GAME_STATE_KEY = 'yumyum:ai:gameState';
const AI_DIFFICULTY_KEY = 'yumyum:ai:difficulty';
const ONLINE_ROOM_ID_KEY = 'yumyum:online:roomId';
const ONLINE_PLAYER_ID_KEY = 'yumyum:online:playerId';
const ONLINE_PLAYER_COLOR_KEY = 'yumyum:online:playerColor';

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
