// 遊戲常數與共用型別定義
import type { GameState, PieceColor, PieceSize } from '@yumyum/types';

// 選擇狀態類型（從儲備區或棋盤選擇棋子）
export type SelectedPiece = {
  type: 'reserve';
  color: PieceColor;
  size: PieceSize;
} | {
  type: 'board';
  row: number;
  col: number;
} | null;

// 初始遊戲狀態：空棋盤，每個玩家各有 2 個小/中/大棋子
export const initialGameState: GameState = {
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
