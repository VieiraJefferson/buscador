'use client';

import { Ban } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FiltrosVagas, rotas } from '@/lib/rotas';
import { cn } from '@/lib/utils';
import { FASES } from '@/lib/vaga';

/** Abas rápidas do estado das candidaturas (ADR-0006). Mantêm os outros filtros da URL. */
export function AbasFase() {
  const busca = useSearchParams();
  const atual = busca.get('estado');
  const filtros = Object.fromEntries(busca) as FiltrosVagas;

  return (
    <nav aria-label="Estado das candidaturas" className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="flex w-max gap-2">
        {FASES.map((f) => (
          <Link
            key={f.valor}
            href={rotas.vagas({ ...filtros, estado: f.valor })}
            aria-current={atual === f.valor ? 'page' : undefined}
            className={cn(
              'flex min-h-10 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap text-ink-dim transition duration-200 hover:bg-soft',
              atual === f.valor && 'border-primary bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            {f.rotulo}
          </Link>
        ))}
        <Link
          href={rotas.naoContatar}
          className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition duration-200 hover:bg-soft"
        >
          <Ban className="size-4" />
          Não contatar
        </Link>
      </div>
    </nav>
  );
}
