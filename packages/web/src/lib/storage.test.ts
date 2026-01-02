import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveLocalGameState,
  loadLocalGameState,
  clearLocalGameState,
  saveAIGameState,
  loadAIGameState,
  clearAIGameState,
  saveOnlineRoomInfo,
  loadOnlineRoomInfo,
  clearOnlineRoomInfo,
} from './storage';
import type { GameState, PieceColor } from '@yumyum/types';

// Mock GameState for testing
const createMockGameState = (): GameState => ({
  board: [[{ pieces: [] }, { pieces: [] }, { pieces: [] }],
          [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
          [{ pieces: [] }, { pieces: [] }, { pieces: [] }]],
  reserves: {
    red: { small: 2, medium: 2, large: 2 },
    blue: { small: 2, medium: 2, large: 2 },
  },
  currentPlayer: 'red',
  winner: null,
});

describe('localStorage 管理', () => {
  beforeEach(() => {
    // 每個測試前清空 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('本機雙人遊戲狀態', () => {
    it('應該能保存和讀取遊戲狀態', () => {
      const gameState = createMockGameState();
      gameState.currentPlayer = 'blue';

      saveLocalGameState(gameState);
      const loaded = loadLocalGameState();

      expect(loaded).toEqual(gameState);
    });

    it('localStorage 為空時應該返回 null', () => {
      const loaded = loadLocalGameState();

      expect(loaded).toBeNull();
    });

    it('應該能清除遊戲狀態', () => {
      const gameState = createMockGameState();
      saveLocalGameState(gameState);

      clearLocalGameState();
      const loaded = loadLocalGameState();

      expect(loaded).toBeNull();
    });

    it('應該處理損壞的 JSON 數據', () => {
      localStorage.setItem('yumyum:local:gameState', 'invalid json');

      const loaded = loadLocalGameState();

      expect(loaded).toBeNull();
    });
  });

  describe('AI 遊戲狀態', () => {
    it('應該能保存和讀取 AI 遊戲狀態及難度', () => {
      const gameState = createMockGameState();
      const difficulty = 'medium';

      saveAIGameState(gameState, difficulty);
      const loaded = loadAIGameState();

      expect(loaded).toBeDefined();
      expect(loaded?.gameState).toEqual(gameState);
      expect(loaded?.difficulty).toBe('medium');
    });

    it('應該能清除 AI 遊戲狀態', () => {
        const gameState = createMockGameState();
        const difficulty = 'hard';

        saveAIGameState(gameState, difficulty);
        clearAIGameState();
        const loaded = loadAIGameState();

        expect(loaded).toBeNull();
    });

    it('localStorage 為空時應該返回 null', () => {
        const loaded = loadAIGameState();
  
        expect(loaded).toBeNull();
    });
  });

  describe('線上遊戲房間資訊', () => {
    it('應該能保存和讀取房間資訊', () => {
      const roomInfo = {
        roomId: 'test-room-123',
        playerId: 'player-456',
        playerColor: 'red' as PieceColor,
      };

      saveOnlineRoomInfo(roomInfo.roomId, roomInfo.playerId, roomInfo.playerColor);
      const loaded = loadOnlineRoomInfo();

      expect(loaded).toEqual(roomInfo);
    });

    it('應該能清除房間資訊', () => {
      saveOnlineRoomInfo('room-1', 'player-1', 'red');

      clearOnlineRoomInfo();
      const loaded = loadOnlineRoomInfo();

      expect(loaded).toBeNull();
    });

    it('部分資訊缺失時應該返回 null', () => {
      localStorage.setItem('yumyum:online:roomId', 'test-room');
      // 缺少 playerId

      const loaded = loadOnlineRoomInfo();

      expect(loaded).toBeNull();
    });
  });
});
