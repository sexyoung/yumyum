import axios from 'axios';
import type { Player, PlayerInfo } from '@yumyum/types';

// 建立 axios instance
// 開發環境使用 Vite proxy，生產環境使用 Vercel rewrites
export const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 玩家認證相關響應類型
interface RegisterResponse {
  player: PlayerInfo;
  isNew: boolean;
}

interface UpdateUsernameResponse {
  success: boolean;
  username: string;
  usernameChangedAt: string;
}

// UpdateUsernameErrorResponse is returned as error.response.data
// interface UpdateUsernameErrorResponse {
//   error: string;
//   canChangeAt?: string;
// }

// API 方法
export const api = {
  getHealth: async () => {
    const { data } = await apiClient.get('/health');
    return data;
  },

  getRooms: async () => {
    const { data } = await apiClient.get('/api/rooms');
    return data;
  },

  createRoom: async (): Promise<{ roomId: string }> => {
    const { data } = await apiClient.post<{ roomId: string }>('/api/rooms');
    return data;
  },

  getPlayers: async (): Promise<Player[]> => {
    const { data } = await apiClient.get<Player[]>('/api/players');
    return data;
  },

  getStats: async () => {
    const { data } = await apiClient.get('/api/stats');
    return data;
  },

  // 玩家認證 API
  registerPlayer: async (uuid: string, username: string): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<RegisterResponse>('/api/players/register', {
      uuid,
      username,
    });
    return data;
  },

  getMe: async (uuid: string): Promise<PlayerInfo> => {
    const { data } = await apiClient.get<PlayerInfo>('/api/players/me', {
      params: { uuid },
    });
    return data;
  },

  updateUsername: async (uuid: string, newUsername: string): Promise<UpdateUsernameResponse> => {
    const { data } = await apiClient.patch<UpdateUsernameResponse>('/api/players/username', {
      uuid,
      newUsername,
    });
    return data;
  },

  // 排行榜 API
  getLeaderboard: async (
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time',
    page: number = 1,
    limit: number = 20,
    uuid?: string
  ): Promise<LeaderboardResponse> => {
    const params: Record<string, string> = { period, page: page.toString(), limit: limit.toString() };
    if (uuid) params.uuid = uuid;
    const { data } = await apiClient.get<LeaderboardResponse>('/api/leaderboard', { params });
    return data;
  },
};

// 排行榜響應類型
export interface LeaderboardEntry {
  rank: number;
  playerId: number;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentStreak: number;
  maxWinStreak: number;
  periodGames?: number;
  periodWins?: number;
  eloChange?: number;
}

export interface LeaderboardResponse {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  periodKey: string;
  entries: LeaderboardEntry[];
  totalCount: number;
  myRank?: number;
}
