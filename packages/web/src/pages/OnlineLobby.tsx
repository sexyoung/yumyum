// packages/web/src/pages/OnlineLobby.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { trackRoomCreate } from '../lib/analytics';
import {
  getPlayerIdentity,
  setPlayerIdentity,
  generatePlayerUuid,
  updatePlayerUsername,
} from '../lib/storage';
import NicknameModal from '../components/NicknameModal';
import SEO from '../components/SEO';
import type { PlayerInfo } from '@yumyum/types';

function OnlineLobby() {
  const navigate = useNavigate();
  const { t } = useTranslation(['online', 'common', 'errors']);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showEditNicknameModal, setShowEditNicknameModal] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：檢查玩家身份
  useEffect(() => {
    async function initPlayer(): Promise<void> {
      const identity = getPlayerIdentity();

      if (!identity) {
        // 沒有身份，顯示暱稱輸入框
        setShowNicknameModal(true);
        setIsLoading(false);
        return;
      }

      // 有身份，嘗試從伺服器取得最新資訊
      try {
        const info = await api.getMe(identity.uuid);
        setPlayerInfo(info);
        // 更新 localStorage 中的暱稱（可能在其他裝置改過）
        if (info.username !== identity.username) {
          updatePlayerUsername(info.username);
        }
      } catch (_error) {
        // 伺服器找不到玩家，可能是資料庫重設過，重新註冊
        console.log('玩家不存在，需要重新註冊');
        setShowNicknameModal(true);
      }
      setIsLoading(false);
    }

    initPlayer();
  }, []);

  // 註冊玩家
  const registerMutation = useMutation({
    mutationFn: ({ uuid, username }: { uuid: string; username: string }) =>
      api.registerPlayer(uuid, username),
    onSuccess: (data) => {
      setPlayerIdentity({
        uuid: data.player.uuid,
        username: data.player.username,
        playerId: data.player.id,
      });
      setPlayerInfo(data.player);
      setShowNicknameModal(false);
      setShowEditNicknameModal(false);
    },
  });

  // 更新暱稱
  const updateUsernameMutation = useMutation({
    mutationFn: ({ uuid, newUsername }: { uuid: string; newUsername: string }) =>
      api.updateUsername(uuid, newUsername),
    onSuccess: (data) => {
      updatePlayerUsername(data.username);
      if (playerInfo) {
        setPlayerInfo({ ...playerInfo, username: data.username });
      }
      setShowEditNicknameModal(false);
    },
  });

  // 創建房間
  const createRoomMutation = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (data) => {
      console.log('房間已創建:', data.roomId);
      trackRoomCreate();
      navigate(`/online/game/${data.roomId}`);
    },
    onError: (error) => {
      console.error('創建房間失敗:', error);
    },
  });

  // 處理首次設定暱稱
  function handleSetNickname(username: string): void {
    const identity = getPlayerIdentity();
    const uuid = identity?.uuid || generatePlayerUuid();
    registerMutation.mutate({ uuid, username });
  }

  // 處理修改暱稱
  function handleEditNickname(newUsername: string): void {
    const identity = getPlayerIdentity();
    if (identity) {
      updateUsernameMutation.mutate({ uuid: identity.uuid, newUsername });
    }
  }

  function handleCreateRoom(): void {
    createRoomMutation.mutate();
  }

  function handleJoinRoom(): void {
    const trimmedId = joinRoomId.trim();
    if (trimmedId) {
      navigate(`/online/game/${trimmedId}`);
    }
  }

  function handleBackHome(): void {
    navigate('/');
  }

  function handleGoToLeaderboard(): void {
    navigate('/leaderboard');
  }

  // 載入中
  if (isLoading) {
    return (
      <>
        <SEO titleKey="online.title" descriptionKey="online.description" />
        <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-red-400 to-rose-600">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO titleKey="online.title" descriptionKey="online.description" />
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-red-400 to-rose-600 p-4">
      {/* 首次設定暱稱 Modal */}
      <NicknameModal
        isOpen={showNicknameModal}
        onSubmit={handleSetNickname}
        title={t('online:nickname.setTitle')}
        canClose={false}
      />

      {/* 修改暱稱 Modal */}
      <NicknameModal
        isOpen={showEditNicknameModal}
        onSubmit={handleEditNickname}
        onClose={() => setShowEditNicknameModal(false)}
        initialUsername={playerInfo?.username || ''}
        title={t('online:nickname.editTitle')}
        canClose={true}
      />

      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          {t('online:lobby.title')}
        </h1>

        {/* 玩家資訊 */}
        {playerInfo && (
          <div className="mb-4 flex justify-center gap-4 text-sm text-gray-600">
            <span>{t('online:lobby.elo')}: <strong>{playerInfo.eloRating}</strong></span>
            <span>{t('online:lobby.winRate')}: <strong>{playerInfo.gamesPlayed > 0 ? Math.round(playerInfo.winRate * 100) : 0}%</strong></span>
            <span>{t('online:lobby.gamesPlayed')}: <strong>{playerInfo.gamesPlayed}</strong></span>
          </div>
        )}

        {/* 錯誤提示 */}
        {createRoomMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{t('errors:room.createFailed')}</p>
          </div>
        )}

        {updateUsernameMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {(updateUsernameMutation.error as any)?.response?.data?.error || t('errors:nickname.updateFailed')}
            </p>
          </div>
        )}

        {/* 創建房間 */}
        <div className="mb-4">
          <button
            onClick={handleCreateRoom}
            disabled={createRoomMutation.isPending || !playerInfo}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
          >
            {createRoomMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('online:lobby.creating')}
              </>
            ) : (
              t('online:lobby.createRoom')
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {t('online:lobby.createRoomHint')}
          </p>
        </div>

        {/* 分隔線 */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">{t('common:or')}</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* 加入房間 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('online:lobby.inputRoomId')}
          </label>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            placeholder={t('online:lobby.roomIdPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!joinRoomId.trim() || !playerInfo}
            className="w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition"
            data-testid="join-room-btn"
          >
            {t('online:lobby.joinRoom')}
          </button>
        </div>

        {/* 排行榜入口 */}
        <button
          onClick={handleGoToLeaderboard}
          className="w-full px-4 py-3 mb-3 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
          data-testid="leaderboard-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-2.927 0"
            />
          </svg>
          {t('online:lobby.leaderboard')}
        </button>

        {/* 返回首頁 */}
        <button
          onClick={handleBackHome}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
          data-testid="back-home-btn"
        >
          {t('common:buttons.backHome')}
        </button>

        {/* 修改暱稱連結 */}
        {playerInfo && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowEditNicknameModal(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
              data-testid="edit-nickname-btn"
            >
              {t('online:lobby.editNickname')} <span className="underline">{playerInfo.username}</span>
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default OnlineLobby;
