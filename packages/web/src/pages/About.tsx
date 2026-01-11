import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackButtonClick } from '../lib/analytics';
import SEO from '../components/SEO';

// 技術棧資訊
const techStack = [
  { categoryKey: 'frontend', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'React Router'] },
  { categoryKey: 'backend', items: ['Hono.js', 'Node.js', 'WebSocket'] },
  { categoryKey: 'deploy', items: ['Vercel', 'Railway'] },
  { categoryKey: 'testing', items: ['Vitest', 'Playwright'] },
] as const;

function About() {
  const navigate = useNavigate();
  const { t } = useTranslation(['about', 'common']);

  const handleBack = () => {
    trackButtonClick({ button_name: 'back_home', page_location: '/about' });
    navigate('/');
  };

  return (
    <>
      <SEO titleKey="about.title" descriptionKey="about.description" />
      <div className="min-h-dvh bg-gradient-to-br from-slate-700 to-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回按鈕 */}
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
        >
          ← {t('common:buttons.backHome')}
        </button>

        {/* 標題 */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
          {t('about:title')}
        </h1>

        {/* 遊戲簡介 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">{t('about:sections.intro.title')}</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            {t('about:sections.intro.content')}
            <a
              href="https://www.google.com/search?q=奇雞連連"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 hover:text-yellow-200 underline mx-1"
            >
              {t('about:sections.intro.linkText')}
            </a>
            {t('about:sections.intro.contentAfterLink')}
          </p>
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">
              <span className="font-semibold">{t('about:sections.intro.supportOriginal')}</span>：{t('about:sections.intro.supportOriginalContent')}
            </p>
          </div>
        </section>

        {/* 製作者 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">{t('about:sections.creator.title')}</h2>
          <div className="flex items-center gap-4">
            <img
              src="https://sheepht.com/sexyoung.jpeg"
              alt="sexyoung"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <p className="text-lg font-medium">sexyoung</p>
              <p className="text-white/70 text-sm leading-relaxed">
                {t('about:sections.creator.description')}
              </p>
            </div>
          </div>
        </section>

        {/* 技術說明 */}
        <section className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('about:sections.tech.title')}</h2>
          <div className="grid grid-cols-2 gap-4">
            {techStack.map((tech) => (
              <div key={tech.categoryKey}>
                <h3 className="text-sm font-medium text-white/60 mb-2">
                  {t(`about:sections.tech.${tech.categoryKey}`)}
                </h3>
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
          <h2 className="text-xl font-semibold mb-3">{t('about:sections.contact.title')}</h2>
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
          <p>{t('common:copyright')}</p>
          <p className="mt-1">{t('about:footer')}</p>
        </footer>
      </div>
      </div>
    </>
  );
}

export default About;
