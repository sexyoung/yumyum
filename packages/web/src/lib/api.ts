import axios from 'axios';
import type { Player } from '@yumyum/types';

// 建立 axios instance
// 開發環境使用 Vite proxy，生產環境使用 Vercel rewrites
export const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
};
