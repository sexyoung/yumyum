import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

const app = new Hono();

// CORS 配置
app.use('*', cors({
  origin: ['http://localhost:5173'], // 開發環境
  credentials: true,
}));

// 健康檢查
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-gateway' }));

// API 路由（待實作）
app.get('/api/rooms', (c) => c.json([]));

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0', // 重要！允許 devcontainer 外部訪問
});

console.log(`API Gateway running on http://0.0.0.0:${port}`);
