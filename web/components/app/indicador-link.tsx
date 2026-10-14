'use client';

import { useLinkStatus } from 'next/link';
import { cn } from '@/lib/utils';

/** Ponto que pulsa no mesmo instante do toque, enquanto a próxima tela carrega.
 *  Precisa estar dentro de um <Link> (useLinkStatus). */
export function IndicadorLink({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-1.5 rounded-full bg-sea transition-opacity duration-200',
        pending ? 'animate-pulse opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}
