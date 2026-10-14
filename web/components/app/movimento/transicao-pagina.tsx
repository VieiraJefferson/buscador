'use client';

import { motion } from 'motion/react';

/** Entrada de cada página, como o `pageVariants` do portfólio. Usado no template.tsx, que o
 *  Next monta de novo a cada troca de rota. */
export function TransicaoPagina({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      {children}
    </motion.div>
  );
}
