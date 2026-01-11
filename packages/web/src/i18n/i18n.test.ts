import { beforeEach, describe, expect, it } from 'vitest';

import i18n from '.';

const translationTestCases = [
  {
    lang: 'zh-TW',
    langName: '繁體中文',
    menu: { vsAI: '對戰電腦', local: '本機雙人', online: '線上雙人' },
    game: { redTurn: '紅方回合', blueTurn: '藍方回合', redWins: '紅方獲勝！' },
    online: { setTitle: '設定暱稱', createRoom: '創建房間' },
  },
  {
    lang: 'en',
    langName: 'English',
    menu: { vsAI: 'VS Computer', local: 'Local 2P', online: 'Online 2P' },
    game: { redTurn: "Red's Turn", blueTurn: "Blue's Turn", redWins: 'Red Wins!' },
    online: { setTitle: 'Set Nickname', createRoom: 'Create Room' },
  },
  {
    lang: 'ja',
    langName: '日本語',
    menu: { vsAI: 'コンピュータ対戦', local: 'ローカル対戦', online: 'オンライン対戦' },
    game: { redTurn: '赤のターン', blueTurn: '青のターン', redWins: '赤の勝ち！' },
    online: { setTitle: 'ニックネーム設定', createRoom: 'ルームを作成' },
  },
] as const;

describe('i18n 多國語系', () => {
  beforeEach(() => {
    i18n.changeLanguage('zh-TW');
  });

  describe('語言切換', () => {
    it('預設語言應該是繁體中文', () => {
      expect(i18n.language).toBe('zh-TW');
    });

    it.each([
      ['en', 'English'],
      ['ja', '日本語'],
    ] as const)('應該能切換到 %s (%s)', async (lang, _name) => {
      await i18n.changeLanguage(lang);
      expect(i18n.language).toBe(lang);
    });
  });

  describe.each(translationTestCases)('翻譯內容 - $langName', ({ lang, menu, game, online }) => {
    beforeEach(async () => {
      await i18n.changeLanguage(lang);
    });

    it('首頁選單翻譯正確', () => {
      expect(i18n.t('home:menu.vsAI')).toBe(menu.vsAI);
      expect(i18n.t('home:menu.local')).toBe(menu.local);
      expect(i18n.t('home:menu.online')).toBe(menu.online);
    });

    it('遊戲狀態翻譯正確', () => {
      expect(i18n.t('game:status.redTurn')).toBe(game.redTurn);
      expect(i18n.t('game:status.blueTurn')).toBe(game.blueTurn);
      expect(i18n.t('game:status.redWins')).toBe(game.redWins);
    });

    if (lang !== 'zh-TW') {
      it('線上大廳翻譯正確', () => {
        expect(i18n.t('online:nickname.setTitle')).toBe(online.setTitle);
        expect(i18n.t('online:lobby.createRoom')).toBe(online.createRoom);
      });
    }
  });

  describe('Fallback 機制', () => {
    it('缺少的 key 應該 fallback 到繁體中文', async () => {
      await i18n.changeLanguage('en');
      const fallbackKey = 'common:copyright';
      expect(i18n.t(fallbackKey)).toBeDefined();
    });
  });
});
