import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';

function App() {
  // 使用 React Query 呼叫 API
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-8">
      <div className="text-center text-white max-w-2xl">
        <h1 className="text-6xl font-bold mb-4">YumYum 吞吞棋</h1>
        <p className="text-xl mb-8">Monorepo 初始化成功！</p>

        {/* API 連線狀態卡片 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-4">
          <h2 className="text-2xl font-semibold mb-4">🔗 前後端連線測試</h2>

          <div className="space-y-4 text-left">
            {/* 健康檢查 */}
            <div className="bg-white/5 rounded p-4">
              <h3 className="font-semibold mb-2">API Gateway 狀態</h3>
              {healthLoading && <p className="text-sm">載入中...</p>}
              {healthError && <p className="text-red-300 text-sm">❌ 連線失敗</p>}
              {healthData && (
                <p className="text-sm">
                  ✅ {healthData.service} - {healthData.status}
                </p>
              )}
            </div>

            {/* 房間列表 */}
            <div className="bg-white/5 rounded p-4">
              <h3 className="font-semibold mb-2">房間列表</h3>
              {roomsLoading && <p className="text-sm">載入中...</p>}
              {roomsData && (
                <p className="text-sm">
                  📋 目前房間數量: {roomsData.length} 個
                  {roomsData.length === 0 && ' (尚無房間)'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 技術棧說明 */}
        <div className="text-sm text-white/80 space-y-1">
          <p>前端: <code className="bg-white/20 px-2 py-1 rounded">React + Vite + TanStack Query + Axios</code></p>
          <p>後端: <code className="bg-white/20 px-2 py-1 rounded">Hono.js + TypeScript</code></p>
          <p className="text-xs mt-2">
            前端: localhost:5173 | 後端: localhost:3000
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
