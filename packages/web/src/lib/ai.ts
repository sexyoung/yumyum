// packages/web/src/lib/ai.ts
// AI 對手邏輯

import { GameState, PieceColor, PieceSize } from '@yumyum/types';
import {
  canPlacePieceFromReserve,
  canMovePieceOnBoard,
  placePieceFromReserve,
  movePieceOnBoard,
  checkWinner,
} from './gameLogic';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

// 移動類型
export type AIMove =
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

// 獲取所有合法移動
function getAllLegalMoves(gameState: GameState, color: PieceColor): AIMove[] {
  const moves: AIMove[] = [];

  // 1. 從儲備區放置棋子
  const sizes: PieceSize[] = ['small', 'medium', 'large'];
  for (const size of sizes) {
    if (gameState.reserves[color][size] > 0) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const validation = canPlacePieceFromReserve(gameState, row, col, color, size);
          if (validation.valid) {
            moves.push({ type: 'place', row, col, size });
          }
        }
      }
    }
  }

  // 2. 移動棋盤上的棋子
  for (let fromRow = 0; fromRow < 3; fromRow++) {
    for (let fromCol = 0; fromCol < 3; fromCol++) {
      const cell = gameState.board[fromRow][fromCol];
      if (cell.pieces.length > 0) {
        const topPiece = cell.pieces[cell.pieces.length - 1];
        if (topPiece.color === color) {
          // 這是當前玩家的棋子，可以嘗試移動
          for (let toRow = 0; toRow < 3; toRow++) {
            for (let toCol = 0; toCol < 3; toCol++) {
              const validation = canMovePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol);
              if (validation.valid) {
                moves.push({ type: 'move', fromRow, fromCol, toRow, toCol });
              }
            }
          }
        }
      }
    }
  }

  return moves;
}

// 執行移動
function executeMove(gameState: GameState, move: AIMove, color: PieceColor): GameState {
  if (move.type === 'place') {
    return placePieceFromReserve(gameState, move.row, move.col, color, move.size);
  } else {
    return movePieceOnBoard(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol);
  }
}

// 檢查某個移動是否會導致獲勝
function isWinningMove(gameState: GameState, move: AIMove, color: PieceColor): boolean {
  const newState = executeMove(gameState, move, color);
  return checkWinner(newState) === color;
}

// 簡單 AI：隨機 + 基本策略
export function getEasyAIMove(gameState: GameState, aiColor: PieceColor): AIMove | null {
  const legalMoves = getAllLegalMoves(gameState, aiColor);

  if (legalMoves.length === 0) {
    return null;
  }

  // 1. 優先檢查能否獲勝
  for (const move of legalMoves) {
    if (isWinningMove(gameState, move, aiColor)) {
      return move;
    }
  }

  // 2. 優先阻擋對手獲勝
  const opponentColor: PieceColor = aiColor === 'red' ? 'blue' : 'red';

  // 臨時設置對手為當前玩家，以便獲取對手的合法移動
  const tempState: GameState = {
    ...gameState,
    currentPlayer: opponentColor,
  };
  const opponentMoves = getAllLegalMoves(tempState, opponentColor);

  // 收集所有對手的獲勝位置
  const winningPositions = new Set<string>();
  for (const opponentMove of opponentMoves) {
    if (isWinningMove(tempState, opponentMove, opponentColor)) {
      const targetRow = opponentMove.type === 'place' ? opponentMove.row : opponentMove.toRow;
      const targetCol = opponentMove.type === 'place' ? opponentMove.col : opponentMove.toCol;
      winningPositions.add(`${targetRow},${targetCol}`);
    }
  }

  // 嘗試阻擋對手的獲勝位置
  for (const move of legalMoves) {
    const myTargetRow = move.type === 'place' ? move.row : move.toRow;
    const myTargetCol = move.type === 'place' ? move.col : move.toCol;

    if (winningPositions.has(`${myTargetRow},${myTargetCol}`)) {
      return move;
    }
  }

  // 3. 隨機選擇
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

// 評估函數：評估棋盤對某個玩家的有利程度
function evaluateBoard(gameState: GameState, aiColor: PieceColor): number {
  const winner = checkWinner(gameState);

  // 如果遊戲已結束
  if (winner === aiColor) {
    return 1000;
  }
  if (winner !== null) {
    return -1000;
  }

  let score = 0;
  const opponentColor: PieceColor = aiColor === 'red' ? 'blue' : 'red';

  // 檢查對手是否下一步可以獲勝
  const opponentMoves = getAllLegalMoves(gameState, opponentColor);
  for (const move of opponentMoves) {
    if (isWinningMove(gameState, move, opponentColor)) {
      // 對手可以在下一步獲勝，這是非常危險的
      score -= 500;
      break;
    }
  }

  // 檢查 AI 是否下一步可以獲勝
  const aiMoves = getAllLegalMoves(gameState, aiColor);
  for (const move of aiMoves) {
    if (isWinningMove(gameState, move, aiColor)) {
      // AI 可以在下一步獲勝，這是非常好的
      score += 500;
      break;
    }
  }

  // 檢查所有可能的連線（橫、縱、對角）
  const lines = [
    // 橫向
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    // 縱向
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    // 對角
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
  ];

  for (const line of lines) {
    let aiCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;

    for (const [row, col] of line) {
      const cell = gameState.board[row][col];
      if (cell.pieces.length === 0) {
        emptyCount++;
      } else {
        const topPiece = cell.pieces[cell.pieces.length - 1];
        if (topPiece.color === aiColor) {
          aiCount++;
        } else {
          opponentCount++;
        }
      }
    }

    // 連二評分
    if (aiCount === 2 && opponentCount === 0) {
      score += 10;
    }
    if (opponentCount === 2 && aiCount === 0) {
      score -= 15; // 阻擋對手連二更重要
    }
  }

  return score;
}

// Minimax 算法（用於中等 AI）
function minimax(
  gameState: GameState,
  depth: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  // 終止條件
  const winner = checkWinner(gameState);
  if (winner !== null || depth === 0) {
    return evaluateBoard(gameState, aiColor);
  }

  const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'blue' : 'red');
  const legalMoves = getAllLegalMoves(gameState, currentColor);

  if (legalMoves.length === 0) {
    return evaluateBoard(gameState, aiColor);
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of legalMoves) {
      const newState = executeMove(gameState, move, currentColor);
      const score = minimax(newState, depth - 1, false, aiColor);
      maxScore = Math.max(maxScore, score);
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of legalMoves) {
      const newState = executeMove(gameState, move, currentColor);
      const score = minimax(newState, depth - 1, true, aiColor);
      minScore = Math.min(minScore, score);
    }
    return minScore;
  }
}

// 中等 AI：Minimax 3 層
export function getMediumAIMove(gameState: GameState, aiColor: PieceColor): AIMove | null {
  const legalMoves = getAllLegalMoves(gameState, aiColor);

  if (legalMoves.length === 0) {
    return null;
  }

  // 1. 優先檢查能否獲勝
  for (const move of legalMoves) {
    if (isWinningMove(gameState, move, aiColor)) {
      return move;
    }
  }

  // 2. 優先阻擋對手獲勝
  const opponentColor: PieceColor = aiColor === 'red' ? 'blue' : 'red';

  // 臨時設置對手為當前玩家，以便獲取對手的合法移動
  const tempState: GameState = {
    ...gameState,
    currentPlayer: opponentColor,
  };
  const opponentMoves = getAllLegalMoves(tempState, opponentColor);

  const winningPositions = new Set<string>();
  for (const opponentMove of opponentMoves) {
    if (isWinningMove(tempState, opponentMove, opponentColor)) {
      const targetRow = opponentMove.type === 'place' ? opponentMove.row : opponentMove.toRow;
      const targetCol = opponentMove.type === 'place' ? opponentMove.col : opponentMove.toCol;
      winningPositions.add(`${targetRow},${targetCol}`);
    }
  }

  for (const move of legalMoves) {
    const myTargetRow = move.type === 'place' ? move.row : move.toRow;
    const myTargetCol = move.type === 'place' ? move.col : move.toCol;

    if (winningPositions.has(`${myTargetRow},${myTargetCol}`)) {
      return move;
    }
  }

  // 3. 使用 Minimax 搜索最佳移動
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const newState = executeMove(gameState, move, aiColor);
    const score = minimax(newState, 2, false, aiColor); // 深度 3 層（當前層 + 2 層）

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// Alpha-Beta 剪枝算法（用於困難 AI）
function alphaBeta(
  gameState: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  // 終止條件
  const winner = checkWinner(gameState);
  if (winner !== null || depth === 0) {
    return evaluateBoard(gameState, aiColor);
  }

  const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'blue' : 'red');
  const legalMoves = getAllLegalMoves(gameState, currentColor);

  if (legalMoves.length === 0) {
    return evaluateBoard(gameState, aiColor);
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of legalMoves) {
      const newState = executeMove(gameState, move, currentColor);
      const score = alphaBeta(newState, depth - 1, alpha, beta, false, aiColor);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break; // Beta 剪枝
      }
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of legalMoves) {
      const newState = executeMove(gameState, move, currentColor);
      const score = alphaBeta(newState, depth - 1, alpha, beta, true, aiColor);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break; // Alpha 剪枝
      }
    }
    return minScore;
  }
}

// 困難 AI：Alpha-Beta 5 層
export function getHardAIMove(gameState: GameState, aiColor: PieceColor): AIMove | null {
  const legalMoves = getAllLegalMoves(gameState, aiColor);

  if (legalMoves.length === 0) {
    return null;
  }

  // 1. 優先檢查能否獲勝
  for (const move of legalMoves) {
    if (isWinningMove(gameState, move, aiColor)) {
      return move;
    }
  }

  // 2. 優先阻擋對手獲勝
  const opponentColor: PieceColor = aiColor === 'red' ? 'blue' : 'red';

  // 臨時設置對手為當前玩家，以便獲取對手的合法移動
  const tempState: GameState = {
    ...gameState,
    currentPlayer: opponentColor,
  };
  const opponentMoves = getAllLegalMoves(tempState, opponentColor);

  const winningPositions = new Set<string>();
  for (const opponentMove of opponentMoves) {
    if (isWinningMove(tempState, opponentMove, opponentColor)) {
      const targetRow = opponentMove.type === 'place' ? opponentMove.row : opponentMove.toRow;
      const targetCol = opponentMove.type === 'place' ? opponentMove.col : opponentMove.toCol;
      winningPositions.add(`${targetRow},${targetCol}`);
    }
  }

  for (const move of legalMoves) {
    const myTargetRow = move.type === 'place' ? move.row : move.toRow;
    const myTargetCol = move.type === 'place' ? move.col : move.toCol;

    if (winningPositions.has(`${myTargetRow},${myTargetCol}`)) {
      return move;
    }
  }

  // 3. 使用 Alpha-Beta 搜索最佳移動
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const newState = executeMove(gameState, move, aiColor);
    const score = alphaBeta(newState, 4, -Infinity, Infinity, false, aiColor); // 深度 5 層

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// 根據難度獲取 AI 移動
export function getAIMove(
  gameState: GameState,
  aiColor: PieceColor,
  difficulty: AIDifficulty
): AIMove | null {
  switch (difficulty) {
    case 'easy':
      return getEasyAIMove(gameState, aiColor);
    case 'medium':
      return getMediumAIMove(gameState, aiColor);
    case 'hard':
      return getHardAIMove(gameState, aiColor);
    default:
      return getEasyAIMove(gameState, aiColor);
  }
}
