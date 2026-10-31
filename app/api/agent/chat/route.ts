// Streams a DeepSeek chat completion to the browser. The system prompt, tools and API key live here.
import { DEEPSEEK, apiKey, systemPrompt, TOOLS, rateLimit, clientIp } from '@/lib/agent-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const ROLES = new Set(['user', 'assistant', 'tool']);

function sanitizeMessages(input: unknown) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 80) return null;
  let bytes = 0;
  const out = [];
  for (const m of input) {
    if (!m || typeof m !== 'object' || !ROLES.has((m as any).role)) return null;
    const role = (m as any).role as string;
    const content = typeof (m as any).content === 'string' ? (m as any).content : '';
    bytes += content.length;
    const msg: any = { role, content };
    if (role === 'assistant' && Array.isArray((m as any).tool_calls)) {
      msg.tool_calls = (m as any).tool_calls.slice(0, 8).map((c: any) => ({
        id: String(c.id || '').slice(0, 64), type: 'function',
        function: { name: String(c.function?.name || '').slice(0, 40), arguments: String(c.function?.arguments || '').slice(0, 60000) },
      }));
    }
    if (role === 'tool') msg.tool_call_id = String((m as any).tool_call_id || '').slice(0, 64);
    out.push(msg);
  }
  if (bytes > 400000) return null;
  return out;
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 60, 10 * 60 * 1000)) return new Response('Too many requests', { status: 429 });
  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const messages = sanitizeMessages(body.messages);
  if (!messages) return new Response('Bad messages', { status: 400 });
  const locale = body.locale === 'ar' ? 'ar' : 'en';
  const step = Math.max(1, Math.min(20, body.step | 0 || 1));
  const maxSteps = Math.max(1, Math.min(20, body.maxSteps | 0 || 8));
  const secondsLeft = Math.max(0, Math.min(600, body.secondsLeft | 0));
  const fileCount = Math.max(0, Math.min(50, body.fileCount | 0));
  const toolsOff = !!body.toolsOff;

  const tail = { role: 'user', content: `[runtime] step ${step} of ${maxSteps}, ${secondsLeft}s left in the time budget, ${fileCount} file(s) created so far.${toolsOff ? ' Tools are off now: write the final message.' : ''}` };
  const payload = {
    model: DEEPSEEK.model,
    messages: [{ role: 'system', content: systemPrompt(locale) }, ...messages, tail],
    tools: TOOLS,
    tool_choice: toolsOff ? 'none' : 'auto',
    stream: true,
    thinking: { type: 'disabled' },
    max_tokens: DEEPSEEK.maxOutputTokens,
    temperature: 0.6,
  };

  let upstream: Response;
  try {
    upstream = await fetch(DEEPSEEK.chat, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: req.signal,
    });
  } catch (e: any) {
    return new Response('Upstream error: ' + (e?.message || 'unknown'), { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '');
    return new Response('Model request failed: ' + upstream.status + ' ' + t.slice(0, 300), { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
  });
}
