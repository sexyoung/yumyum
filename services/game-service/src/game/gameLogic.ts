// services/game-service/src/game/gameLogic.ts
// 後端遊戲邏輯（與前端保持一致）

import type { GameState, PieceSize, PieceColor, Piece, GameMove } from '@yumyum/types';

const SIZE_ORDER: Record<PieceSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

// 驗證移動是否合法
export function validateMove(
  gameState: GameState,
  move: GameMove,
  playerColor: PieceColor
): { valid: boolean; error?: string } {
  // 檢查是否為當前玩家
  if (playerColor !== gameState.currentPlayer) {
    return { valid: false, error: '還不是你的回合' };
  }

  if (move.type === 'place') {
    return canPlacePieceFromReserve(gameState, move.row, move.col, playerColor, move.size);
  } else {
    return canMovePieceOnBoard(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol);
  }
}

// 執行移動並返回新狀態
export function applyMove(gameState: GameState, move: GameMove, playerColor: PieceColor): GameState {
  if (move.type === 'place') {
    return placePieceFromReserve(gameState, move.row, move.col, playerColor, move.size);
  } else {
    return movePieceOnBoard(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol);
  }
}

function canPlacePieceFromReserve(
  gameState: GameState,
  row: number,
  col: number,
  color: PieceColor,
  size: PieceSize
): { valid: boolean; error?: string } {
  if (color !== gameState.currentPlayer) {
    return { valid: false, error: '還不是你的回合' };
  }

  if (gameState.reserves[color][size] === 0) {
    return { valid: false, error: '該尺寸的棋子已用完' };
  }

  const cell = gameState.board[row][col];

  if (cell.pieces.length === 0) {
    return { valid: true };
  }

  const topPiece = cell.pieces[cell.pieces.length - 1];

  if (topPiece.color === color) {
    return { valid: false, error: '不能覆蓋自己的棋子' };
  }

  if (SIZE_ORDER[size] > SIZE_ORDER[topPiece.size]) {
    return { valid: true };
  }

  if (SIZE_ORDER[size] === SIZE_ORDER[topPiece.size]) {
    return { valid: false, error: '不能用同尺寸的棋子覆蓋' };
  }

  return { valid: false, error: '只能用大棋子覆蓋小棋子' };
}

function canMovePieceOnBoard(
  gameState: GameState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): { valid: boolean; error?: string } {
  if (fromRow === toRow && fromCol === toCol) {
    return { valid: false, error: '請選擇不同的格子' };
  }

  const fromCell = gameState.board[fromRow][fromCol];

  if (fromCell.pieces.length === 0) {
    return { valid: false, error: '該格子沒有棋子' };
  }

  const movingPiece = fromCell.pieces[fromCell.pieces.length - 1];

  if (movingPiece.color !== gameState.currentPlayer) {
    return { valid: false, error: '還不是你的回合' };
  }

  const toCell = gameState.board[toRow][toCol];

  if (toCell.pieces.length === 0) {
    return { valid: true };
  }

  const topPiece = toCell.pieces[toCell.pieces.length - 1];

  if (topPiece.color === movingPiece.color) {
    return { valid: false, error: '不能覆蓋自己的棋子' };
  }

  if (SIZE_ORDER[movingPiece.size] > SIZE_ORDER[topPiece.size]) {
    return { valid: true };
  }

  if (SIZE_ORDER[movingPiece.size] === SIZE_ORDER[topPiece.size]) {
    return { valid: false, error: '不能用同尺寸的棋子覆蓋' };
  }

  return { valid: false, error: '只能用大棋子覆蓋小棋子' };
}

function checkWinner(gameState: GameState): PieceColor | null {
  const board = gameState.board;

  for (let row = 0; row < 3; row++) {
    const color = checkLine([board[row][0], board[row][1], board[row][2]]);
    if (color) return color;
  }

  for (let col = 0; col < 3; col++) {
    const color = checkLine([board[0][col], board[1][col], board[2][col]]);
    if (color) return color;
  }

  const diagonal1 = checkLine([board[0][0], board[1][1], board[2][2]]);
  if (diagonal1) return diagonal1;

  const diagonal2 = checkLine([board[0][2], board[1][1], board[2][0]]);
  if (diagonal2) return diagonal2;

  return null;
}

function checkLine(cells: Array<{ pieces: Piece[] }>): PieceColor | null {
  const topPieces = cells.map((cell) =>
    cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : null
  );

  if (topPieces.some((piece) => piece === null)) {
    return null;
  }

  const firstColor = topPieces[0]!.color;
  if (topPieces[1]!.color === firstColor && topPieces[2]!.color === firstColor) {
    return firstColor;
  }

  return null;
}

function placePieceFromReserve(
  gameState: GameState,
  row: number,
  col: number,
  color: PieceColor,
  size: PieceSize
): GameState {
  const newState: GameState = {
    board: gameState.board.map((r) => r.map((cell) => ({ pieces: [...cell.pieces] }))),
    reserves: {
      red: { ...gameState.reserves.red },
      blue: { ...gameState.reserves.blue },
    },
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
  };

  newState.board[row][col].pieces.push({ color, size });
  newState.reserves[color][size] -= 1;

  const winner = checkWinner(newState);
  if (winner) {
    newState.winner = winner;
  } else {
    newState.currentPlayer = color === 'red' ? 'blue' : 'red';
  }

  return newState;
}

function movePieceOnBoard(
  gameState: GameState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): GameState {
  const newState: GameState = {
    board: gameState.board.map((r) => r.map((cell) => ({ pieces: [...cell.pieces] }))),
    reserves: {
      red: { ...gameState.reserves.red },
      blue: { ...gameState.reserves.blue },
    },
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
  };

  const piece = newState.board[fromRow][fromCol].pieces.pop()!;
  newState.board[toRow][toCol].pieces.push(piece);

  const winner = checkWinner(newState);
  if (winner) {
    newState.winner = winner;
  } else {
    newState.currentPlayer = piece.color === 'red' ? 'blue' : 'red';
  }

  return newState;
}
