'use client';
import { useEffect, useRef } from 'react';
import type { Dict } from '@/lib/i18n';

export default function SceneCanvas({ t, rtl }: { t: Pick<Dict, 'hud' | 'labels'>; rtl: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), labels = useRef<HTMLDivElement>(null), hud = useRef<HTMLElement>(null);
  useEffect(() => {
    let handle: { dispose: () => void } | null = null, cancelled = false;
    import('./scene/scene.js').then((m) => {
      if (cancelled) return;
      handle = m.initScene({ canvas: canvas.current, labelsEl: labels.current, hud: hud.current, rtl, t });
    });
    return () => { cancelled = true; handle?.dispose(); };
  }, [t, rtl]);
  return (
    <>
      <canvas id="scene" ref={canvas} aria-hidden="true"></canvas>
      <div id="labels" ref={labels} aria-hidden="true"></div>
      <div className="veil" aria-hidden="true"></div>
      <aside id="hud" ref={hud} aria-hidden="true">
        <div className="hud-top"><span className="hud-lvl">{t.hud.lvl}</span><span className="hud-name">{t.hud.name}</span></div>
        <div className="hud-xp"><i id="hud-xp"></i></div>
        <div className="hud-quests" id="hud-quests"></div>
      </aside>
    </>
  );
}
