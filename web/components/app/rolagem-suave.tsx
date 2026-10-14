'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

/** Rolagem suave do portfólio (Lenis), desligada com prefers-reduced-motion. */
export function RolagemSuave() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.15, touchMultiplier: 1.6 });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
