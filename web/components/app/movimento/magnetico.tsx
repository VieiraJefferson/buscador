'use client';

import { motion, useMotionValue, useSpring } from 'motion/react';
import { useRef } from 'react';

/**
 * Puxa o elemento na direção do cursor, como o `Magnetic` do portfólio. Só com mouse
 * (pointer: fine); no toque fica parado. `forca` define o quanto ele se inclina.
 */
export function Magnetico({
  children,
  forca = 0.25,
  className,
}: {
  children: React.ReactNode;
  forca?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });

  function mover(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * forca);
    y.set((e.clientY - (r.top + r.height / 2)) * forca);
  }

  function soltar() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span ref={ref} onPointerMove={mover} onPointerLeave={soltar} style={{ x, y }} className={className ?? 'inline-flex'}>
      {children}
    </motion.span>
  );
}
