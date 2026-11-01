import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDict, isLocale } from '@/lib/i18n';
import SceneCanvas from '@/components/SceneCanvas';
import AgentChat from '@/components/AgentChat';
import Tweets from '@/components/Tweets';
import TryAgent from '@/components/TryAgent';

const WA_NUMBER = '966538654514';
const EMAIL = 'alturkeyy@gmail.com';
const wa = (text: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

const COMPANIES = [
  { name: 'Salla', img: '/logos/salla-logo.png' },
  { name: 'National eLearning Center', img: '/logos/nelc.png' },
  { name: 'NTIS', img: '/logos/ntais.png' },
  { name: 'Nuqtah', img: '/logos/nuqtah.png' },
  { name: 'Bhr Solutions', img: '/logos/bhr.png' },
  { name: 'SAFCSP', img: '/logos/safcsp.png' },
  { name: 'Nahdi Medical Company', img: '/logos/nahdi.png' },
  { name: 'Ministry of Communications and IT', img: '/logos/mcit.png' },
];

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.1.6 2.8.5a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.5-.3Z" /></svg>
);

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const rtl = t.dir === 'rtl';
  const waIntro = wa(t.waIntro);

  return (
    <>
      <SceneCanvas t={{ hud: t.hud, labels: t.labels }} rtl={rtl} />

      <header className="top">
        <a className="brand" href="#top">{t.hero.name}</a>
        <nav className="nav">
          <a href="#ask">{t.nav.ask}</a>
          <a href="#track">{t.nav.track}</a>
          <a href="#contact">{t.nav.contact}</a>
        </nav>
        <a className="lang cv-link" href="/Younes-Alturkey-CV.pdf" target="_blank" rel="noopener" type="application/pdf">{t.nav.cv}</a>
        <Link className="lang" href={`/${t.otherLocale}`} hrefLang={t.otherLocale} lang={t.otherLocale}>{t.otherLabel}</Link>
        <a className="btn btn-sm btn-wa" href={waIntro} target="_blank" rel="noopener"><WhatsAppIcon /> {t.nav.whatsapp}</a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="who">
            <img src="/younes.jpg" alt={t.hero.name} width={56} height={56} />
            <div><b>{t.hero.name}</b><span>{t.hero.sub}</span></div>
          </div>
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <p className="roles">{t.hero.roles}</p>
          <h1>{t.hero.h1}</h1>
          <p className="lede">{t.hero.lede}</p>
          <div className="cta">
            <a className="btn btn-primary btn-wa" href={waIntro} target="_blank" rel="noopener">{t.hero.wa}</a>
            <a className="btn" href={`mailto:${EMAIL}`}>{t.hero.email}</a>
            <a className="btn" href="https://www.linkedin.com/in/younes-alturkey" target="_blank" rel="noopener">{t.hero.linkedin}</a>
            <a className="btn" href="https://github.com/younes-alturkey" target="_blank" rel="noopener">{t.hero.github}</a>
          </div>
          <p className="hint"><span className="dot"></span> {t.hero.hint}</p>
        </section>

        <section id="ask" className="panel-wrap">
          <p className="panel-lede">{t.agent.lede}</p>
          <AgentChat t={t.agent} locale={locale} />
        </section>

        <section className="pillars">
          <h2>{t.bring.title}</h2>
          <div className="grid">
            {t.bring.cards.map((c) => (
              <article className="card" data-topic={c.key} tabIndex={0} key={c.key}>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="track" className="track">
          <h2>{t.track.title}</h2>
          <div className="proof">
            {t.track.proof.map((p) => <div key={p.s}><b>{p.b}</b><span>{p.s}</span></div>)}
          </div>
          <ol className="timeline">
            {t.track.timeline.map((e) => (
              <li key={e.when + e.title}>
                <span className="when">{e.when}</span>
                <div><b>{e.title}</b>{e.org ? <> · {e.org}</> : null}<p>{e.text}</p></div>
              </li>
            ))}
          </ol>
          <p className="certs">{t.track.certs}</p>
          <h3 className="sub">{t.track.posts}</h3>
          <Tweets lang={locale} />
          <h3 className="sub">{t.track.companies}</h3>
          <div className="logos">
            {COMPANIES.map((c) => (
              <div key={c.name} title={c.name}>
                <img src={c.img} alt={c.name} loading="lazy" />
              </div>
            ))}
          </div>
          <h3 className="sub">{t.best.title}</h3>
          <article className="best">
            <div className="best-head">
              <b>{t.best.name}</b>
              <span>{t.best.tag}</span>
              <span className="best-links">
                <a href={t.best.url} target="_blank" rel="noopener">{t.best.cta} ↗</a>
                <a href={t.best.github} target="_blank" rel="noopener">GitHub ↗</a>
              </span>
            </div>
            <p>{t.best.text}</p>
            <ul>{t.best.points.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
        </section>

        <section id="contact" className="contact">
          <h2>{t.contact.title}</h2>
          <p className="lede">{t.contact.lede}</p>
          <div className="cta">
            <a className="btn btn-primary btn-wa" href={waIntro} target="_blank" rel="noopener">{t.contact.wa}</a>
            <a className="btn" href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <a className="btn" href="https://www.linkedin.com/in/younes-alturkey/" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg> LinkedIn</a>
            <a className="btn" href="https://github.com/younes-alturkey" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg> GitHub</a>
          </div>
          <div className="links">
            <a href={`tel:+${WA_NUMBER}`}>{t.contact.call}</a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="try">
          <div><b>{t.tryme.title}</b> {t.tryme.text}</div>
          <div className="cta">
            <TryAgent label={t.tryme.agent} />
          </div>
        </div>
        <p className="foot-note">{t.tryme.note}</p>
      </footer>
    </>
  );
}
