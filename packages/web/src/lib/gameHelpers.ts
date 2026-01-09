// 遊戲共用輔助函數
import type { GameState, Piece, MoveRecord } from '@yumyum/types';
import { initialGameState } from './gameConstants';

/**
 * 取得指定格子的頂部棋子
 * @param board - 棋盤狀態
 * @param row - 列索引
 * @param col - 行索引
 * @returns 頂部棋子，若格子為空則返回 undefined
 */
export function getTopPiece(board: GameState['board'], row: number, col: number): Piece | undefined {
  const cell = board[row][col];
  return cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : undefined;
}

/**
 * 計算當前顯示的遊戲狀態（用於回放模式）
 * @param gameState - 當前遊戲狀態
 * @param moveHistory - 移動歷史記錄
 * @param replayStep - 回放步驟
 * @param isReplaying - 是否處於回放模式
 * @returns 應顯示的遊戲狀態
 */
export function getDisplayState(
  gameState: GameState,
  moveHistory: MoveRecord[],
  replayStep: number,
  isReplaying: boolean
): GameState {
  const showReplay = isReplaying || gameState.winner;
  if (!showReplay) {
    return gameState;
  }
  if (replayStep === 0) {
    return initialGameState;
  }
  return moveHistory[replayStep - 1]?.gameStateAfter || gameState;
}

/**
 * 建立錯誤訊息處理器
 * @param setErrorMessage - 設定錯誤訊息的函數
 * @param duration - 訊息顯示時間（毫秒），預設 2000
 * @returns showError 函數
 */
export function createShowError(
  setErrorMessage: (message: string | null) => void,
  duration: number = 2000
): (message: string) => void {
  return (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), duration);
  };
}
