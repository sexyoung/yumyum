// ELO 評分計算模組

// K 值設定
const K_FACTOR_NEW = 40;      // 新手玩家（< 30 場）
const K_FACTOR_NORMAL = 24;   // 一般玩家
const K_FACTOR_HIGH = 16;     // 高分玩家（ELO > 2000）

// 場次門檻
const NEW_PLAYER_GAMES = 30;
const HIGH_ELO_THRESHOLD = 2000;

/**
 * 根據玩家 ELO 和場次決定 K 值
 */
function getKFactor(elo: number, gamesPlayed: number): number {
  if (gamesPlayed < NEW_PLAYER_GAMES) return K_FACTOR_NEW;
  if (elo > HIGH_ELO_THRESHOLD) return K_FACTOR_HIGH;
  return K_FACTOR_NORMAL;
}

/**
 * 計算 ELO 變化
 * @param winnerElo 勝者當前 ELO
 * @param loserElo 敗者當前 ELO
 * @param winnerGamesPlayed 勝者已玩場次
 * @param loserGamesPlayed 敗者已玩場次
 * @returns 雙方的 ELO 變化值
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  winnerGamesPlayed: number,
  loserGamesPlayed: number
): { winnerChange: number; loserChange: number } {
  // 計算勝者的期望勝率
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  // 取得雙方的 K 值
  const winnerK = getKFactor(winnerElo, winnerGamesPlayed);
  const loserK = getKFactor(loserElo, loserGamesPlayed);

  // 計算 ELO 變化
  // 勝者：實際結果 = 1，期望 = expectedWinner
  // 敗者：實際結果 = 0，期望 = expectedLoser
  let winnerChange = Math.round(winnerK * (1 - expectedWinner));
  let loserChange = Math.round(loserK * (0 - expectedLoser));

  // 確保最低獲得/損失 1 分
  winnerChange = Math.max(winnerChange, 1);
  loserChange = Math.min(loserChange, -1);

  return { winnerChange, loserChange };
}

/**
 * 計算連勝/連敗變化
 * @param currentStreak 當前連勝（正數）或連敗（負數）
 * @param maxWinStreak 歷史最高連勝
 * @param isWinner 本場是否獲勝
 * @returns 新的連勝/連敗值和最高連勝
 */
export function updateStreak(
  currentStreak: number,
  maxWinStreak: number,
  isWinner: boolean
): { newStreak: number; newMaxStreak: number } {
  let newStreak: number;

  if (isWinner) {
    // 贏了：如果之前是連敗（負數），重置為 1；否則 +1
    newStreak = currentStreak < 0 ? 1 : currentStreak + 1;
  } else {
    // 輸了：如果之前是連勝（正數），重置為 -1；否則 -1
    newStreak = currentStreak > 0 ? -1 : currentStreak - 1;
  }

  // 更新最高連勝（只有連勝才計入）
  const newMaxStreak = Math.max(maxWinStreak, newStreak > 0 ? newStreak : 0);

  return { newStreak, newMaxStreak };
}

/**
 * 遊戲結果處理資料
 */
export interface GameResultData {
  redPlayerId: number;
  bluePlayerId: number;
  winnerColor: 'red' | 'blue';
  roomId: string;
  totalMoves: number;
}

/**
 * 玩家統計更新結果
 */
export interface PlayerUpdateResult {
  playerId: number;
  eloChange: number;
  newElo: number;
  newGamesPlayed: number;
  newGamesWon: number;
  newGamesLost: number;
  newStreak: number;
  newMaxStreak: number;
}
