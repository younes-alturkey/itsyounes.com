'use client';
import { useEffect, useRef } from 'react';
import type { Dict } from '@/lib/i18n';
import { initAgent } from './agent-core';

export default function AgentChat({ t, locale }: { t: Dict['agent']; locale: string }) {
  const log = useRef<HTMLDivElement>(null), chips = useRef<HTMLDivElement>(null), form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null), status = useRef<HTMLDivElement>(null), clearBtn = useRef<HTMLButtonElement>(null), stopBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const h = initAgent({
      els: { log: log.current!, chips: chips.current!, form: form.current!, input: input.current!, status: status.current!, clearBtn: clearBtn.current, stopBtn: stopBtn.current, askSection: document.getElementById('ask') },
      t, locale, reduced,
    });
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.card[data-topic]'));
    const handlers = cards.map((card) => {
      const go = () => h.askTopic(card.dataset.topic!);
      const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      card.addEventListener('click', go); card.addEventListener('keydown', key);
      return () => { card.removeEventListener('click', go); card.removeEventListener('keydown', key); };
    });
    return () => { handlers.forEach((f) => f()); h.dispose(); };
  }, [t, locale]);

  return (
    <div className="agent" role="region" aria-label={t.name}>
      <div className="agent-head">
        <div className="agent-title">
          <img className="avatar" src="/younes.jpg" alt="" width={36} height={36} />
          <div>
            <div className="agent-name">{t.name}</div>
            <div className="agent-status" id="agent-status" ref={status}><span className="led"></span> {t.ready}</div>
          </div>
        </div>
        <div className="agent-tools">
          <span className="agent-note">{t.note}<br />{t.note2}</span>
          <button type="button" id="agent-clear" ref={clearBtn}>{t.clear}</button>
        </div>
      </div>
      <div className="agent-log" id="agent-log" ref={log} aria-live="polite"></div>
      <div className="chips" id="agent-chips" ref={chips}></div>
      <form className="agent-form" id="agent-form" ref={form} autoComplete="off">
        <input id="agent-input" ref={input} type="text" maxLength={600} placeholder={t.placeholder} aria-label={t.placeholder} />
        <button type="button" id="agent-stop" className="stop" ref={stopBtn} aria-label="Stop">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
        </button>
        <button type="submit" className="go" aria-label="Send">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
    </div>
  );
}
