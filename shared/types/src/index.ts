// 玩家類型（對應 Prisma Player model）
export interface Player {
  id: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  hostId: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
}

export interface GameState {
  roomId: string;
  currentPlayer: string;
  board: unknown; // 待實作
}

// WebSocket 訊息類型
export type ClientMessage =
  | { type: 'join'; playerId: string; playerName: string }
  | { type: 'leave' }
  | { type: 'chat'; message: string };

export type ServerMessage =
  | { type: 'connected'; playerId: string; roomId: string }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'error'; message: string }
  | { type: 'chat'; playerId: string; playerName: string; message: string };
