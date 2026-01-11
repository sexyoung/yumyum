import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  titleKey: string;
  descriptionKey: string;
  path?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://yumyum.sexyoung.tw';
const SUPPORTED_LANGUAGES = ['zh-TW', 'en', 'ja'] as const;

// 根據語言選擇對應的 OG 圖片
const getOgImage = (lang: string): string => {
  if (lang === 'en') return `${BASE_URL}/og-image-en.png`;
  if (lang === 'ja') return `${BASE_URL}/og-image-ja.png`;
  return `${BASE_URL}/og-image.png`; // zh-TW 和其他語言使用預設
};

export default function SEO({
  titleKey,
  descriptionKey,
  path,
  noindex = false,
}: SEOProps) {
  const { t, i18n } = useTranslation('seo');
  const location = useLocation();

  const currentPath = path || location.pathname;
  const canonicalUrl = `${BASE_URL}${currentPath}`;
  const currentLang = i18n.language;

  const title = t(titleKey);
  const description = t(descriptionKey);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <html lang={currentLang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* hreflang for multilingual SEO */}
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${BASE_URL}${currentPath}?lng=${lang}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={getOgImage(currentLang)} />
      <meta property="og:locale" content={currentLang.replace('-', '_')} />
      <meta property="og:site_name" content={t('siteName')} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={getOgImage(currentLang)} />
    </Helmet>
  );
}
