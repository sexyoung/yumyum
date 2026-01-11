import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackButtonClick } from '../lib/analytics';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SEO from '../components/SEO';

interface MenuLinkProps {
  to: string;
  testId: string;
  buttonName: string;
  colorClass: string;
  children: React.ReactNode;
}

function MenuLink({ to, testId, buttonName, colorClass, children }: MenuLinkProps) {
  const baseClass = 'px-6 py-3 sm:px-8 sm:py-4 rounded-lg text-xl sm:text-2xl md:text-3xl font-semibold text-center transition duration-300';

  return (
    <Link
      to={to}
      data-testid={testId}
      onClick={() => trackButtonClick({ button_name: buttonName, page_location: '/' })}
      className={`${baseClass} ${colorClass}`}
    >
      {children}
    </Link>
  );
}

function Home() {
  const { t } = useTranslation(['home', 'common']);

  const menuItems = [
    { to: '/ai', testId: 'link-ai', buttonName: 'ai_mode', colorClass: 'bg-green-500 hover:bg-green-600', labelKey: 'menu.vsAI' },
    { to: '/local', testId: 'link-local', buttonName: 'local_mode', colorClass: 'bg-yellow-500 hover:bg-yellow-600', labelKey: 'menu.local' },
    { to: '/online', testId: 'link-online', buttonName: 'online_mode', colorClass: 'bg-red-500 hover:bg-red-600', labelKey: 'menu.online' },
  ] as const;

  return (
    <>
      <SEO titleKey="home.title" descriptionKey="home.description" />
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4 relative">
        {/* 語言切換器 */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="dropdown" />
        </div>

        {/* logo */}
        <Logo size={160} className="mb-4 sm:mb-6" />
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 lg:mb-10">
          {t('home:title')}
        </h1>
        <div className="flex flex-col space-y-3 sm:space-y-4 w-full max-w-xs sm:max-w-sm md:max-w-md">
          {menuItems.map((item) => (
            <MenuLink
              key={item.to}
              to={item.to}
              testId={item.testId}
              buttonName={item.buttonName}
              colorClass={item.colorClass}
            >
              {t(`home:${item.labelKey}`)}
            </MenuLink>
          ))}
        </div>
        <div className="mt-6 flex gap-4">
          <Link
            to="/tutorial"
            data-testid="link-tutorial"
            onClick={() => trackButtonClick({ button_name: 'tutorial', page_location: '/' })}
            className="text-white/80 hover:text-white hover:underline text-lg transition duration-300"
          >
            {t('home:links.tutorial')}
          </Link>
          <span className="text-white/40">|</span>
          <Link
            to="/about"
            data-testid="link-about"
            onClick={() => trackButtonClick({ button_name: 'about', page_location: '/' })}
            className="text-white/80 hover:text-white hover:underline text-lg transition duration-300"
          >
            {t('home:links.about')}
          </Link>
        </div>
        <footer className="absolute bottom-4 text-white/50 text-sm">
          {t('common:copyright')}
        </footer>
      </div>
    </>
  );
}

export default Home;
