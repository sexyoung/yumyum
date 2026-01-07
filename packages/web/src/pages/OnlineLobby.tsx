// packages/web/src/pages/OnlineLobby.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/env';

const OnlineLobby: React.FC = () => {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('創建房間失敗');
      }

      const data = await response.json();
      console.log('房間已創建:', data.roomId);

      // 導向遊戲頁面
      navigate(`/online/game/${data.roomId}`);
    } catch (err) {
      console.error('創建房間失敗:', err);
      setError('創建房間失敗，請稍後再試');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      navigate(`/online/game/${joinRoomId.trim()}`);
    }
  };

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          線上雙人對戰
        </h1>

        {/* 錯誤提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 創建房間 */}
        <div className="mb-4">
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                創建中...
              </>
            ) : (
              '創建新房間'
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            創建房間後，分享房間 ID 給朋友加入
          </p>
        </div>

        {/* 分隔線 */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">或</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* 加入房間 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            輸入房間 ID
          </label>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            placeholder="例如：ABCD1234"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!joinRoomId.trim()}
            className="w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition"
          >
            加入房間
          </button>
        </div>

        {/* 返回首頁 */}
        <button
          onClick={handleBackHome}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
        >
          返回首頁
        </button>
      </div>
    </div>
  );
};

export default OnlineLobby;
