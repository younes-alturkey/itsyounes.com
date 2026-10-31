import { DEEPSEEK, apiKey, rateLimit, clientIp } from '@/lib/agent-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 80, 10 * 60 * 1000)) return new Response('Too many requests', { status: 429 });
  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const query = String(body.query || '').trim().slice(0, 128);
  if (!query) return new Response('Missing query', { status: 400 });
  const count = Math.max(1, Math.min(8, body.count | 0 || 5));
  const r = await fetch(DEEPSEEK.search, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, count }),
  });
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { 'Content-Type': 'application/json' } });
}
