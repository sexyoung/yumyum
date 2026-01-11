import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageNames, SupportedLanguage } from '../i18n';
import { setLanguagePreference } from '../lib/storage';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons';
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'dropdown',
  className = '',
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    setLanguagePreference(lang);
    document.documentElement.lang = lang;
  };

  // Dropdown 版本
  if (variant === 'dropdown') {
    return (
      <select
        data-testid="language-switcher"
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
        className={`px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer ${className}`}
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang} className="text-gray-800">
            {languageNames[lang]}
          </option>
        ))}
      </select>
    );
  }

  // Buttons 版本
  return (
    <div className={`flex gap-1 ${className}`}>
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-2 py-1 rounded text-sm transition ${
            i18n.language === lang
              ? 'bg-white text-gray-800 font-bold'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {languageNames[lang]}
        </button>
      ))}
    </div>
  );
}
