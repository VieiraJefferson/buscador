'use client';

import { motion } from 'motion/react';

/** Aparece ao entrar na tela, como o `data-reveal` do portfólio (useScrollReveal).
 *  `atraso` em milissegundos, para escalonar itens de uma grade. */
export function Revelar({
  children,
  atraso = 0,
  className,
}: {
  children: React.ReactNode;
  atraso?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, delay: atraso / 1000 }}
    >
      {children}
    </motion.div>
  );
}
