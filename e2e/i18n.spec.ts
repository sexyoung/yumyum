import { expect, Page, test } from '@playwright/test';

type Language = 'zh-TW' | 'en' | 'ja';

interface LanguageTexts {
  menu: { vsAI: string; local: string; online: string };
  game: { redTurn: string; redWins: string };
  ai: { yourTurn: string };
  online: { setNickname: string };
  about: { title: string };
}

const languageData: Record<Language, LanguageTexts> = {
  'zh-TW': {
    menu: { vsAI: '對戰電腦', local: '本機雙人', online: '線上雙人' },
    game: { redTurn: '紅方回合', redWins: '紅方獲勝！' },
    ai: { yourTurn: '你的回合' },
    online: { setNickname: '設定暱稱' },
    about: { title: '關於 YumYum' },
  },
  en: {
    menu: { vsAI: 'VS Computer', local: 'Local 2P', online: 'Online 2P' },
    game: { redTurn: "Red's Turn", redWins: 'Red Wins!' },
    ai: { yourTurn: 'Your Turn' },
    online: { setNickname: 'Set Nickname' },
    about: { title: 'About YumYum' },
  },
  ja: {
    menu: { vsAI: 'コンピュータ対戦', local: 'ローカル対戦', online: 'オンライン対戦' },
    game: { redTurn: '赤のターン', redWins: '赤の勝ち！' },
    ai: { yourTurn: 'あなたのターン' },
    online: { setNickname: 'ニックネーム設定' },
    about: { title: 'ヤムヤムについて' },
  },
};

async function switchLanguage(page: Page, lang: Language): Promise<void> {
  await page.selectOption('[data-testid="language-switcher"]', lang);
}

async function setLanguagePreference(page: Page, lang: Language): Promise<void> {
  await page.evaluate((language) => {
    localStorage.setItem('yumyum:language', language);
  }, lang);
}

async function playWinningMoves(page: Page): Promise<void> {
  await page.click('[data-testid="reserve-red-small"]');
  await page.click('[data-testid="cell-0-0"]');
  await page.click('[data-testid="reserve-blue-small"]');
  await page.click('[data-testid="cell-1-0"]');
  await page.click('[data-testid="reserve-red-small"]');
  await page.click('[data-testid="cell-0-1"]');
  await page.click('[data-testid="reserve-blue-small"]');
  await page.click('[data-testid="cell-1-1"]');
  await page.click('[data-testid="reserve-red-medium"]');
  await page.click('[data-testid="cell-0-2"]');
}

test.describe('多國語系 (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('首頁語言切換', () => {
    test('預設應該顯示繁體中文介面', async ({ page }) => {
      await page.goto('/');
      const texts = languageData['zh-TW'].menu;
      await expect(page.locator(`text=${texts.vsAI}`)).toBeVisible();
      await expect(page.locator(`text=${texts.local}`)).toBeVisible();
      await expect(page.locator(`text=${texts.online}`)).toBeVisible();
    });

    const nonDefaultLanguages: Array<{ lang: Language; name: string }> = [
      { lang: 'en', name: '英文' },
      { lang: 'ja', name: '日文' },
    ];

    for (const { lang, name } of nonDefaultLanguages) {
      test(`切換到${name}後應該顯示${name}介面`, async ({ page }) => {
        await page.goto('/');
        await switchLanguage(page, lang);
        const texts = languageData[lang].menu;
        await expect(page.locator(`text=${texts.vsAI}`)).toBeVisible();
        await expect(page.locator(`text=${texts.local}`)).toBeVisible();
        await expect(page.locator(`text=${texts.online}`)).toBeVisible();
      });
    }
  });

  test.describe('語言偏好持久化', () => {
    const persistenceTests: Array<{ lang: Language; name: string; expectedText: string }> = [
      { lang: 'en', name: '英文', expectedText: languageData.en.menu.vsAI },
      { lang: 'ja', name: '日文', expectedText: languageData.ja.menu.vsAI },
    ];

    for (const { lang, name, expectedText } of persistenceTests) {
      test(`重新整理後應該保持語言設定（${name}）`, async ({ page }) => {
        await page.goto('/');
        await switchLanguage(page, lang);
        await expect(page.locator(`text=${expectedText}`)).toBeVisible();
        await page.reload();
        await expect(page.locator(`text=${expectedText}`)).toBeVisible();
      });
    }

    test('localStorage 語言偏好應該被讀取', async ({ page }) => {
      await page.goto('/');
      await setLanguagePreference(page, 'en');
      await page.reload();
      await expect(page.locator(`text=${languageData.en.menu.vsAI}`)).toBeVisible();
    });
  });

  test.describe('本機雙人遊戲頁面', () => {
    const gameTests: Array<{ lang: Language; name: string }> = [
      { lang: 'en', name: '英文' },
      { lang: 'ja', name: '日文' },
    ];

    for (const { lang, name } of gameTests) {
      test.describe(name, () => {
        test.beforeEach(async ({ page }) => {
          await page.goto('/');
          await setLanguagePreference(page, lang);
        });

        test(`應該顯示${name}遊戲狀態`, async ({ page }) => {
          await page.goto('/local');
          await expect(page.locator(`text=${languageData[lang].game.redTurn}`)).toBeVisible();
        });

        test(`遊戲結束後應該顯示${name}獲勝訊息`, async ({ page }) => {
          await page.goto('/local');
          await playWinningMoves(page);
          await expect(page.locator(`text=${languageData[lang].game.redWins}`)).toBeVisible();
        });
      });
    }
  });

  test.describe('AI 對戰頁面', () => {
    const aiTests: Array<{ lang: Language; name: string }> = [
      { lang: 'en', name: '英文' },
      { lang: 'ja', name: '日文' },
    ];

    for (const { lang, name } of aiTests) {
      test.describe(name, () => {
        test.beforeEach(async ({ page }) => {
          await page.goto('/');
          await setLanguagePreference(page, lang);
        });

        test(`應該顯示${name}遊戲狀態`, async ({ page }) => {
          await page.goto('/ai');
          await expect(page.locator(`text=${languageData[lang].ai.yourTurn}`)).toBeVisible();
        });
      });
    }
  });

  test.describe('線上大廳頁面', () => {
    const onlineTests: Array<{ lang: Language; name: string }> = [
      { lang: 'en', name: '英文' },
      { lang: 'ja', name: '日文' },
    ];

    for (const { lang, name } of onlineTests) {
      test.describe(name, () => {
        test.beforeEach(async ({ page }) => {
          await page.goto('/');
          await setLanguagePreference(page, lang);
        });

        test(`暱稱 Modal 應該顯示${name}`, async ({ page }) => {
          await page.evaluate(() => localStorage.removeItem('yumyum:player'));
          await page.goto('/online');
          await expect(page.locator(`text=${languageData[lang].online.setNickname}`)).toBeVisible();
        });
      });
    }
  });

  test.describe('關於頁面', () => {
    const aboutTests: Array<{ lang: Language; name: string }> = [
      { lang: 'en', name: '英文' },
      { lang: 'ja', name: '日文' },
    ];

    for (const { lang, name } of aboutTests) {
      test.describe(name, () => {
        test.beforeEach(async ({ page }) => {
          await page.goto('/');
          await setLanguagePreference(page, lang);
        });

        test(`應該顯示${name}內容`, async ({ page }) => {
          await page.goto('/about');
          await expect(page.locator(`text=${languageData[lang].about.title}`)).toBeVisible();
        });
      });
    }
  });

  test.describe('跨頁面語言一致性', () => {
    test('切換語言後導航到其他頁面應該保持語言設定', async ({ page }) => {
      await page.goto('/');
      await switchLanguage(page, 'en');
      await expect(page.locator(`text=${languageData.en.menu.vsAI}`)).toBeVisible();
      await page.click('[data-testid="link-ai"]');
      await expect(page.locator(`text=${languageData.en.ai.yourTurn}`)).toBeVisible();
      await page.goto('/');
      await expect(page.locator(`text=${languageData.en.menu.vsAI}`)).toBeVisible();
    });
  });
});
