import { Link } from 'react-router-dom';
import { trackButtonClick } from '../lib/analytics';

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

const menuItems = [
  { to: '/ai', testId: 'link-ai', buttonName: 'ai_mode', colorClass: 'bg-green-500 hover:bg-green-600', label: '對戰電腦' },
  { to: '/local', testId: 'link-local', buttonName: 'local_mode', colorClass: 'bg-yellow-500 hover:bg-yellow-600', label: '本機雙人' },
  { to: '/online', testId: 'link-online', buttonName: 'online_mode', colorClass: 'bg-red-500 hover:bg-red-600', label: '線上雙人' },
] as const;

function Home() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4">
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 lg:mb-10">
        YumYum 好吃棋
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
            {item.label}
          </MenuLink>
        ))}
      </div>
      <Link
        to="/tutorial"
        data-testid="link-tutorial"
        onClick={() => trackButtonClick({ button_name: 'tutorial', page_location: '/' })}
        className="mt-6 text-white/80 hover:text-white hover:underline text-lg transition duration-300"
      >
        遊戲教學
      </Link>
    </div>
  );
}

export default Home;
