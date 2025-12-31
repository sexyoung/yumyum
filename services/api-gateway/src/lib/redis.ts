import Redis from 'ioredis';

// 環境變數
const REDIS_URL = process.env.REDIS_URL || 'redis://host.docker.internal:6379';

// Singleton pattern for Redis Client
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: false, // 立即連線
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// 監聽連線事件
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('ready', () => {
  console.log('🚀 Redis ready');
});
