export default function middleware() {
  return new Response("Middleware is working!", { status: 200 });
}