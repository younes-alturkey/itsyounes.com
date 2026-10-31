// In-page agent, browser side. Stateless: the conversation lives in memory only.
// The model, tools and key are on the server (/api/agent/*); this runs the loop and renders the chat.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type Dict = {
  ready: string; working: string; placeholder: string; greeting: string;
  chips: { label: string; prompt: string }[];
  nodePrompts: Record<string, string>;
  trace: Record<string, string>;
  errors: { stopped: string; generic: string; retry: string };
  artifact: { download: string; open: string; pdf: string; expand: string; collapse: string; meta: string };
};

export type AgentHandle = { ask: (q: string) => void; askTopic: (key: string) => void; dispose: () => void };

const CFG = { maxSteps: 8, timeBudgetMs: 180000 };

export function initAgent(opts: {
  els: { log: HTMLElement; chips: HTMLElement; form: HTMLFormElement; input: HTMLInputElement; status: HTMLElement; clearBtn?: HTMLElement | null; stopBtn?: HTMLElement | null; askSection?: HTMLElement | null };
  t: Dict; locale: string; reduced: boolean;
}): AgentHandle {
  const { log, chips, form, input, status, clearBtn, stopBtn, askSection } = opts.els;
  const T = opts.t, locale = opts.locale, reduced = opts.reduced;
  const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const el = (tag: string, cls?: string, html?: string) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const md = (text: string) => DOMPurify.sanitize(marked.parse(text || '', { breaks: true, gfm: true, async: false }) as string, { ADD_ATTR: ['target'] });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const scrollLog = () => { log.scrollTop = log.scrollHeight; };
  const setStatus = (text: string, busy: boolean) => { status.classList.toggle('busy', busy); status.innerHTML = '<span class="led"></span> ' + esc(text); };

  let messages: any[] = [];
  let busy = false;
  let abort: AbortController | null = null;
  let fileCount = 0;
  const scene = () => (window as any).SCENE;

  function addUser(text: string) { const m = el('div', 'msg user'); m.textContent = text; log.appendChild(m); scrollLog(); }
  function startBot() {
    const root = el('div', 'msg bot'), trace = el('div', 'trace'), body = el('div', 'answer md');
    root.appendChild(trace); root.appendChild(body); log.appendChild(root); scrollLog();
    return { root, trace, body, signal: undefined as AbortSignal | undefined };
  }
  function traceRow(trace: HTMLElement, text: string) {
    const row = el('span', '', '<i></i><em></em>');
    (row.querySelector('em') as HTMLElement).textContent = text;
    trace.appendChild(row);
    requestAnimationFrame(() => row.classList.add('on'));
    scrollLog();
    const em = row.querySelector('em') as HTMLElement;
    return {
      done(t?: string) { row.classList.add('done'); if (t) em.textContent = t; },
      fail(t?: string) { row.classList.add('fail'); if (t) em.textContent = t; },
      label(t: string) { em.textContent = t; },
      remove() { row.remove(); },
    };
  }

  // ---------- artifacts
  const KIND: Record<string, string> = { html: 'html', htm: 'html', md: 'markdown', markdown: 'markdown', csv: 'csv', txt: 'text', json: 'text', svg: 'svg' };
  const MIME: Record<string, string> = { html: 'text/html', markdown: 'text/markdown', csv: 'text/csv', text: 'text/plain', svg: 'image/svg+xml' };
  function csvTable(csv: string) {
    const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
    for (let i = 0; i < csv.length; i++) {
      const c = csv[i];
      if (q) { if (c === '"') { if (csv[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && csv[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const body = rows.filter((r) => r.some((x) => x.trim())).slice(0, 60);
    if (!body.length) return '<pre></pre>';
    const h = body[0], rest = body.slice(1);
    return '<table><thead><tr>' + h.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + rest.map((r) => '<tr>' + r.map((x) => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }
  function printableHtml(kind: string, name: string, content: string) {
    if (kind === 'html') return content;
    const body = kind === 'markdown' ? md(content) : kind === 'csv' ? csvTable(content) : '<pre>' + esc(content) + '</pre>';
    const dir = locale === 'ar' ? ' dir="rtl" lang="ar"' : '';
    return '<!doctype html><html' + dir + '><head><meta charset="utf-8"><title>' + esc(name) + '</title><style>@page{size:A4;margin:18mm 16mm}body{font:13.5px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#16202e;max-width:720px;margin:24px auto;padding:0 16px}h1{font-size:26px;line-height:1.15;margin:0 0 14px}h2{font-size:16.5px;margin:22px 0 8px}h3{font-size:13.5px;margin:16px 0 6px}p,li{margin:0 0 8px}table{border-collapse:collapse;width:100%;font-size:12.5px;margin:12px 0}th,td{border:1px solid #e2e6eb;padding:6px 8px;text-align:start;vertical-align:top}th{background:#f3f5f8}pre{white-space:pre-wrap;font-size:12px}code{font-size:12px;background:#f3f5f8;padding:1px 4px;border-radius:3px}a{color:#1d4ed8}</style></head><body>' + body + '</body></html>';
  }
  function download(name: string, content: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime + ';charset=utf-8' }));
    const a = el('a') as HTMLAnchorElement; a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function openTab(html: string) {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank');
    if (!w) download('preview.html', html, 'text/html');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function saveAsPdf(html: string) {
    const tag = '<script>addEventListener("load",function(){setTimeout(function(){print()},400)})<\/script>';
    openTab(/<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + '</body>') : html + tag);
  }
  function artifactCard(name: string, title: string, content: string) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const kind = KIND[ext] || 'text';
    const mime = MIME[kind] || 'text/plain';
    const kb = (new Blob([content]).size / 1024).toFixed(1);
    const card = el('div', 'artifact');
    card.innerHTML = '<div class="artifact-head"><div><div class="artifact-title"></div><div class="artifact-meta"></div></div>' +
      '<div class="artifact-actions"><button type="button" data-act="download">' + esc(T.artifact.download) + '</button>' +
      (kind !== 'csv' ? '<button type="button" data-act="open">' + esc(T.artifact.open) + '</button>' : '') +
      '<button type="button" data-act="pdf">' + esc(T.artifact.pdf) + '</button></div></div><div class="artifact-preview"></div>';
    (card.querySelector('.artifact-title') as HTMLElement).textContent = title || name;
    (card.querySelector('.artifact-meta') as HTMLElement).textContent = name + ' · ' + kb + ' KB · ' + T.artifact.meta;
    const pv = card.querySelector('.artifact-preview') as HTMLElement;
    if (kind === 'html' || kind === 'svg') {
      const f = el('iframe') as HTMLIFrameElement;
      f.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms'); f.setAttribute('loading', 'lazy'); f.setAttribute('title', title || name);
      let doc = kind === 'svg' ? '<!doctype html><body style="margin:0;display:grid;place-items:center;background:#fff">' + content + '</body>' : content;
      if (kind === 'html' && /class="sheet"/.test(content)) {
        const z = Math.min(1, (Math.min(log.clientWidth, 900) - 34) / 830);
        const style = '<style>@media screen{html{zoom:' + z.toFixed(3) + '}}</style>';
        doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, style + '</head>') : style + doc;
      }
      f.srcdoc = doc; pv.appendChild(f);
      const fit = el('button', 'artifact-expand', esc(T.artifact.expand)) as HTMLButtonElement; fit.type = 'button';
      fit.addEventListener('click', () => { pv.classList.toggle('tall'); fit.textContent = pv.classList.contains('tall') ? T.artifact.collapse : T.artifact.expand; });
      pv.appendChild(fit);
    } else if (kind === 'markdown') { pv.className += ' md'; pv.innerHTML = md(content); }
    else if (kind === 'csv') { pv.className += ' table'; pv.innerHTML = csvTable(content); }
    else { pv.innerHTML = '<pre></pre>'; (pv.querySelector('pre') as HTMLElement).textContent = content.slice(0, 6000); }
    card.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button[data-act]') as HTMLElement | null; if (!b) return;
      const act = b.dataset.act;
      if (act === 'download') download(name, content, mime);
      if (act === 'open') openTab(printableHtml(kind, name, content));
      if (act === 'pdf') saveAsPdf(printableHtml(kind, name, content));
    });
    return card;
  }

  // ---------- tools (server-side proxies)
  async function api(path: string, body: unknown, signal?: AbortSignal) {
    const r = await fetch(path, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('HTTP ' + r.status + (t ? ': ' + t.slice(0, 200) : '')); }
    return r.json();
  }
  async function execTool(call: any, ctx: ReturnType<typeof startBot>) {
    let args: any = {};
    try { args = JSON.parse(call.function.arguments || '{}'); } catch {
      traceRow(ctx.trace, T.trace.broken).fail();
      return 'Error: arguments were not valid JSON (the call was probably cut off). Send a complete JSON object; if it was a file, make it shorter.';
    }
    const name = call.function.name;
    if (name === 'web_search') {
      const q = String(args.query || '').slice(0, 128);
      const row = traceRow(ctx.trace, T.trace.searching + q);
      scene()?.focus?.('ai');
      try {
        const j = await api('/api/agent/search', { query: q, count: Math.min(8, Math.max(1, args.count | 0 || 5)) }, ctx.signal);
        const res = (j.results || []).map((x: any, i: number) => `${i + 1}. ${x.title}\n   URL: ${x.url}\n   Date: ${x.date || 'unknown'}\n   ${(x.summary || x.snippet || '').replace(/\s+/g, ' ').slice(0, 700)}`);
        row.done(T.trace.searched + q + ' · ' + res.length + T.trace.results);
        return res.length ? res.join('\n\n') : 'No results.';
      } catch (e: any) { row.fail(T.trace.failed + e.message); return 'Error: ' + e.message; }
    }
    if (name === 'fetch_page') {
      const url = String(args.url || '');
      let host = url; try { host = new URL(url).hostname; } catch { /* keep */ }
      const row = traceRow(ctx.trace, T.trace.reading + host);
      try {
        const j = await api('/api/agent/fetch', { url }, ctx.signal);
        row.done(T.trace.read + (j.title || host));
        return `Title: ${j.title || ''}\nURL: ${url}\n\n${(j.content || '').slice(0, 8000)}`;
      } catch (e: any) { row.fail(T.trace.couldNotRead + host + ': ' + e.message); return 'Error: ' + e.message; }
    }
    if (name === 'create_file') {
      const fname = String(args.name || 'file.txt').replace(/[^\w.\-]+/g, '-');
      const row = traceRow(ctx.trace, T.trace.writing + fname);
      scene()?.focus?.('build');
      const content = String(args.content || '');
      if (!content.trim()) { row.fail(T.trace.empty); return 'Error: content was empty.'; }
      ctx.root.insertBefore(artifactCard(fname, args.title, content), ctx.body);
      fileCount++;
      scene()?.shipped?.();
      row.done(T.trace.created + fname + ' · ' + (content.length / 1024).toFixed(1) + ' KB');
      scrollLog();
      return `File ${fname} created and shown to the visitor with preview and download (${content.length} characters). Now write the short final message.`;
    }
    return 'Error: unknown tool ' + name;
  }

  // ---------- streaming via the server
  async function streamChat(msgs: any[], o: { signal: AbortSignal; step: number; maxSteps: number; secondsLeft: number; toolsOff: boolean; onText: (t: string) => void; onTool: (c: any) => void }) {
    const r = await fetch('/api/agent/chat', {
      method: 'POST', signal: o.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, locale, step: o.step, maxSteps: o.maxSteps, secondsLeft: o.secondsLeft, fileCount, toolsOff: o.toolsOff }),
    });
    if (!r.ok || !r.body) { const t = await r.text().catch(() => ''); throw new Error(t.slice(0, 200) || ('HTTP ' + r.status)); }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '', content = '', finish: string | null = null; const calls: any[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let j; try { j = JSON.parse(data); } catch { continue; }
        const ch = j.choices && j.choices[0]; if (!ch) continue;
        const d = ch.delta || {};
        if (d.content) { content += d.content; o.onText(content); }
        if (d.tool_calls) for (const tc of d.tool_calls) {
          const i = tc.index || 0;
          calls[i] = calls[i] || { id: tc.id || ('call_' + i), type: 'function', function: { name: '', arguments: '' } };
          if (tc.id) calls[i].id = tc.id;
          if (tc.function && tc.function.name) calls[i].function.name += tc.function.name;
          if (tc.function && tc.function.arguments) calls[i].function.arguments += tc.function.arguments;
          o.onTool(calls[i]);
        }
        if (ch.finish_reason) finish = ch.finish_reason;
      }
    }
    return { content, calls: calls.filter(Boolean), finish };
  }

  // ---------- the loop
  async function run(prompt: string) {
    prompt = (prompt || '').trim();
    if (!prompt || busy) return;
    busy = true; input.value = ''; form.classList.add('busy');
    addUser(prompt);
    messages.push({ role: 'user', content: prompt });
    const ui = startBot();
    const t0 = performance.now();
    abort = new AbortController();
    const budget = CFG.timeBudgetMs;
    const timer = setTimeout(() => abort && abort.abort(), budget);
    ui.signal = abort.signal;
    setStatus(T.working, true);
    scene()?.pulse?.(); scene()?.busy?.(true);
    const thinking = traceRow(ui.trace, T.trace.planning);
    let finalText = '', nudged = false;
    try {
      const convo: any[] = [...messages];
      const maxSteps = CFG.maxSteps;
      for (let step = 0; step < maxSteps; step++) {
        const lastRound = step === maxSteps - 1 || performance.now() - t0 > budget * 0.8;
        const left = Math.max(0, Math.round((budget - (performance.now() - t0)) / 1000));
        let writing: ReturnType<typeof traceRow> | null = null;
        const res = await streamChat(convo, {
          signal: abort.signal, step: step + 1, maxSteps, secondsLeft: left, toolsOff: lastRound,
          onText(t) { if (step === 0) thinking.done(T.trace.planned); ui.body.innerHTML = md(t) + '<span class="cursor"></span>'; scrollLog(); },
          onTool(c) {
            if (step === 0) thinking.done(T.trace.planned);
            if (c.function.name !== 'create_file') return;
            const kb = (c.function.arguments.length / 1024).toFixed(1);
            if (!writing) writing = traceRow(ui.trace, T.trace.writing + kb + ' KB'); else writing.label(T.trace.writing + kb + ' KB');
          },
        });
        if (writing) { (writing as any).remove(); writing = null; }
        if (res.finish === 'length' && res.calls.length) {
          traceRow(ui.trace, T.trace.tooLong).fail();
          convo.push({ role: 'assistant', content: res.content || '' });
          convo.push({ role: 'user', content: '[runtime] Your file was cut off at the output limit. Write a shorter version, under 12 KB, and call create_file again.' });
          continue;
        }
        thinking.done(step === 0 ? T.trace.planned : undefined);
        const assistantMsg: any = { role: 'assistant', content: res.content || '' };
        if (res.calls.length) assistantMsg.tool_calls = res.calls;
        convo.push(assistantMsg); messages.push(assistantMsg);
        if (res.content) { finalText = res.content; ui.body.innerHTML = md(res.content); }
        if (!res.calls.length) {
          if (!res.content.trim() && !nudged) { nudged = true; convo.push({ role: 'user', content: '[runtime] Your reply was empty. Write the final message now.' }); continue; }
          break;
        }
        scene()?.pulse?.();
        const results = await Promise.all(res.calls.map((c: any) => execTool(c, ui)));
        res.calls.forEach((c: any, i: number) => { const m = { role: 'tool', tool_call_id: c.id, content: results[i] }; convo.push(m); messages.push(m); });
        if (abort.signal.aborted) throw new DOMException('aborted', 'AbortError');
      }
      traceRow(ui.trace, T.trace.done + ((performance.now() - t0) / 1000).toFixed(0) + 's').done();
    } catch (e: any) {
      const aborted = e && e.name === 'AbortError';
      traceRow(ui.trace, aborted ? T.trace.stopped : T.trace.problem + e.message).fail();
      if (!finalText) ui.body.innerHTML = md(aborted ? T.errors.stopped : T.errors.generic + e.message + T.errors.retry);
      messages.push({ role: 'assistant', content: finalText || '(stopped)' });
    } finally {
      clearTimeout(timer); abort = null; busy = false; form.classList.remove('busy');
      scene()?.busy?.(false);
      setStatus(T.ready, false);
      ui.body.querySelectorAll('.cursor').forEach((c) => c.remove());
      ui.body.querySelectorAll('a').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
      scrollLog();
    }
  }

  // ---------- wiring
  function chip(c: { label: string; prompt: string }) {
    const b = el('button') as HTMLButtonElement; b.type = 'button'; b.textContent = c.label; b.title = c.prompt;
    b.addEventListener('click', () => run(c.prompt));
    return b;
  }
  chips.innerHTML = '';
  T.chips.forEach((c) => chips.appendChild(chip(c)));
  const onSubmit = (e: Event) => { e.preventDefault(); run(input.value); };
  form.addEventListener('submit', onSubmit);
  const onStop = () => { if (abort) abort.abort(); };
  const onClear = () => { if (busy) return; messages = []; log.innerHTML = ''; greet(); };
  stopBtn?.addEventListener('click', onStop);
  clearBtn?.addEventListener('click', onClear);

  const handle: AgentHandle = {
    ask: run,
    askTopic(key: string) {
      const p = T.nodePrompts[key]; if (!p) return;
      askSection?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      run(p);
    },
    dispose() {
      form.removeEventListener('submit', onSubmit);
      stopBtn?.removeEventListener('click', onStop);
      clearBtn?.removeEventListener('click', onClear);
      if (abort) abort.abort();
      if ((window as any).AGENT === handle) delete (window as any).AGENT;
    },
  };
  (window as any).AGENT = handle;

  async function greet() {
    const ui = startBot();
    ui.trace.remove();
    const text = T.greeting;
    if (reduced) { ui.body.innerHTML = md(text); return; }
    const words = text.split(' '); let out = '';
    for (let i = 0; i < words.length; i++) { out += (i ? ' ' : '') + words[i]; ui.body.innerHTML = esc(out) + '<span class="cursor"></span>'; await sleep(16); }
    ui.body.innerHTML = md(text);
  }
  log.innerHTML = '';
  greet();
  return handle;
}
