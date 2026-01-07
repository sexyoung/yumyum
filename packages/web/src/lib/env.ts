// 從 VITE_API_URL 取得 base URL，並提供 http/ws 轉換
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getApiUrl(): string {
  return API_URL;
}

export function getWsUrl(): string {
  return API_URL.replace(/^http/, 'ws');
}
