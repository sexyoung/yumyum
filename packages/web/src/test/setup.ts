import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 測試用的翻譯資源（直接導入 JSON）
// zh-TW
import zhTWCommon from '../../public/locales/zh-TW/common.json';
import zhTWHome from '../../public/locales/zh-TW/home.json';
import zhTWGame from '../../public/locales/zh-TW/game.json';
import zhTWOnline from '../../public/locales/zh-TW/online.json';
import zhTWTutorial from '../../public/locales/zh-TW/tutorial.json';
import zhTWAbout from '../../public/locales/zh-TW/about.json';
import zhTWErrors from '../../public/locales/zh-TW/errors.json';
// en
import enCommon from '../../public/locales/en/common.json';
import enHome from '../../public/locales/en/home.json';
import enGame from '../../public/locales/en/game.json';
import enOnline from '../../public/locales/en/online.json';
import enTutorial from '../../public/locales/en/tutorial.json';
import enAbout from '../../public/locales/en/about.json';
import enErrors from '../../public/locales/en/errors.json';
// ja
import jaCommon from '../../public/locales/ja/common.json';
import jaHome from '../../public/locales/ja/home.json';
import jaGame from '../../public/locales/ja/game.json';
import jaOnline from '../../public/locales/ja/online.json';
import jaTutorial from '../../public/locales/ja/tutorial.json';
import jaAbout from '../../public/locales/ja/about.json';
import jaErrors from '../../public/locales/ja/errors.json';

// 初始化 i18n（測試環境使用靜態資源）
i18n.use(initReactI18next).init({
  lng: 'zh-TW',
  fallbackLng: 'zh-TW',
  ns: ['common', 'home', 'game', 'online', 'tutorial', 'about', 'errors'],
  defaultNS: 'common',
  resources: {
    'zh-TW': {
      common: zhTWCommon,
      home: zhTWHome,
      game: zhTWGame,
      online: zhTWOnline,
      tutorial: zhTWTutorial,
      about: zhTWAbout,
      errors: zhTWErrors,
    },
    en: {
      common: enCommon,
      home: enHome,
      game: enGame,
      online: enOnline,
      tutorial: enTutorial,
      about: enAbout,
      errors: enErrors,
    },
    ja: {
      common: jaCommon,
      home: jaHome,
      game: jaGame,
      online: jaOnline,
      tutorial: jaTutorial,
      about: jaAbout,
      errors: jaErrors,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

// 每個測試後清理 DOM
afterEach(() => {
  cleanup();
});
