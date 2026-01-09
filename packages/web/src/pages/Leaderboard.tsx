// packages/web/src/pages/Leaderboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, LeaderboardEntry } from '../lib/api';
import { getPlayerIdentity } from '../lib/storage';

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

const periodLabels: Record<LeaderboardPeriod, string> = {
  daily: '日榜',
  weekly: '週榜',
  monthly: '月榜',
  all_time: '總榜',
};

// 獎牌圖示
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-lg font-bold text-gray-600">{rank}</span>;
}

// 排行榜項目元件
function LeaderboardRow({
  entry,
  isCurrentUser,
  showPeriodStats,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  showPeriodStats: boolean;
}) {
  return (
    <div
      className={`
        flex items-center p-3 rounded-lg mb-2
        ${isCurrentUser ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-white'}
      `}
    >
      {/* 排名 */}
      <div className="w-12 text-center flex-shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      {/* 玩家名稱 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 truncate">{entry.username}</span>
          {entry.currentStreak > 0 && (
            <span className="text-orange-500 text-sm whitespace-nowrap">
              🔥{entry.currentStreak}
            </span>
          )}
          {isCurrentUser && (
            <span className="text-xs bg-yellow-400 text-yellow-800 px-2 py-0.5 rounded-full">
              你
            </span>
          )}
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="flex gap-3 text-sm text-gray-600 flex-shrink-0">
        {/* ELO */}
        <div className="text-center min-w-[50px]">
          <div className="font-bold text-gray-800">{entry.eloRating}</div>
          <div className="text-xs text-gray-400">ELO</div>
        </div>

        {/* 勝率 */}
        <div className="text-center min-w-[45px]">
          <div className="font-bold text-gray-800">
            {Math.round(entry.winRate * 100)}%
          </div>
          <div className="text-xs text-gray-400">勝率</div>
        </div>

        {/* 時段統計或總場次 */}
        {showPeriodStats && entry.periodWins !== undefined ? (
          <div className="text-center min-w-[50px]">
            <div className="font-bold text-green-600">
              {entry.periodWins}/{entry.periodGames}
            </div>
            <div className="text-xs text-gray-400">勝/場</div>
          </div>
        ) : (
          <div className="text-center min-w-[45px]">
            <div className="font-bold text-gray-800">{entry.gamesPlayed}</div>
            <div className="text-xs text-gray-400">場次</div>
          </div>
        )}

        {/* ELO 變化（時段榜才顯示） */}
        {showPeriodStats && entry.eloChange !== undefined && (
          <div className="text-center min-w-[45px]">
            <div className={`font-bold ${entry.eloChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {entry.eloChange >= 0 ? '+' : ''}{entry.eloChange}
            </div>
            <div className="text-xs text-gray-400">變化</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Leaderboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');

  const playerIdentity = getPlayerIdentity();

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', period, playerIdentity?.uuid],
    queryFn: () => api.getLeaderboard(period, 1, 50, playerIdentity?.uuid),
  });

  const handleBackToLobby = () => {
    navigate('/online');
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-yellow-400 to-orange-500 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 標題 */}
        <h1 className="text-3xl font-bold text-white text-center mb-6 drop-shadow-lg">
          排行榜
        </h1>

        {/* 時段切換 */}
        <div className="flex justify-center gap-2 mb-6">
          {(Object.keys(periodLabels) as LeaderboardPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`
                px-4 py-2 rounded-lg font-semibold transition
                ${period === p
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white/30 text-white hover:bg-white/50'
                }
              `}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* 我的排名（如果有） */}
        {data?.myRank && (
          <div className="bg-white/90 rounded-lg p-4 mb-4 text-center">
            <span className="text-gray-600">你的排名：</span>
            <span className="text-2xl font-bold text-orange-600 ml-2">
              第 {data.myRank} 名
            </span>
            <span className="text-gray-500 text-sm ml-2">
              / {data.totalCount} 人
            </span>
          </div>
        )}

        {/* 載入中 */}
        {isLoading && (
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        )}

        {/* 錯誤 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">載入排行榜失敗，請稍後再試</p>
          </div>
        )}

        {/* 排行榜列表 */}
        {data && (
          <div className="bg-white/90 rounded-lg p-4">
            {data.entries.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {period === 'all_time'
                  ? '還沒有任何玩家上榜，快來成為第一個！'
                  : '這個時段還沒有對局記錄'}
              </p>
            ) : (
              data.entries.map((entry) => (
                <LeaderboardRow
                  key={entry.playerId}
                  entry={entry}
                  isCurrentUser={playerIdentity?.playerId === entry.playerId}
                  showPeriodStats={period !== 'all_time'}
                />
              ))
            )}
          </div>
        )}

        {/* 返回按鈕 */}
        <button
          onClick={handleBackToLobby}
          className="w-full mt-6 px-4 py-3 bg-white/90 hover:bg-white text-gray-700 rounded-lg font-semibold transition"
        >
          返回大廳
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
