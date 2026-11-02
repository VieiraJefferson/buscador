'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Rolagem suave do portfólio (Portifolio/src/components/core/SmoothScroll.jsx), com os
 * mesmos parâmetros. Desligada com prefers-reduced-motion. A cada troca de rota volta ao
 * topo e recalcula o tamanho da página, para a rolagem não "travar" numa página mais curta.
 */
export function RolagemSuave() {
  const lenis = useRef<Lenis | null>(null);
  const caminho = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const l = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    lenis.current = l;
    let raf = 0;
    const loop = (t: number) => {
      l.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    const l = lenis.current;
    if (!l) return;
    l.scrollTo(0, { immediate: true });
    const raf = requestAnimationFrame(() => l.resize());
    const espera = setTimeout(() => l.resize(), 500); // depois da transição da página
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(espera);
    };
  }, [caminho]);

  return null;
}
