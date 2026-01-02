import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 text-white">
      <h1 className="text-6xl font-bold mb-8">YumYum 吞吞棋</h1>
      <div className="flex flex-col space-y-4">
        <Link to="/ai" className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-lg text-2xl font-semibold text-center transition duration-300">
          單人遊戲 (對戰 AI)
        </Link>
        <Link to="/local" className="px-8 py-4 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-2xl font-semibold text-center transition duration-300">
          本機雙人
        </Link>
        <Link to="/online" className="px-8 py-4 bg-red-500 hover:bg-red-600 rounded-lg text-2xl font-semibold text-center transition duration-300">
          線上雙人
        </Link>
      </div>
    </div>
  );
};

export default Home;
