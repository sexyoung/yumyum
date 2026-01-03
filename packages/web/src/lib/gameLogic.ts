// packages/web/src/lib/gameLogic.ts
// 遊戲規則引擎

import { GameState, PieceSize, PieceColor, Piece } from '@yumyum/types';

// 棋子尺寸大小順序
const SIZE_ORDER: Record<PieceSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

/**
 * 驗證從儲備區放置棋子是否合法
 * @param gameState 當前遊戲狀態
 * @param row 目標行
 * @param col 目標列
 * @param color 棋子顏色
 * @param size 棋子尺寸
 * @returns 是否合法 + 錯誤訊息
 */
export function canPlacePieceFromReserve(
  gameState: GameState,
  row: number,
  col: number,
  color: PieceColor,
  size: PieceSize
): { valid: boolean; error?: string } {
  // 檢查是否為當前玩家
  if (color !== gameState.currentPlayer) {
    return { valid: false, error: '還不是你的回合' };
  }

  // 檢查儲備區是否還有該棋子
  if (gameState.reserves[color][size] === 0) {
    return { valid: false, error: '該尺寸的棋子已用完' };
  }

  // 檢查目標格子
  const cell = gameState.board[row][col];

  // 如果格子為空，可以放置
  if (cell.pieces.length === 0) {
    return { valid: true };
  }

  // 如果格子有棋子，檢查是否可以覆蓋
  const topPiece = cell.pieces[cell.pieces.length - 1];

  // 不能覆蓋自己的棋子
  if (topPiece.color === color) {
    return { valid: false, error: '不能覆蓋自己的棋子' };
  }

  // 可以覆蓋對手的棋子（大棋子蓋小棋子）
  if (SIZE_ORDER[size] > SIZE_ORDER[topPiece.size]) {
    return { valid: true };
  }

  if (SIZE_ORDER[size] === SIZE_ORDER[topPiece.size]) {
    return { valid: false, error: '不能用同尺寸的棋子覆蓋' };
  }

  return { valid: false, error: '只能用大棋子覆蓋小棋子' };
}

/**
 * 驗證在棋盤上移動棋子是否合法
 * @param gameState 當前遊戲狀態
 * @param fromRow 來源行
 * @param fromCol 來源列
 * @param toRow 目標行
 * @param toCol 目標列
 * @returns 是否合法 + 錯誤訊息
 */
export function canMovePieceOnBoard(
  gameState: GameState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): { valid: boolean; error?: string } {
  // 不能移動到同一個格子
  if (fromRow === toRow && fromCol === toCol) {
    return { valid: false, error: '請選擇不同的格子' };
  }

  const fromCell = gameState.board[fromRow][fromCol];

  // 來源格子必須有棋子
  if (fromCell.pieces.length === 0) {
    return { valid: false, error: '該格子沒有棋子' };
  }

  // 只能移動最上層的棋子
  const movingPiece = fromCell.pieces[fromCell.pieces.length - 1];

  // 必須是當前玩家的棋子
  if (movingPiece.color !== gameState.currentPlayer) {
    return { valid: false, error: '還不是你的回合' };
  }

  // 檢查目標格子
  const toCell = gameState.board[toRow][toCol];

  // 如果目標格子為空，可以移動
  if (toCell.pieces.length === 0) {
    return { valid: true };
  }

  // 如果目標格子有棋子，檢查是否可以覆蓋
  const topPiece = toCell.pieces[toCell.pieces.length - 1];

  // 不能覆蓋自己的棋子
  if (topPiece.color === movingPiece.color) {
    return { valid: false, error: '不能覆蓋自己的棋子' };
  }

  // 可以覆蓋對手的棋子（大棋子蓋小棋子）
  if (SIZE_ORDER[movingPiece.size] > SIZE_ORDER[topPiece.size]) {
    return { valid: true };
  }

  if (SIZE_ORDER[movingPiece.size] === SIZE_ORDER[topPiece.size]) {
    return { valid: false, error: '不能用同尺寸的棋子覆蓋' };
  }

  return { valid: false, error: '只能用大棋子覆蓋小棋子' };
}

/**
 * 檢查是否有玩家獲勝
 * @param gameState 當前遊戲狀態
 * @returns 獲勝的玩家顏色，若無則返回 null
 */
export function checkWinner(gameState: GameState): PieceColor | null {
  const board = gameState.board;

  // 檢查橫向連線（3行）
  for (let row = 0; row < 3; row++) {
    const color = checkLine([
      board[row][0],
      board[row][1],
      board[row][2],
    ]);
    if (color) return color;
  }

  // 檢查縱向連線（3列）
  for (let col = 0; col < 3; col++) {
    const color = checkLine([
      board[0][col],
      board[1][col],
      board[2][col],
    ]);
    if (color) return color;
  }

  // 檢查對角線（左上到右下）
  const diagonal1 = checkLine([
    board[0][0],
    board[1][1],
    board[2][2],
  ]);
  if (diagonal1) return diagonal1;

  // 檢查對角線（右上到左下）
  const diagonal2 = checkLine([
    board[0][2],
    board[1][1],
    board[2][0],
  ]);
  if (diagonal2) return diagonal2;

  return null;
}

/**
 * 檢查一條線上的三個格子是否為同色連線（看最上層棋子）
 * @param cells 三個格子
 * @returns 連線的顏色，若無則返回 null
 */
function checkLine(cells: Array<{ pieces: Piece[] }>): PieceColor | null {
  // 取得每個格子的最上層棋子
  const topPieces = cells.map((cell) =>
    cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : null
  );

  // 如果有任何格子沒有棋子，則無法連線
  if (topPieces.some((piece) => piece === null)) {
    return null;
  }

  // 檢查三個棋子是否同色
  const firstColor = topPieces[0]!.color;
  if (
    topPieces[1]!.color === firstColor &&
    topPieces[2]!.color === firstColor
  ) {
    return firstColor;
  }

  return null;
}

/**
 * 執行從儲備區放置棋子（已驗證合法）
 * @param gameState 當前遊戲狀態
 * @param row 目標行
 * @param col 目標列
 * @param color 棋子顏色
 * @param size 棋子尺寸
 * @returns 新的遊戲狀態
 */
export function placePieceFromReserve(
  gameState: GameState,
  row: number,
  col: number,
  color: PieceColor,
  size: PieceSize
): GameState {
  const newState: GameState = {
    board: gameState.board.map((r) =>
      r.map((cell) => ({ pieces: [...cell.pieces] }))
    ),
    reserves: {
      red: { ...gameState.reserves.red },
      blue: { ...gameState.reserves.blue },
    },
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
  };

  // 放置棋子
  newState.board[row][col].pieces.push({ color, size });

  // 減少儲備區數量
  newState.reserves[color][size] -= 1;

  // 檢查勝利
  const winner = checkWinner(newState);
  if (winner) {
    newState.winner = winner;
  } else {
    // 切換玩家
    newState.currentPlayer = color === 'red' ? 'blue' : 'red';
  }

  return newState;
}

/**
 * 執行在棋盤上移動棋子（已驗證合法）
 * @param gameState 當前遊戲狀態
 * @param fromRow 來源行
 * @param fromCol 來源列
 * @param toRow 目標行
 * @param toCol 目標列
 * @returns 新的遊戲狀態
 */
export function movePieceOnBoard(
  gameState: GameState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): GameState {
  const newState: GameState = {
    board: gameState.board.map((r) =>
      r.map((cell) => ({ pieces: [...cell.pieces] }))
    ),
    reserves: {
      red: { ...gameState.reserves.red },
      blue: { ...gameState.reserves.blue },
    },
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
  };

  // 移除來源格子的最上層棋子
  const piece = newState.board[fromRow][fromCol].pieces.pop()!;

  // 放到目標格子
  newState.board[toRow][toCol].pieces.push(piece);

  // 檢查勝利
  const winner = checkWinner(newState);
  if (winner) {
    newState.winner = winner;
  } else {
    // 切換玩家
    newState.currentPlayer = piece.color === 'red' ? 'blue' : 'red';
  }

  return newState;
}
