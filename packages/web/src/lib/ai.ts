// packages/web/src/lib/ai.ts
// AI 對手邏輯 - V2 Hardened Version

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

const SIZE_VALUE: Record<PieceSize, number> = { small: 1, medium: 2, large: 3 };

// 獲取所有合法移動
function getAllLegalMoves(gameState: GameState, color: PieceColor): AIMove[] {
  const moves: AIMove[] = [];
  const sizes: PieceSize[] = ['small', 'medium', 'large'];

  // 1. 從儲備區放置棋子
  for (const size of sizes) {
    if (gameState.reserves[color][size] > 0) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (canPlacePieceFromReserve(gameState, row, col, color, size).valid) {
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
      if (cell.pieces.length > 0 && cell.pieces[cell.pieces.length - 1].color === color) {
        for (let toRow = 0; toRow < 3; toRow++) {
          for (let toCol = 0; toCol < 3; toCol++) {
            if (canMovePieceOnBoard(gameState, fromRow, fromCol, toRow, toCol).valid) {
              moves.push({ type: 'move', fromRow, fromCol, toRow, toCol });
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

// 獲取棋盤上某個位置的棋子大小
function getPieceSizeAt(gameState: GameState, row: number, col: number): number {
  const pieces = gameState.board[row][col].pieces;
  if (pieces.length === 0) return 0;
  return SIZE_VALUE[pieces[pieces.length - 1].size];
}

// 判斷是否為「吃子」移動 (進攻性移動)
function isGobbleMove(gameState: GameState, move: AIMove): boolean {
    const targetSize = getPieceSizeAt(gameState, 
        move.type === 'place' ? move.row : move.toRow, 
        move.type === 'place' ? move.col : move.toCol
    );
    return targetSize > 0; // 如果目標位置有棋子，且我們能移動過去，那肯定是吃子
}

// =================================================================
// Evaluation Function (大幅增強)
// =================================================================

function evaluateBoard(gameState: GameState, aiColor: PieceColor): number {
  const winner = checkWinner(gameState);
  if (winner === aiColor) return 100000;
  if (winner !== null) return -100000;

  let score = 0;

  // 1. 材質優勢 (Material Advantage)
  // 如果棋盤上我方的棋子比對方多，代表對方有棋子被我吃掉了，這是巨大優勢
  let myVisiblePieces = 0;
  let opVisiblePieces = 0;
  let myMaxPieceSize = 0;
  let opMaxPieceSize = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = gameState.board[r][c];
      if (cell.pieces.length > 0) {
        const top = cell.pieces[cell.pieces.length - 1];
        const val = SIZE_VALUE[top.size];
        if (top.color === aiColor) {
          myVisiblePieces++;
          myMaxPieceSize = Math.max(myMaxPieceSize, val);
          score += val * 5; // 棋子越大分數越高
        } else {
          opVisiblePieces++;
          opMaxPieceSize = Math.max(opMaxPieceSize, val);
          score -= val * 5;
        }
      }
    }
  }
  
  // 極重懲罰：如果我方棋子被吃導致數量少於對方
  score += (myVisiblePieces - opVisiblePieces) * 200;

  // 2. 位置價值 (Positional Value)
  // 嚴格控制中央，且只獎勵大棋子佔領
  const posValue = [
    [3, 2, 3],
    [2, 15, 2], // 中央權重極高
    [3, 2, 3]
  ];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = gameState.board[r][c];
      if (cell.pieces.length > 0) {
        const top = cell.pieces[cell.pieces.length - 1];
        if (top.color === aiColor) {
            // 只有中大棋子在中央才有高分，小棋子在中央是送死
            if (r===1 && c===1 && SIZE_VALUE[top.size] < 3) score += 2; 
            else score += posValue[r][c];
        } else {
            score -= posValue[r][c];
        }
      }
    }
  }

  // 3. 線路威脅 (Line Threats)
  const lines = [
    [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]],
  ];

  for (const line of lines) {
    let myCount = 0;
    let opCount = 0;
    
    for (const [r, c] of line) {
      const cell = gameState.board[r][c];
      if (cell.pieces.length > 0) {
        const top = cell.pieces[cell.pieces.length - 1];
        if (top.color === aiColor) myCount++;
        else opCount++;
      }
    }

    // 聽牌獎勵/懲罰
    if (myCount === 2 && opCount === 0) score += 50;
    if (opCount === 2 && myCount === 0) score -= 60; // 防守略重於進攻
  }

  // 4. 特殊懲罰：送吃風險
  // 如果我下了某個棋子，但對手有更大的「自由棋子」可以移動過來吃掉它，扣分
  // 這是一個簡化的啟發式評估，完整的由 Minimax 處理
  if (opMaxPieceSize > myMaxPieceSize) {
      score -= 30; // 局勢危險
  }

  return score;
}

// 排序移動：優化剪枝效率
function sortMoves(moves: AIMove[], gameState: GameState): AIMove[] {
  return moves.sort((a, b) => {
    // 1. 吃子移動優先 (Gobble)
    const aGobble = isGobbleMove(gameState, a);
    const bGobble = isGobbleMove(gameState, b);
    if (aGobble && !bGobble) return -1;
    if (!aGobble && bGobble) return 1;

    // 2. 佔領中央優先
    const getPos = (m: AIMove) => m.type === 'place' ? [m.row, m.col] : [m.toRow, m.toCol];
    const [ar, ac] = getPos(a);
    const [br, bc] = getPos(b);
    const aCenter = ar === 1 && ac === 1;
    const bCenter = br === 1 && bc === 1;
    if (aCenter && !bCenter) return -1;
    if (!aCenter && bCenter) return 1;

    // 3. 下大棋子優先
    const getSize = (m: AIMove) => {
        if (m.type === 'place') return SIZE_VALUE[m.size];
        const p = gameState.board[m.fromRow][m.fromCol].pieces;
        return p.length ? SIZE_VALUE[p[p.length-1].size] : 0;
    }
    return getSize(b) - getSize(a);
  });
}

// 聰明防守邏輯 (保留並微調)
function getSmartBlockingMove(
  gameState: GameState,
  legalMoves: AIMove[],
  aiColor: PieceColor
): AIMove | null {
  const opponentColor = aiColor === 'red' ? 'blue' : 'red';
  
  // 檢查對手是否有「一步致勝」的威脅
  const tempState = { ...JSON.parse(JSON.stringify(gameState)), currentPlayer: opponentColor };
  const opponentMoves = getAllLegalMoves(tempState, opponentColor);
  const threats = new Map<string, number>(); 
  
  for (const move of opponentMoves) {
    if (isWinningMove(tempState, move, opponentColor)) {
      const key = move.type === 'place' ? `${move.row},${move.col}` : `${move.toRow},${move.toCol}`;
      let threatSize = 0;
      if (move.type === 'place') threatSize = SIZE_VALUE[move.size];
      else {
        const piece = gameState.board[move.fromRow][move.fromCol].pieces.at(-1);
        if (piece) threatSize = SIZE_VALUE[piece.size];
      }
      if (threatSize > (threats.get(key) ?? 0)) threats.set(key, threatSize);
    }
  }

  if (threats.size === 0) return null;

  const getMoveSize = (move: AIMove): number => {
    if (move.type === 'place') return SIZE_VALUE[move.size];
    const piece = gameState.board[move.fromRow][move.fromCol].pieces.at(-1);
    return piece ? SIZE_VALUE[piece.size] : 0;
  };

  let bestBlockingMove: AIMove | null = null;
  let maxPriority = -Infinity;

  for (const move of legalMoves) {
    const targetKey = move.type === 'place' ? `${move.row},${move.col}` : `${move.toRow},${move.toCol}`;
    
    if (threats.has(targetKey)) {
      const threatSize = threats.get(targetKey)!;
      const myPieceSize = getMoveSize(move);

      if (myPieceSize >= threatSize) {
        let priority = 0;
        // 優先下新棋子，除非沒棋子了
        if (move.type === 'place') priority += 1000; 
        
        // 盡量用剛好大小的棋子
        priority -= myPieceSize * 10;
        
        // 絕對不要移動中央的大棋子去防守邊角 (除非萬不得已)
        if (move.type === 'move' && move.fromRow === 1 && move.fromCol === 1) {
            priority -= 5000;
        }

        if (priority > maxPriority) {
          maxPriority = priority;
          bestBlockingMove = move;
        }
      }
    }
  }

  return bestBlockingMove;
}

// Alpha-Beta 遞迴
function alphaBeta(
  gameState: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  const winner = checkWinner(gameState);
  if (winner !== null) {
      // 越早贏分數越高，越晚輸分數越低
      return isMaximizing ? -100000 - depth : 100000 + depth; 
  }
  if (depth === 0) {
    return evaluateBoard(gameState, aiColor);
  }

  const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'blue' : 'red');
  let legalMoves = getAllLegalMoves(gameState, currentColor);
  
  if (legalMoves.length === 0) return evaluateBoard(gameState, aiColor);

  // 排序：先把好棋排前面，增加剪枝機會
  legalMoves = sortMoves(legalMoves, gameState);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of legalMoves) {
      const newState = executeMove(gameState, move, currentColor);
      const score = alphaBeta(newState, depth - 1, alpha, beta, false, aiColor);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of legalMoves) {
      const newState = executeMove(gameState, move, currentColor);
      const score = alphaBeta(newState, depth - 1, alpha, beta, true, aiColor);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

export function getEasyAIMove(gameState: GameState, aiColor: PieceColor): AIMove | null {
  const legalMoves = getAllLegalMoves(gameState, aiColor);
  if (legalMoves.length === 0) return null;
  // 隨機但稍微檢查一下能不能贏
  for (const move of legalMoves) { if (isWinningMove(gameState, move, aiColor)) return move; }
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

export function getMediumAIMove(gameState: GameState, aiColor: PieceColor): AIMove | null {
  const legalMoves = getAllLegalMoves(gameState, aiColor);
  if (legalMoves.length === 0) return null;

  for (const move of legalMoves) { if (isWinningMove(gameState, move, aiColor)) return move; }
  const blockingMove = getSmartBlockingMove(gameState, legalMoves, aiColor);
  if (blockingMove) return blockingMove;

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  const sortedMoves = sortMoves(legalMoves, gameState);

  for (const move of sortedMoves) {
    const newState = executeMove(gameState, move, aiColor);
    // 深度 3，平衡效能與智商
    const score = alphaBeta(newState, 3, -Infinity, Infinity, false, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

export function getHardAIMove(gameState: GameState, aiColor: PieceColor): AIMove | null {
  const legalMoves = getAllLegalMoves(gameState, aiColor);
  if (legalMoves.length === 0) return null;

  // 1. 殺著檢測 (Checkmate)
  for (const move of legalMoves) {
    if (isWinningMove(gameState, move, aiColor)) return move;
  }

  // 2. 絕對防禦 (Emergency Block)
  const blockingMove = getSmartBlockingMove(gameState, legalMoves, aiColor);
  if (blockingMove) return blockingMove;

  // 3. Alpha-Beta 深度搜索
  // 深度設為 5，這是關鍵，奇數層能讓 AI 看到「我下這步 -> 你吃我 -> 我反擊 -> 你防守 -> 我結果如何」
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  
  const sortedMoves = sortMoves(legalMoves, gameState);

  for (const move of sortedMoves) {
    const newState = executeMove(gameState, move, aiColor);
    const score = alphaBeta(newState, 5, -Infinity, Infinity, false, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

export function getAIMove(
  gameState: GameState,
  aiColor: PieceColor,
  difficulty: AIDifficulty
): AIMove | null {
  switch (difficulty) {
    case 'easy': return getEasyAIMove(gameState, aiColor);
    case 'medium': return getMediumAIMove(gameState, aiColor);
    case 'hard': return getHardAIMove(gameState, aiColor);
    default: return getMediumAIMove(gameState, aiColor);
  }
}