import ReactGA from 'react-ga4';
import { ensureInitialized, isDebugMode } from './config';
import type {
  GameStartParams,
  GameEndParams,
  GameMoveParams,
  ButtonClickParams,
  TutorialParams,
} from './types';

// 通用事件發送函數
const sendEvent = (eventName: string, params?: Record<string, unknown>): void => {
  if (!ensureInitialized()) return;

  ReactGA.event(eventName, params);

  if (isDebugMode()) {
    console.log('[Analytics] Event:', eventName, params);
  }
};

// ===== 遊戲生命週期事件 =====

// 遊戲開始
export const trackGameStart = (params: GameStartParams): void => {
  sendEvent('game_start', {
    game_mode: params.game_mode,
    difficulty: params.difficulty,
    room_id: params.room_id,
  });
};

// 遊戲結束
export const trackGameEnd = (params: GameEndParams): void => {
  sendEvent('game_end', {
    game_mode: params.game_mode,
    result: params.result,
    winner_color: params.winner_color,
    total_moves: params.total_moves,
    duration_seconds: params.duration_seconds,
    difficulty: params.difficulty,
    room_id: params.room_id,
  });
};

// 遊戲重新開始
export const trackGameRestart = (gameMode: string): void => {
  sendEvent('game_restart', { game_mode: gameMode });
};

// ===== 遊戲內操作事件 =====

// 棋子移動（只追蹤吃子，避免過多事件）
export const trackGameMove = (params: GameMoveParams): void => {
  if (params.is_capture) {
    sendEvent('piece_capture', {
      game_mode: params.game_mode,
      piece_size: params.piece_size,
      move_number: params.move_number,
    });
  }
};

// ===== 線上遊戲專屬事件 =====

// 創建房間
export const trackRoomCreate = (): void => {
  sendEvent('room_create');
};

// 加入房間
export const trackRoomJoin = (roomId: string): void => {
  sendEvent('room_join', { room_id: roomId });
};

// 再戰請求
export const trackRematchRequest = (): void => {
  sendEvent('rematch_request');
};

// 再戰回應
export const trackRematchResponse = (accepted: boolean): void => {
  sendEvent('rematch_response', { accepted });
};

// 發送 Emoji
export const trackEmojiSend = (emoji: string): void => {
  sendEvent('emoji_send', { emoji });
};

// ===== 導航事件 =====

// 按鈕點擊
export const trackButtonClick = (params: ButtonClickParams): void => {
  sendEvent('button_click', {
    button_name: params.button_name,
    page_location: params.page_location,
  });
};

// 離開遊戲
export const trackGameExit = (gameMode: string, reason: 'button' | 'navigation'): void => {
  sendEvent('game_exit', { game_mode: gameMode, exit_reason: reason });
};

// ===== 教學事件 =====

// 教學進度
export const trackTutorialProgress = (params: TutorialParams): void => {
  sendEvent('tutorial_progress', {
    step_id: params.step_id,
    step_number: params.step_number,
    action: params.action,
  });
};

// ===== 錯誤追蹤 =====

// 追蹤錯誤
export const trackError = (errorType: string, errorMessage: string): void => {
  sendEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
  });
};
