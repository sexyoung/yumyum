import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { prisma } from './lib/prisma';
import type { Player } from '@yumyum/types';

const app = new Hono();

// CORS 配置
app.use('*', cors({
  origin: ['http://localhost:5173'], // 開發環境
  credentials: true,
}));

// 健康檢查
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-gateway' }));

// 玩家相關 API
app.get('/api/players', async (c) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { eloRating: 'desc' },
      take: 10, // 只回傳前 10 名
    });
    // 將 Prisma 的 Date 轉換為 string，符合 Player 類型
    const playersResponse: Player[] = players.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
    return c.json(playersResponse);
  } catch (error) {
    console.error('獲取玩家列表失敗:', error);
    return c.json({ error: 'Failed to fetch players' }, 500);
  }
});

// API 路由（待實作）
app.get('/api/rooms', (c) => c.json([]));

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0', // 重要！允許 devcontainer 外部訪問
});

console.log(`API Gateway running on http://0.0.0.0:${port}`);
