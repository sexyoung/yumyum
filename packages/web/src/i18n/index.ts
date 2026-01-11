import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enAbout from './locales/en/about.json';
import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enGame from './locales/en/game.json';
import enHome from './locales/en/home.json';
import enOnline from './locales/en/online.json';
import enTutorial from './locales/en/tutorial.json';
import jaAbout from './locales/ja/about.json';
import jaCommon from './locales/ja/common.json';
import jaErrors from './locales/ja/errors.json';
import jaGame from './locales/ja/game.json';
import jaHome from './locales/ja/home.json';
import jaOnline from './locales/ja/online.json';
import jaTutorial from './locales/ja/tutorial.json';
import zhTWAbout from './locales/zh-TW/about.json';
import zhTWCommon from './locales/zh-TW/common.json';
import zhTWErrors from './locales/zh-TW/errors.json';
import zhTWGame from './locales/zh-TW/game.json';
import zhTWHome from './locales/zh-TW/home.json';
import zhTWOnline from './locales/zh-TW/online.json';
import zhTWTutorial from './locales/zh-TW/tutorial.json';

export const supportedLanguages = ['zh-TW', 'en', 'ja'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
};

const namespaces = ['common', 'home', 'game', 'online', 'tutorial', 'about', 'errors'] as const;

const resources = {
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
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-TW',
    supportedLngs: [...supportedLanguages],
    ns: [...namespaces],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'yumyum:language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
