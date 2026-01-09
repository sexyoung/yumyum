// 配置
export { initializeGA, isAnalyticsEnabled, isDebugMode } from './config';

// 頁面瀏覽
export { trackPageView } from './pageView';

// 事件追蹤
export {
  trackGameStart,
  trackGameEnd,
  trackGameRestart,
  trackGameMove,
  trackRoomCreate,
  trackRoomJoin,
  trackRematchRequest,
  trackRematchResponse,
  trackEmojiSend,
  trackButtonClick,
  trackGameExit,
  trackTutorialProgress,
  trackError,
} from './events';

// 類型
export type {
  GameMode,
  GameResult,
  GameStartParams,
  GameEndParams,
  GameMoveParams,
  ButtonClickParams,
  TutorialParams,
} from './types';
