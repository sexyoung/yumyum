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

import { PieceSize, PieceColor, Position, Piece, Cell, GameState, GameMove } from './game';

export type { PieceSize, PieceColor, Position, Piece, Cell, GameState, GameMove };

// WebSocket 連線中的玩家（簡化版，不包含資料庫欄位）
export interface ConnectedPlayer {
  id: string;
  username: string;
}

// WebSocket 訊息類型（聊天室功能 - 原有的）
export type ChatClientMessage =
  | { type: 'join'; playerId: string; playerName: string }
  | { type: 'leave' }
  | { type: 'chat'; message: string };

export type ChatServerMessage =
  | { type: 'connected'; playerId: string; roomId: string }
  | { type: 'player_joined'; player: ConnectedPlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'error'; message: string }
  | { type: 'chat'; playerId: string; playerName: string; message: string };

// 遊戲房間 WebSocket 訊息類型（線上對戰專用）
export type GameClientMessage =
  | { type: 'join_room'; roomId: string; playerName: string }
  | { type: 'make_move'; move: GameMove }
  | { type: 'leave_room' }
  | { type: 'rematch_request' }
  | { type: 'rematch_accept' }
  | { type: 'rematch_decline' };

export type GameServerMessage =
  | { type: 'room_joined'; roomId: string; color: PieceColor }
  | { type: 'waiting_for_opponent' }
  | { type: 'opponent_joined'; opponentName: string }
  | { type: 'game_start'; gameState: GameState; yourColor: PieceColor }
  | { type: 'move_made'; gameState: GameState; lastMove: GameMove; movedBy: PieceColor }
  | { type: 'game_over'; winner: PieceColor | 'draw'; gameState: GameState }
  | { type: 'opponent_left' }
  | { type: 'invalid_move'; reason: string }
  | { type: 'error'; message: string }
  | { type: 'rematch_requested'; by: PieceColor }
  | { type: 'rematch_declined' }
  | { type: 'rematch_start'; gameState: GameState; yourColor: PieceColor };

// 保持向後相容的別名
export type ClientMessage = ChatClientMessage | GameClientMessage;
export type ServerMessage = ChatServerMessage | GameServerMessage;
