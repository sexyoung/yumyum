import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface NicknameModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => void;
  onClose?: () => void;
  initialUsername?: string;
  title?: string;
  canClose?: boolean;
}

/**
 * 暱稱輸入 Modal
 * 用於首次進入線上大廳時設定暱稱，或修改暱稱
 */
export default function NicknameModal({
  isOpen,
  onSubmit,
  onClose,
  initialUsername = '',
  title,
  canClose = false,
}: NicknameModalProps) {
  const { t } = useTranslation(['online', 'common', 'errors']);
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 當 modal 開啟時自動聚焦到輸入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // 初始值改變時更新
  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  const validateUsername = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      return t('errors:nickname.tooShort');
    }
    if (trimmed.length > 20) {
      return t('errors:nickname.tooLong');
    }
    // 簡單的敏感詞過濾（可擴充）
    const badWords = ['admin', 'administrator', '管理員'];
    if (badWords.some(word => trimmed.toLowerCase().includes(word))) {
      return t('errors:nickname.badContent');
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onSubmit(username.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (!isOpen) return null;

  const displayTitle = title || t('online:nickname.setTitle');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 animate-fade-in">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">{displayTitle}</h2>
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label={t('common:buttons.close')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-600 mb-2">
              {t('online:nickname.inputLabel')}
            </label>
            <input
              ref={inputRef}
              id="nickname"
              type="text"
              value={username}
              onChange={handleChange}
              placeholder={t('online:nickname.placeholder')}
              className={`
                w-full px-4 py-3 rounded-lg border-2 text-lg
                focus:outline-none focus:ring-2 focus:ring-orange-400
                transition
                ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}
              `}
              maxLength={20}
              autoComplete="off"
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="
              w-full py-3 px-4 rounded-lg
              bg-gradient-to-r from-orange-400 to-yellow-400
              text-white font-bold text-lg
              hover:from-orange-500 hover:to-yellow-500
              focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2
              transition transform hover:scale-[1.02]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            "
            disabled={username.trim().length < 2}
          >
            {t('common:buttons.confirm')}
          </button>
        </form>

        {/* 提示文字 */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          {t('online:nickname.hint')}
        </p>
      </div>
    </div>
  );
}
