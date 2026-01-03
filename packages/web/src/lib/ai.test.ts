// packages/web/src/lib/ai.test.ts
// AI 對手測試

import { describe, it, expect } from 'vitest';
import { GameState, PieceColor } from '@yumyum/types';
import {
  getEasyAIMove,
  getMediumAIMove,
  getHardAIMove,
  getAIMove,
  AIMove,
} from './ai';
import {
  canPlacePieceFromReserve,
  canMovePieceOnBoard,
  checkWinner,
} from './gameLogic';

// 建立空棋盤的輔助函數
function createEmptyGameState(): GameState {
  return {
    board: [
      [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
      [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
      [{ pieces: [] }, { pieces: [] }, { pieces: [] }],
    ],
    reserves: {
      red: { small: 2, medium: 2, large: 2 },
      blue: { small: 2, medium: 2, large: 2 },
    },
    currentPlayer: 'blue',
    winner: null,
  };
}

// 驗證移動是否合法
function isMoveValid(gameState: GameState, move: AIMove, color: PieceColor): boolean {
  if (move.type === 'place') {
    const validation = canPlacePieceFromReserve(gameState, move.row, move.col, color, move.size);
    return validation.valid;
  } else {
    const validation = canMovePieceOnBoard(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol);
    return validation.valid;
  }
}

describe('AI 對手', () => {
  describe('簡單 AI', () => {
    it('應該優先選擇獲勝移動', () => {
      const gameState = createEmptyGameState();
      // 藍方已經有兩個連線
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'blue', size: 'medium' });
      // 第三個位置是空的，AI 應該選擇這裡來獲勝

      const move = getEasyAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('place');
      if (move?.type === 'place') {
        expect(move.row).toBe(0);
        expect(move.col).toBe(2);
      }
    });

    it('應該優先阻擋對手獲勝', () => {
      const gameState = createEmptyGameState();
      // 紅方已經有兩個連線，即將獲勝
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });
      // 第三個位置是空的，藍方 AI 應該阻擋

      const move = getEasyAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('place');
      if (move?.type === 'place') {
        expect(move.row).toBe(0);
        expect(move.col).toBe(2);
      }
    });

    it('不應該下出非法移動', () => {
      const gameState = createEmptyGameState();
      // 放置一些隨機棋子
      gameState.board[0][0].pieces.push({ color: 'red', size: 'large' });
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });

      const move = getEasyAIMove(gameState, 'blue');

      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });

    it('應該在無可選擇時返回某個合法移動', () => {
      const gameState = createEmptyGameState();

      const move = getEasyAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });
  });

  describe('中等 AI (Minimax)', () => {
    it('不應該下出非法移動', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'large' });
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });

      const move = getMediumAIMove(gameState, 'blue');

      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });

    it('應該優先選擇獲勝移動', () => {
      const gameState = createEmptyGameState();
      // 藍方已經有兩個連線
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'blue', size: 'medium' });

      const move = getMediumAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('place');
      if (move?.type === 'place') {
        expect(move.row).toBe(0);
        expect(move.col).toBe(2);
      }
    });

    it('應該阻擋對手獲勝', () => {
      const gameState = createEmptyGameState();
      // 紅方已經有兩個連線
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });

      const move = getMediumAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('place');
      if (move?.type === 'place') {
        expect(move.row).toBe(0);
        expect(move.col).toBe(2);
      }
    });

    it('應該能正確評估簡單棋局', () => {
      const gameState = createEmptyGameState();
      // 設置一個簡單的棋局
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });

      const move = getMediumAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });
  });

  describe('困難 AI (Alpha-Beta)', () => {
    it('不應該下出非法移動', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'large' });
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });

      const move = getHardAIMove(gameState, 'blue');

      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });

    it('應該優先選擇獲勝移動', () => {
      const gameState = createEmptyGameState();
      // 藍方已經有兩個連線
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'blue', size: 'medium' });

      const move = getHardAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('place');
      if (move?.type === 'place') {
        expect(move.row).toBe(0);
        expect(move.col).toBe(2);
      }
    });

    it('應該阻擋對手獲勝', () => {
      const gameState = createEmptyGameState();
      // 紅方已經有兩個連線
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });

      const move = getHardAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('place');
      if (move?.type === 'place') {
        expect(move.row).toBe(0);
        expect(move.col).toBe(2);
      }
    });

    it('應該在複雜棋局中做出合理決策', () => {
      const gameState = createEmptyGameState();
      // 設置一個較複雜的棋局
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[1][1].pieces.push({ color: 'red', size: 'medium' });
      gameState.board[2][2].pieces.push({ color: 'blue', size: 'large' });

      const move = getHardAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });
  });

  describe('getAIMove 函數', () => {
    it('應該根據難度返回正確的 AI 移動', () => {
      const gameState = createEmptyGameState();

      const easyMove = getAIMove(gameState, 'blue', 'easy');
      const mediumMove = getAIMove(gameState, 'blue', 'medium');
      const hardMove = getAIMove(gameState, 'blue', 'hard');

      expect(easyMove).not.toBeNull();
      expect(mediumMove).not.toBeNull();
      expect(hardMove).not.toBeNull();

      if (easyMove) {
        expect(isMoveValid(gameState, easyMove, 'blue')).toBe(true);
      }
      if (mediumMove) {
        expect(isMoveValid(gameState, mediumMove, 'blue')).toBe(true);
      }
      if (hardMove) {
        expect(isMoveValid(gameState, hardMove, 'blue')).toBe(true);
      }
    });

    it('所有難度的 AI 都應該優先獲勝', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'blue', size: 'medium' });

      const easyMove = getAIMove(gameState, 'blue', 'easy');
      const mediumMove = getAIMove(gameState, 'blue', 'medium');
      const hardMove = getAIMove(gameState, 'blue', 'hard');

      // 所有 AI 都應該選擇獲勝移動
      expect(easyMove?.type).toBe('place');
      expect(mediumMove?.type).toBe('place');
      expect(hardMove?.type).toBe('place');

      if (easyMove?.type === 'place') {
        expect(easyMove.row).toBe(0);
        expect(easyMove.col).toBe(2);
      }
      if (mediumMove?.type === 'place') {
        expect(mediumMove.row).toBe(0);
        expect(mediumMove.col).toBe(2);
      }
      if (hardMove?.type === 'place') {
        expect(hardMove.row).toBe(0);
        expect(hardMove.col).toBe(2);
      }
    });
  });

  describe('邊界情況', () => {
    it('應該處理沒有合法移動的情況', () => {
      const gameState = createEmptyGameState();
      // 清空所有儲備
      gameState.reserves.blue = { small: 0, medium: 0, large: 0 };
      // 棋盤上沒有藍方的棋子

      const easyMove = getEasyAIMove(gameState, 'blue');
      const mediumMove = getMediumAIMove(gameState, 'blue');
      const hardMove = getHardAIMove(gameState, 'blue');

      expect(easyMove).toBeNull();
      expect(mediumMove).toBeNull();
      expect(hardMove).toBeNull();
    });

    it('應該能處理只剩移動選項的情況', () => {
      const gameState = createEmptyGameState();
      // 清空儲備
      gameState.reserves.blue = { small: 0, medium: 0, large: 0 };
      // 但棋盤上有藍方的棋子
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'large' });

      const move = getEasyAIMove(gameState, 'blue');

      expect(move).not.toBeNull();
      expect(move?.type).toBe('move');
      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });

    it('應該能處理只能覆蓋對手棋子的情況', () => {
      const gameState = createEmptyGameState();
      // 所有格子都被佔據
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          gameState.board[i][j].pieces.push({ color: 'red', size: 'small' });
        }
      }

      const move = getEasyAIMove(gameState, 'blue');

      // 應該能找到覆蓋對手的移動
      expect(move).not.toBeNull();
      if (move !== null) {
        expect(isMoveValid(gameState, move, 'blue')).toBe(true);
      }
    });
  });
});
