import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Home 保持靜態導入 - 首頁需要最快載入
import Home from './pages/Home';

// 其他頁面 lazy loading
const LocalGame = lazy(() => import('./pages/LocalGame'));
const AIGame = lazy(() => import('./pages/AIGame'));
const OnlineLobby = lazy(() => import('./pages/OnlineLobby'));
const OnlineGame = lazy(() => import('./pages/OnlineGame'));
const Tutorial = lazy(() => import('./pages/Tutorial'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const About = lazy(() => import('./pages/About'));

function PageLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );
}

/**
 * AppRoutes 組件包含主要遊戲路由
 * 分離出來以便於測試 (可以用 MemoryRouter 包裝)
 */
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/local" element={<LocalGame />} />
        <Route path="/ai" element={<AIGame />} />
        <Route path="/online" element={<OnlineLobby />} />
        <Route path="/online/game/:roomId" element={<OnlineGame />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
