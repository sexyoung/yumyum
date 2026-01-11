import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 初始化 i18n（測試環境使用繁體中文）
import '../i18n';
import i18n from 'i18next';
i18n.changeLanguage('zh-TW');

// 每個測試後清理 DOM
afterEach(() => {
  cleanup();
});
