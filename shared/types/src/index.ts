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
