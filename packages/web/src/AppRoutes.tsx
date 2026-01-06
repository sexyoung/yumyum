import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import LocalGame from './pages/LocalGame';
import AIGame from './pages/AIGame';
import OnlineLobby from './pages/OnlineLobby';
import OnlineGame from './pages/OnlineGame';

/**
 * AppRoutes 組件包含主要遊戲路由
 * 分離出來以便於測試 (可以用 MemoryRouter 包裝)
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/local" element={<LocalGame />} />
      <Route path="/ai" element={<AIGame />} />
      <Route path="/online" element={<OnlineLobby />} />
      <Route path="/online/game" element={<OnlineGame />} />
    </Routes>
  );
}

export default AppRoutes;
