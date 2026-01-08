import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4">
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 lg:mb-10">YumYum 吞吞棋</h1>
      <div className="flex flex-col space-y-3 sm:space-y-4 w-full max-w-xs sm:max-w-sm md:max-w-md">
        <Link to="/ai" data-testid="link-ai" className="px-6 py-3 sm:px-8 sm:py-4 bg-green-500 hover:bg-green-600 rounded-lg text-xl sm:text-2xl md:text-3xl font-semibold text-center transition duration-300">
          對戰電腦
        </Link>
        <Link to="/local" data-testid="link-local" className="px-6 py-3 sm:px-8 sm:py-4 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-xl sm:text-2xl md:text-3xl font-semibold text-center transition duration-300">
          本機雙人
        </Link>
        <Link to="/online" data-testid="link-online" className="px-6 py-3 sm:px-8 sm:py-4 bg-red-500 hover:bg-red-600 rounded-lg text-xl sm:text-2xl md:text-3xl font-semibold text-center transition duration-300">
          線上雙人
        </Link>
      </div>
      <Link to="/tutorial" data-testid="link-tutorial" className="mt-6 text-white/80 hover:text-white hover:underline text-lg transition duration-300">
        遊戲教學
      </Link>
    </div>
  );
};

export default Home;
