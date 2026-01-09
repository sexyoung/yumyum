// 遊戲結果處理服務
import { prisma } from '../lib/prisma.js';
import { calculateEloChange, updateStreak } from './eloCalculator.js';
import type { PieceColor } from '@yumyum/types';

interface GameResultInput {
  roomId: string;
  redPlayerUuid: string;
  bluePlayerUuid: string;
  winnerColor: PieceColor;
  totalMoves: number;
}

interface GameResultOutput {
  gameRecordId: number;
  redPlayer: {
    id: number;
    eloChange: number;
    newElo: number;
  };
  bluePlayer: {
    id: number;
    eloChange: number;
    newElo: number;
  };
}

/**
 * 處理遊戲結果：計算 ELO、更新玩家統計、記錄對局
 */
export async function processGameResult(
  input: GameResultInput
): Promise<GameResultOutput | null> {
  const { roomId, redPlayerUuid, bluePlayerUuid, winnerColor, totalMoves } = input;

  try {
    // 查找雙方玩家
    const [redPlayer, bluePlayer] = await Promise.all([
      prisma.player.findUnique({ where: { uuid: redPlayerUuid } }),
      prisma.player.findUnique({ where: { uuid: bluePlayerUuid } }),
    ]);

    // 如果任一玩家不存在（可能是匿名玩家），跳過處理
    if (!redPlayer || !bluePlayer) {
      console.log(`⚠️ 跳過遊戲結果處理：玩家不存在 (red: ${!!redPlayer}, blue: ${!!bluePlayer})`);
      return null;
    }

    // 計算 ELO 變化
    const isRedWinner = winnerColor === 'red';
    const winnerElo = isRedWinner ? redPlayer.eloRating : bluePlayer.eloRating;
    const loserElo = isRedWinner ? bluePlayer.eloRating : redPlayer.eloRating;
    const winnerGames = isRedWinner ? redPlayer.gamesPlayed : bluePlayer.gamesPlayed;
    const loserGames = isRedWinner ? bluePlayer.gamesPlayed : redPlayer.gamesPlayed;

    const { winnerChange, loserChange } = calculateEloChange(
      winnerElo,
      loserElo,
      winnerGames,
      loserGames
    );

    const redEloChange = isRedWinner ? winnerChange : loserChange;
    const blueEloChange = isRedWinner ? loserChange : winnerChange;

    // 計算連勝變化
    const redStreakResult = updateStreak(
      redPlayer.currentStreak,
      redPlayer.maxWinStreak,
      isRedWinner
    );
    const blueStreakResult = updateStreak(
      bluePlayer.currentStreak,
      bluePlayer.maxWinStreak,
      !isRedWinner
    );

    // 使用事務更新所有資料
    const result = await prisma.$transaction(async (tx) => {
      // 創建對局記錄
      const gameRecord = await tx.gameRecord.create({
        data: {
          roomId,
          redPlayerId: redPlayer.id,
          bluePlayerId: bluePlayer.id,
          winnerId: isRedWinner ? redPlayer.id : bluePlayer.id,
          winnerColor,
          redEloChange,
          blueEloChange,
          redEloBefore: redPlayer.eloRating,
          blueEloBefore: bluePlayer.eloRating,
          totalMoves,
        },
      });

      // 更新紅方玩家
      const updatedRed = await tx.player.update({
        where: { id: redPlayer.id },
        data: {
          eloRating: redPlayer.eloRating + redEloChange,
          gamesPlayed: { increment: 1 },
          gamesWon: isRedWinner ? { increment: 1 } : undefined,
          gamesLost: !isRedWinner ? { increment: 1 } : undefined,
          currentStreak: redStreakResult.newStreak,
          maxWinStreak: redStreakResult.newMaxStreak,
          lastPlayedAt: new Date(),
        },
      });

      // 更新藍方玩家
      const updatedBlue = await tx.player.update({
        where: { id: bluePlayer.id },
        data: {
          eloRating: bluePlayer.eloRating + blueEloChange,
          gamesPlayed: { increment: 1 },
          gamesWon: !isRedWinner ? { increment: 1 } : undefined,
          gamesLost: isRedWinner ? { increment: 1 } : undefined,
          currentStreak: blueStreakResult.newStreak,
          maxWinStreak: blueStreakResult.newMaxStreak,
          lastPlayedAt: new Date(),
        },
      });

      return { gameRecord, updatedRed, updatedBlue };
    });

    console.log(`🏆 遊戲結果已記錄: ${roomId}`);
    console.log(`   紅方: ${redPlayer.username} ${redEloChange >= 0 ? '+' : ''}${redEloChange} ELO`);
    console.log(`   藍方: ${bluePlayer.username} ${blueEloChange >= 0 ? '+' : ''}${blueEloChange} ELO`);

    return {
      gameRecordId: result.gameRecord.id,
      redPlayer: {
        id: redPlayer.id,
        eloChange: redEloChange,
        newElo: result.updatedRed.eloRating,
      },
      bluePlayer: {
        id: bluePlayer.id,
        eloChange: blueEloChange,
        newElo: result.updatedBlue.eloRating,
      },
    };
  } catch (error) {
    console.error('❌ 處理遊戲結果失敗:', error);
    return null;
  }
}
