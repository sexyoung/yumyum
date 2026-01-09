// GA4 事件參數類型定義

// 遊戲模式
export type GameMode = 'local' | 'ai' | 'online';

// 遊戲結果
export type GameResult = 'win' | 'lose' | 'draw';

// 遊戲開始事件參數
export interface GameStartParams {
  game_mode: GameMode;
  difficulty?: 'easy' | 'medium' | 'hard'; // AI 模式專用
  room_id?: string; // Online 模式專用
}

// 遊戲結束事件參數
export interface GameEndParams {
  game_mode: GameMode;
  result: GameResult;
  winner_color: 'red' | 'blue';
  total_moves: number;
  duration_seconds: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  room_id?: string;
}

// 棋子移動事件參數
export interface GameMoveParams {
  game_mode: GameMode;
  move_type: 'place' | 'move';
  piece_size: 'small' | 'medium' | 'large';
  is_capture: boolean;
  move_number: number;
}

// 按鈕點擊事件參數
export interface ButtonClickParams {
  button_name: string;
  page_location: string;
}

// 教學事件參數
export interface TutorialParams {
  step_id: string;
  step_number: number;
  action: 'start' | 'next' | 'back' | 'complete' | 'skip';
}
