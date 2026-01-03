// packages/web/src/lib/gameLogic.test.ts
// 遊戲規則引擎測試

import { describe, it, expect } from 'vitest';
import {
  canPlacePieceFromReserve,
  canMovePieceOnBoard,
  checkWinner,
  placePieceFromReserve,
  movePieceOnBoard,
} from './gameLogic';
import { GameState } from '@yumyum/types';

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
    currentPlayer: 'red',
    winner: null,
  };
}

describe('遊戲規則引擎', () => {
  describe('從儲備區放置棋子驗證', () => {
    it('應該允許紅方在空格放置棋子', () => {
      const gameState = createEmptyGameState();
      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'small');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該拒絕非當前玩家放置棋子', () => {
      const gameState = createEmptyGameState();
      gameState.currentPlayer = 'red';

      const result = canPlacePieceFromReserve(gameState, 0, 0, 'blue', 'small');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('還不是你的回合');
    });

    it('應該拒絕放置已用完的棋子', () => {
      const gameState = createEmptyGameState();
      gameState.reserves.red.small = 0;

      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'small');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('該尺寸的棋子已用完');
    });

    it('應該允許大棋子覆蓋對手的小棋子', () => {
      const gameState = createEmptyGameState();
      // 先放對手的小棋子
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });

      // 紅方用大棋子覆蓋對手
      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'large');

      expect(result.valid).toBe(true);
    });

    it('應該允許中棋子覆蓋對手的小棋子', () => {
      const gameState = createEmptyGameState();
      // 先放對手的小棋子
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });

      // 紅方用中棋子覆蓋對手
      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'medium');

      expect(result.valid).toBe(true);
    });

    it('應該拒絕覆蓋自己的棋子', () => {
      const gameState = createEmptyGameState();
      // 紅方先放一個小棋子
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });

      // 紅方嘗試用大棋子覆蓋自己的小棋子
      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'large');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('不能覆蓋自己的棋子');
    });

    it('應該拒絕同尺寸棋子覆蓋對手', () => {
      const gameState = createEmptyGameState();
      // 對手的中棋子
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'medium' });

      // 紅方嘗試用同尺寸覆蓋
      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'medium');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('不能用同尺寸的棋子覆蓋');
    });

    it('應該拒絕小棋子覆蓋對手的大棋子', () => {
      const gameState = createEmptyGameState();
      // 對手的大棋子
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'large' });

      // 紅方嘗試用小棋子覆蓋
      const result = canPlacePieceFromReserve(gameState, 0, 0, 'red', 'small');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('只能用大棋子覆蓋小棋子');
    });
  });

  describe('在棋盤上移動棋子驗證', () => {
    it('應該允許移動到空格', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });

      const result = canMovePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(result.valid).toBe(true);
    });

    it('應該拒絕移動到同一個格子', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });

      const result = canMovePieceOnBoard(gameState, 0, 0, 0, 0);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('請選擇不同的格子');
    });

    it('應該拒絕移動空格子', () => {
      const gameState = createEmptyGameState();

      const result = canMovePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('該格子沒有棋子');
    });

    it('應該拒絕移動非當前玩家的棋子', () => {
      const gameState = createEmptyGameState();
      gameState.currentPlayer = 'red';
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });

      const result = canMovePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('還不是你的回合');
    });

    it('應該允許移動並覆蓋對手較小的棋子', () => {
      const gameState = createEmptyGameState();
      // 紅方的大棋子
      gameState.board[0][0].pieces.push({ color: 'red', size: 'large' });
      // 對手的小棋子
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'small' });

      const result = canMovePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(result.valid).toBe(true);
    });

    it('應該拒絕移動並覆蓋自己的棋子', () => {
      const gameState = createEmptyGameState();
      // 紅方的大棋子
      gameState.board[0][0].pieces.push({ color: 'red', size: 'large' });
      // 紅方的小棋子
      gameState.board[1][1].pieces.push({ color: 'red', size: 'small' });

      const result = canMovePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('不能覆蓋自己的棋子');
    });

    it('應該拒絕移動並覆蓋對手同尺寸棋子', () => {
      const gameState = createEmptyGameState();
      // 紅方的中棋子
      gameState.board[0][0].pieces.push({ color: 'red', size: 'medium' });
      // 對手的中棋子
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });

      const result = canMovePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('不能用同尺寸的棋子覆蓋');
    });
  });

  describe('勝利判定', () => {
    it('應該偵測橫向連線（第一行）', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });
      gameState.board[0][2].pieces.push({ color: 'red', size: 'large' });

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('應該偵測橫向連線（第二行）', () => {
      const gameState = createEmptyGameState();
      gameState.board[1][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });
      gameState.board[1][2].pieces.push({ color: 'blue', size: 'large' });

      const winner = checkWinner(gameState);

      expect(winner).toBe('blue');
    });

    it('應該偵測縱向連線（第一列）', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[1][0].pieces.push({ color: 'red', size: 'medium' });
      gameState.board[2][0].pieces.push({ color: 'red', size: 'large' });

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('應該偵測對角線連線（左上到右下）', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[1][1].pieces.push({ color: 'blue', size: 'medium' });
      gameState.board[2][2].pieces.push({ color: 'blue', size: 'large' });

      const winner = checkWinner(gameState);

      expect(winner).toBe('blue');
    });

    it('應該偵測對角線連線（右上到左下）', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][2].pieces.push({ color: 'red', size: 'small' });
      gameState.board[1][1].pieces.push({ color: 'red', size: 'medium' });
      gameState.board[2][0].pieces.push({ color: 'red', size: 'large' });

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('應該只看最上層棋子的顏色', () => {
      const gameState = createEmptyGameState();
      // 底層是藍色，但最上層是紅色
      gameState.board[0][0].pieces.push({ color: 'blue', size: 'small' });
      gameState.board[0][0].pieces.push({ color: 'red', size: 'large' });

      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });
      gameState.board[0][2].pieces.push({ color: 'red', size: 'small' });

      const winner = checkWinner(gameState);

      expect(winner).toBe('red');
    });

    it('沒有連線時應該返回 null', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'blue', size: 'medium' });
      gameState.board[0][2].pieces.push({ color: 'red', size: 'large' });

      const winner = checkWinner(gameState);

      expect(winner).toBeNull();
    });
  });

  describe('執行放置棋子', () => {
    it('應該正確放置棋子並減少儲備', () => {
      const gameState = createEmptyGameState();
      const newState = placePieceFromReserve(gameState, 0, 0, 'red', 'small');

      expect(newState.board[0][0].pieces).toHaveLength(1);
      expect(newState.board[0][0].pieces[0]).toEqual({ color: 'red', size: 'small' });
      expect(newState.reserves.red.small).toBe(1);
    });

    it('應該在放置後切換玩家', () => {
      const gameState = createEmptyGameState();
      const newState = placePieceFromReserve(gameState, 0, 0, 'red', 'small');

      expect(newState.currentPlayer).toBe('blue');
    });

    it('應該偵測並設定勝利者', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });
      // 放置第三個棋子形成連線

      const newState = placePieceFromReserve(gameState, 0, 2, 'red', 'large');

      expect(newState.winner).toBe('red');
      // 獲勝後不應該切換玩家
      expect(newState.currentPlayer).toBe('red');
    });
  });

  describe('執行移動棋子', () => {
    it('應該正確移動棋子', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });

      const newState = movePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(newState.board[0][0].pieces).toHaveLength(0);
      expect(newState.board[1][1].pieces).toHaveLength(1);
      expect(newState.board[1][1].pieces[0]).toEqual({ color: 'red', size: 'small' });
    });

    it('應該在移動後切換玩家', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });

      const newState = movePieceOnBoard(gameState, 0, 0, 1, 1);

      expect(newState.currentPlayer).toBe('blue');
    });

    it('應該偵測並設定勝利者', () => {
      const gameState = createEmptyGameState();
      gameState.board[0][0].pieces.push({ color: 'red', size: 'small' });
      gameState.board[0][1].pieces.push({ color: 'red', size: 'medium' });
      gameState.board[1][1].pieces.push({ color: 'red', size: 'large' });

      // 移動形成連線
      const newState = movePieceOnBoard(gameState, 1, 1, 0, 2);

      expect(newState.winner).toBe('red');
    });
  });
});
