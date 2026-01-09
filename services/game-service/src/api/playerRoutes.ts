import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';

const playerRoutes = new Hono();

// 每週限制改名的毫秒數
const USERNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

interface RegisterRequest {
  uuid: string;
  username: string;
}

interface UpdateUsernameRequest {
  uuid: string;
  newUsername: string;
}

// 驗證 UUID 格式
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 驗證暱稱
function isValidUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: '暱稱至少需要 2 個字元' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: '暱稱不能超過 20 個字元' };
  }
  return { valid: true };
}

// POST /api/players/register - 註冊新玩家或返回現有玩家
playerRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();
    const { uuid, username } = body;

    // 驗證 UUID
    if (!uuid || !isValidUUID(uuid)) {
      return c.json({ error: '無效的 UUID 格式' }, 400);
    }

    // 驗證暱稱
    const usernameValidation = isValidUsername(username);
    if (!usernameValidation.valid) {
      return c.json({ error: usernameValidation.error }, 400);
    }

    const trimmedUsername = username.trim();

    // 查找或創建玩家
    let player = await prisma.player.findUnique({
      where: { uuid },
    });

    const isNew = !player;

    if (!player) {
      // 創建新玩家
      player = await prisma.player.create({
        data: {
          uuid,
          username: trimmedUsername,
        },
      });
      console.log(`🎮 新玩家註冊: ${trimmedUsername} (${uuid})`);
    }

    // 計算勝率
    const winRate = player.gamesPlayed > 0
      ? player.gamesWon / player.gamesPlayed
      : 0;

    return c.json({
      player: {
        id: player.id,
        uuid: player.uuid,
        username: player.username,
        eloRating: player.eloRating,
        gamesPlayed: player.gamesPlayed,
        gamesWon: player.gamesWon,
        gamesLost: player.gamesLost,
        winRate,
        currentStreak: player.currentStreak,
        maxWinStreak: player.maxWinStreak,
      },
      isNew,
    });
  } catch (error) {
    console.error('註冊玩家失敗:', error);
    return c.json({ error: '註冊失敗' }, 500);
  }
});

// GET /api/players/me - 獲取當前玩家資訊
playerRoutes.get('/me', async (c) => {
  try {
    const uuid = c.req.query('uuid');

    if (!uuid || !isValidUUID(uuid)) {
      return c.json({ error: '無效的 UUID' }, 400);
    }

    const player = await prisma.player.findUnique({
      where: { uuid },
    });

    if (!player) {
      return c.json({ error: '玩家不存在' }, 404);
    }

    const winRate = player.gamesPlayed > 0
      ? player.gamesWon / player.gamesPlayed
      : 0;

    return c.json({
      id: player.id,
      uuid: player.uuid,
      username: player.username,
      eloRating: player.eloRating,
      gamesPlayed: player.gamesPlayed,
      gamesWon: player.gamesWon,
      gamesLost: player.gamesLost,
      winRate,
      currentStreak: player.currentStreak,
      maxWinStreak: player.maxWinStreak,
      usernameChangedAt: player.usernameChangedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('獲取玩家資訊失敗:', error);
    return c.json({ error: '獲取失敗' }, 500);
  }
});

// PATCH /api/players/username - 修改暱稱（每週限一次）
playerRoutes.patch('/username', async (c) => {
  try {
    const body = await c.req.json<UpdateUsernameRequest>();
    const { uuid, newUsername } = body;

    // 驗證 UUID
    if (!uuid || !isValidUUID(uuid)) {
      return c.json({ error: '無效的 UUID' }, 400);
    }

    // 驗證新暱稱
    const usernameValidation = isValidUsername(newUsername);
    if (!usernameValidation.valid) {
      return c.json({ error: usernameValidation.error }, 400);
    }

    const trimmedUsername = newUsername.trim();

    // 查找玩家
    const player = await prisma.player.findUnique({
      where: { uuid },
    });

    if (!player) {
      return c.json({ error: '玩家不存在' }, 404);
    }

    // 檢查改名冷卻時間
    if (player.usernameChangedAt) {
      const timeSinceLastChange = Date.now() - player.usernameChangedAt.getTime();
      if (timeSinceLastChange < USERNAME_CHANGE_COOLDOWN_MS) {
        const remainingDays = Math.ceil(
          (USERNAME_CHANGE_COOLDOWN_MS - timeSinceLastChange) / (24 * 60 * 60 * 1000)
        );
        return c.json({
          error: `改名冷卻中，還需等待 ${remainingDays} 天`,
          canChangeAt: new Date(player.usernameChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS).toISOString(),
        }, 429);
      }
    }

    // 更新暱稱
    const updatedPlayer = await prisma.player.update({
      where: { uuid },
      data: {
        username: trimmedUsername,
        usernameChangedAt: new Date(),
      },
    });

    console.log(`📝 玩家改名: ${player.username} -> ${trimmedUsername}`);

    return c.json({
      success: true,
      username: updatedPlayer.username,
      usernameChangedAt: updatedPlayer.usernameChangedAt?.toISOString(),
    });
  } catch (error) {
    console.error('修改暱稱失敗:', error);
    return c.json({ error: '修改失敗' }, 500);
  }
});

export { playerRoutes };
