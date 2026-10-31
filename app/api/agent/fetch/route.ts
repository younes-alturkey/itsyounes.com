import { DEEPSEEK, apiKey, rateLimit, clientIp } from '@/lib/agent-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 80, 10 * 60 * 1000)) return new Response('Too many requests', { status: 429 });
  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const url = String(body.url || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(url) || url.length > 2048) return new Response('Bad URL', { status: 400 });
  const r = await fetch(DEEPSEEK.fetch, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { 'Content-Type': 'application/json' } });
}
