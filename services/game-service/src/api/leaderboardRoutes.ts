import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { redis } from '../redis/client.js';

const leaderboardRoutes = new Hono();

// 快取 TTL 設定（秒）
const CACHE_TTL = {
  daily: 60,       // 日榜：1 分鐘
  weekly: 300,     // 週榜：5 分鐘
  monthly: 900,    // 月榜：15 分鐘
  all_time: 300,   // 總榜：5 分鐘
};

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

interface LeaderboardEntry {
  rank: number;
  playerId: number;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentStreak: number;
  maxWinStreak: number;
  periodGames?: number;   // 該時段場次
  periodWins?: number;    // 該時段勝場
  eloChange?: number;     // 該時段 ELO 變化
}

interface LeaderboardResponse {
  period: LeaderboardPeriod;
  periodKey: string;
  entries: LeaderboardEntry[];
  totalCount: number;
  myRank?: number;
}

// 取得時段的 key
function getPeriodKey(period: LeaderboardPeriod): string {
  const now = new Date();
  switch (period) {
    case 'daily':
      return now.toISOString().split('T')[0]; // '2026-01-09'
    case 'weekly': {
      // ISO week format: '2026-W02'
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
      const week = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
    }
    case 'monthly':
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`; // '2026-01'
    case 'all_time':
      return 'all';
  }
}

// 取得時段的日期範圍
function getPeriodDateRange(period: LeaderboardPeriod): { start: Date; end: Date } | null {
  const now = new Date();

  switch (period) {
    case 'daily': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 86400000);
      return { start, end };
    }
    case 'weekly': {
      // 從本週一開始
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      const end = new Date(start.getTime() + 7 * 86400000);
      return { start, end };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }
    case 'all_time':
      return null; // 無時間限制
  }
}

// GET /api/leaderboard - 取得排行榜
leaderboardRoutes.get('/', async (c) => {
  try {
    const period = (c.req.query('period') || 'all_time') as LeaderboardPeriod;
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
    const uuid = c.req.query('uuid'); // 可選：用於取得自己的排名

    // 驗證 period
    if (!['daily', 'weekly', 'monthly', 'all_time'].includes(period)) {
      return c.json({ error: '無效的時段' }, 400);
    }

    const periodKey = getPeriodKey(period);
    const cacheKey = `leaderboard:${period}:${periodKey}:${page}:${limit}`;

    // 嘗試從 Redis 快取讀取
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const response: LeaderboardResponse = JSON.parse(cached);
        // 如果需要自己的排名，額外查詢
        if (uuid) {
          response.myRank = await getPlayerRank(uuid, period);
        }
        return c.json(response);
      }
    } catch (cacheError) {
      console.error('Redis cache error:', cacheError);
      // 快取錯誤不影響正常查詢
    }

    // 從資料庫查詢
    let response: LeaderboardResponse;

    if (period === 'all_time') {
      response = await getAllTimeLeaderboard(periodKey, page, limit);
    } else {
      response = await getPeriodLeaderboard(period, periodKey, page, limit);
    }

    // 儲存到 Redis 快取
    try {
      await redis.setex(cacheKey, CACHE_TTL[period], JSON.stringify(response));
    } catch (cacheError) {
      console.error('Redis cache set error:', cacheError);
    }

    // 取得自己的排名
    if (uuid) {
      response.myRank = await getPlayerRank(uuid, period);
    }

    return c.json(response);
  } catch (error) {
    console.error('取得排行榜失敗:', error);
    return c.json({ error: '取得排行榜失敗' }, 500);
  }
});

// 取得總榜
async function getAllTimeLeaderboard(
  periodKey: string,
  page: number,
  limit: number
): Promise<LeaderboardResponse> {
  const offset = (page - 1) * limit;

  // 取得玩家列表（依 ELO 排序）
  const [players, totalCount] = await Promise.all([
    prisma.player.findMany({
      where: { gamesPlayed: { gte: 1 } }, // 至少玩過 1 場
      orderBy: { eloRating: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.player.count({
      where: { gamesPlayed: { gte: 1 } },
    }),
  ]);

  const entries: LeaderboardEntry[] = players.map((player, index) => ({
    rank: offset + index + 1,
    playerId: player.id,
    username: player.username,
    eloRating: player.eloRating,
    gamesPlayed: player.gamesPlayed,
    gamesWon: player.gamesWon,
    winRate: player.gamesPlayed > 0 ? player.gamesWon / player.gamesPlayed : 0,
    currentStreak: player.currentStreak,
    maxWinStreak: player.maxWinStreak,
  }));

  return {
    period: 'all_time',
    periodKey,
    entries,
    totalCount,
  };
}

// 取得時段排行榜
async function getPeriodLeaderboard(
  period: LeaderboardPeriod,
  periodKey: string,
  page: number,
  limit: number
): Promise<LeaderboardResponse> {
  const dateRange = getPeriodDateRange(period);
  if (!dateRange) {
    return getAllTimeLeaderboard(periodKey, page, limit);
  }

  const offset = (page - 1) * limit;

  // 使用原生 SQL 進行聚合查詢
  const stats = await prisma.$queryRaw<Array<{
    player_id: number;
    username: string;
    elo_rating: number;
    games_played: number;
    games_won: number;
    current_streak: number;
    max_win_streak: number;
    period_games: bigint;
    period_wins: bigint;
    elo_change: bigint;
  }>>`
    SELECT
      p.id as player_id,
      p.username,
      p.elo_rating,
      p.games_played,
      p.games_won,
      p.current_streak,
      p.max_win_streak,
      COUNT(g.id) as period_games,
      SUM(CASE
        WHEN (g.red_player_id = p.id AND g.winner_color = 'red')
          OR (g.blue_player_id = p.id AND g.winner_color = 'blue')
        THEN 1 ELSE 0
      END) as period_wins,
      SUM(CASE
        WHEN g.red_player_id = p.id THEN g.red_elo_change
        WHEN g.blue_player_id = p.id THEN g.blue_elo_change
        ELSE 0
      END) as elo_change
    FROM players p
    JOIN game_records g ON g.red_player_id = p.id OR g.blue_player_id = p.id
    WHERE g.created_at >= ${dateRange.start}
      AND g.created_at < ${dateRange.end}
    GROUP BY p.id, p.username, p.elo_rating, p.games_played, p.games_won, p.current_streak, p.max_win_streak
    HAVING COUNT(g.id) >= 1
    ORDER BY period_wins DESC, period_games ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // 取得總數
  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT p.id) as count
    FROM players p
    JOIN game_records g ON g.red_player_id = p.id OR g.blue_player_id = p.id
    WHERE g.created_at >= ${dateRange.start}
      AND g.created_at < ${dateRange.end}
  `;
  const totalCount = Number(countResult[0]?.count || 0);

  const entries: LeaderboardEntry[] = stats.map((row, index) => ({
    rank: offset + index + 1,
    playerId: row.player_id,
    username: row.username,
    eloRating: row.elo_rating,
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    winRate: row.games_played > 0 ? row.games_won / row.games_played : 0,
    currentStreak: row.current_streak,
    maxWinStreak: row.max_win_streak,
    periodGames: Number(row.period_games),
    periodWins: Number(row.period_wins),
    eloChange: Number(row.elo_change),
  }));

  return {
    period,
    periodKey,
    entries,
    totalCount,
  };
}

// 取得玩家的排名
async function getPlayerRank(uuid: string, period: LeaderboardPeriod): Promise<number | undefined> {
  try {
    const player = await prisma.player.findUnique({ where: { uuid } });
    if (!player) return undefined;

    if (period === 'all_time') {
      // 總榜：計算有多少人 ELO 比自己高
      const higherCount = await prisma.player.count({
        where: {
          gamesPlayed: { gte: 1 },
          eloRating: { gt: player.eloRating },
        },
      });
      return higherCount + 1;
    } else {
      // 時段榜：需要用更複雜的查詢
      const dateRange = getPeriodDateRange(period);
      if (!dateRange) return undefined;

      // 取得該玩家在這個時段的勝場數
      const playerStats = await prisma.$queryRaw<Array<{ period_wins: bigint }>>`
        SELECT
          SUM(CASE
            WHEN (g.red_player_id = ${player.id} AND g.winner_color = 'red')
              OR (g.blue_player_id = ${player.id} AND g.winner_color = 'blue')
            THEN 1 ELSE 0
          END) as period_wins
        FROM game_records g
        WHERE (g.red_player_id = ${player.id} OR g.blue_player_id = ${player.id})
          AND g.created_at >= ${dateRange.start}
          AND g.created_at < ${dateRange.end}
      `;

      const playerWins = Number(playerStats[0]?.period_wins || 0);

      // 計算有多少人勝場比自己多
      const higherResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM (
          SELECT p.id
          FROM players p
          JOIN game_records g ON g.red_player_id = p.id OR g.blue_player_id = p.id
          WHERE g.created_at >= ${dateRange.start}
            AND g.created_at < ${dateRange.end}
          GROUP BY p.id
          HAVING SUM(CASE
            WHEN (g.red_player_id = p.id AND g.winner_color = 'red')
              OR (g.blue_player_id = p.id AND g.winner_color = 'blue')
            THEN 1 ELSE 0
          END) > ${playerWins}
        ) sub
      `;

      return Number(higherResult[0]?.count || 0) + 1;
    }
  } catch (error) {
    console.error('取得玩家排名失敗:', error);
    return undefined;
  }
}

export { leaderboardRoutes };
