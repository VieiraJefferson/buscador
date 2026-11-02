'use client';

import { MotionConfig } from 'motion/react';
import { CURVA_SAIDA, DURACAO } from '@/lib/movimento';

/** Configuração única das animações: respeita "reduzir movimento" do sistema. */
export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURACAO, ease: CURVA_SAIDA }}>
      {children}
    </MotionConfig>
  );
}
