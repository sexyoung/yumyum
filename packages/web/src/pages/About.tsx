import { useNavigate } from 'react-router-dom';
import { trackButtonClick } from '../lib/analytics';

// 技術棧資訊
const techStack = [
  { category: '前端', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'React Router'] },
  { category: '後端', items: ['Hono.js', 'Node.js', 'WebSocket'] },
  { category: '部署', items: ['Vercel', 'Railway'] },
  { category: '測試', items: ['Vitest', 'Playwright'] },
] as const;

function About() {
  const navigate = useNavigate();

  const handleBack = () => {
    trackButtonClick({ button_name: 'back_home', page_location: '/about' });
    navigate('/');
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-700 to-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回按鈕 */}
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
        >
          ← 返回首頁
        </button>

        {/* 標題 */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
          關於 YumYum 好吃棋
        </h1>

        {/* 遊戲簡介 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">遊戲簡介</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            YumYum 好吃棋是一款受經典桌遊
            <a
              href="https://www.google.com/search?q=奇雞連連"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 hover:text-yellow-200 underline mx-1"
            >
              Gobblet Gobblers（奇雞連連）
            </a>
            啟發而製作的網頁版雙人對戰遊戲。玩家運用大、中、小三種尺寸的棋子，
            透過「吃掉」對方較小的棋子來佔領格子，率先連成一線即可獲勝。
          </p>
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">
              <span className="font-semibold">支持正版</span>：Gobblet Gobblers 是由 Blue Orange Games
              出版的優質桌遊，如果你喜歡這個遊戲，請購買實體版支持原創設計師！
            </p>
          </div>
        </section>

        {/* 製作者 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">製作者</h2>
          <div className="flex items-center gap-4">
            <img
              src="https://sheepht.com/sexyoung.jpeg"
              alt="sexyoung"
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <p className="text-lg font-medium">sexyoung</p>
              <p className="text-white/70 text-sm leading-relaxed">
                音遊中毒玩家，不管是跳舞機到太鼓達人，喜歡在晚上學習 YT 偏門冷知識，睡前一定要擼貓擼到開心再睡覺
              </p>
            </div>
          </div>
        </section>

        {/* 技術說明 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">技術說明</h2>
          <div className="grid grid-cols-2 gap-4">
            {techStack.map((tech) => (
              <div key={tech.category}>
                <h3 className="text-sm font-medium text-white/60 mb-2">{tech.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {tech.items.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-1 bg-white/10 rounded text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 聯絡方式 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">聯絡方式</h2>
          <div className="space-y-3">
            <a
              href="mailto:Habuche@gmail.com"
              className="flex items-center gap-3 text-white/80 hover:text-white transition"
              onClick={() => trackButtonClick({ button_name: 'contact_email', page_location: '/about' })}
            >
              <span>Habuche@gmail.com</span>
            </a>
            <a
              href="https://www.facebook.com/LowkeyMan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-white/80 hover:text-white transition"
              onClick={() => trackButtonClick({ button_name: 'contact_facebook', page_location: '/about' })}
            >
              <span>Facebook</span>
            </a>
          </div>
        </section>

        {/* 版權聲明 */}
        <footer className="text-center text-white/60 text-sm py-6 border-t border-white/10">
          <p>© 2026 YumYum 好吃棋. All rights reserved.</p>
          <p className="mt-1">Made with ❤️ by sexyoung</p>
        </footer>
      </div>
    </div>
  );
}

export default About;
