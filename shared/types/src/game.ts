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

// 遊戲移動類型（用於線上對戰）
export type GameMove =
  | {
      type: 'place';
      row: number;
      col: number;
      size: PieceSize;
    }
  | {
      type: 'move';
      fromRow: number;
      fromCol: number;
      toRow: number;
      toCol: number;
    };

// 移動記錄（用於歷史回放）
export interface MoveRecord {
  step: number;
  player: PieceColor;
  move: GameMove & { color: PieceColor; size: PieceSize };
  capturedPiece?: Piece; // 被吃掉的棋子
  gameStateAfter: GameState; // 這一步之後的遊戲狀態
}
