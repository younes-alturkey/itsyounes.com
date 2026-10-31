'use client';
import { useEffect } from 'react';

const IDS = ['1833953407536672792', '1782563033388360029', '1341387093268975616'];

export default function Tweets({ lang }: { lang: string }) {
  useEffect(() => {
    const w = window as any;
    if (w.twttr?.widgets) { w.twttr.widgets.load(); return; }
    const s = document.createElement('script');
    s.src = 'https://platform.twitter.com/widgets.js'; s.async = true; s.charset = 'utf-8';
    document.body.appendChild(s);
  }, []);
  return (
    <div className="tweets">
      {IDS.map((id) => (
        <blockquote key={id} className="twitter-tweet" data-theme="dark" data-dnt="true" data-conversation="none" data-lang={lang}>
          <a href={`https://twitter.com/younes_alturkey/status/${id}`}>Post by Younes Alturkey</a>
        </blockquote>
      ))}
    </div>
  );
}
