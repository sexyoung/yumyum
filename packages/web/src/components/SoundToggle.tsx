import { useState } from 'react';
import { isSoundEnabled, toggleSound } from '../lib/sounds';

/**
 * 音效開關按鈕組件
 * 顯示喇叭圖示，點擊可切換音效開關
 */
export default function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const handleClick = () => {
    const newState = toggleSound();
    setEnabled(newState);
  };

  return (
    <button
      onClick={handleClick}
      className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition"
      title={enabled ? '關閉音效' : '開啟音效'}
      aria-label={enabled ? '關閉音效' : '開啟音效'}
    >
      {enabled ? (
        // 喇叭開啟圖示
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-gray-700"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      ) : (
        // 喇叭關閉圖示
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-gray-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      )}
    </button>
  );
}
