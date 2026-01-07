// WebSocket 需要完整 URL，從 VITE_API_URL 轉換 http → ws
export function getWsUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return apiUrl.replace(/^http/, 'ws');
}
