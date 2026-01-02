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

import { PieceSize, PieceColor, Position, Piece, Cell, GameState } from './game';

export type { PieceSize, PieceColor, Position, Piece, Cell, GameState };

// WebSocket 連線中的玩家（簡化版，不包含資料庫欄位）
export interface ConnectedPlayer {
  id: string;
  username: string;
}

// WebSocket 訊息類型
export type ClientMessage =
  | { type: 'join'; playerId: string; playerName: string }
  | { type: 'leave' }
  | { type: 'chat'; message: string };

export type ServerMessage =
  | { type: 'connected'; playerId: string; roomId: string }
  | { type: 'player_joined'; player: ConnectedPlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'error'; message: string }
  | { type: 'chat'; playerId: string; playerName: string; message: string };
