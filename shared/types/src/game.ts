// shared/types/src/game.ts

export type PieceSize = 'small' | 'medium' | 'large';
export type PieceColor = 'red' | 'blue';

export type Position = { row: number; col: number };

export interface Piece {
  color: PieceColor;
  size: PieceSize;
}

export interface Cell {
  pieces: Piece[];  // 堆疊的棋子（由下到上）
}

export interface GameState {
  board: Cell[][];  // 3x3
  reserves: {
    red: { small: number; medium: number; large: number };
    blue: { small: number; medium: number; large: number };
  };
  currentPlayer: PieceColor;
  winner: PieceColor | null;
}
