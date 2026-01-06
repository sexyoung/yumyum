// packages/web/src/pages/OnlineLobby.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadOnlineRoomInfo } from '../lib/storage';

const OnlineLobby: React.FC = () => {
  const navigate = useNavigate();
  const [savedRoomInfo, setSavedRoomInfo] = useState<{
    roomId: string;
    playerId: string;
  } | null>(null);
  const [joinRoomId, setJoinRoomId] = useState('');

  useEffect(() => {
    // 檢查是否有保存的房間資訊
    const roomInfo = loadOnlineRoomInfo();
    if (roomInfo) {
      setSavedRoomInfo({
        roomId: roomInfo.roomId,
        playerId: roomInfo.playerId,
      });
    }
  }, []);

  const handleCreateRoom = () => {
    navigate('/online/game?action=create');
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      navigate(`/online/game?action=join&roomId=${joinRoomId.trim()}`);
    }
  };

  const handleReconnect = () => {
    if (savedRoomInfo) {
      navigate(`/online/game?action=rejoin&roomId=${savedRoomInfo.roomId}&playerId=${savedRoomInfo.playerId}`);
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

        {/* 重連提示 */}
        {savedRoomInfo && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              偵測到上次的遊戲記錄
            </p>
            <p className="text-xs text-blue-600 mb-3">
              房間 ID: <code className="bg-blue-100 px-2 py-1 rounded">{savedRoomInfo.roomId}</code>
            </p>
            <button
              onClick={handleReconnect}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
            >
              🔄 重新連接到房間
            </button>
          </div>
        )}

        {/* 創建房間 */}
        <div className="mb-4">
          <button
            onClick={handleCreateRoom}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-lg transition"
          >
            ➕ 創建新房間
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
            🚪 加入房間
          </button>
        </div>

        {/* 返回首頁 */}
        <button
          onClick={handleBackHome}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
        >
          ← 返回首頁
        </button>
      </div>
    </div>
  );
};

export default OnlineLobby;
