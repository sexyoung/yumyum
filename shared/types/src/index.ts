// 初始範例類型
export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
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
