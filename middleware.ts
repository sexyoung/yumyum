export const config = {
  matcher: ['/api/:path*', '/health'],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname, search } = url;

  const targetHost = process.env.VITE_API_URL || 'https://yumyumgame-service-staging.up.railway.app';
  const destination = new URL(`${targetHost}${pathname}${search}`);

  // 官方「純 Web API」做法：回傳一個帶有特定 Header 的 Response
  const response = new Response(null, {
    headers: {
      'x-middleware-rewrite': destination.toString(),
    },
  });

  // 處理你的 Cache-Control 需求
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  return response;
}
