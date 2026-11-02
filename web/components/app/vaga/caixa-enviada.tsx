'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { EstadoCandidatura } from '@/lib/tipos';
import { cn } from '@/lib/utils';

/**
 * Caixinha "Enviada" de um toque (ADR-0006). Marcada = a candidatura saiu do "a enviar".
 * Depois de respondida, entrevista ou encerrada fica travada marcada: voltar para "a enviar"
 * apagaria o estado, e isso só se faz pelo seletor do detalhe.
 */
export function CaixaEnviada({
  estado,
  aoMudar,
  disabled = false,
  className,
}: {
  estado: EstadoCandidatura;
  aoMudar: (novo: 'enviada' | 'a_enviar') => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const travada = estado !== 'a_enviar' && estado !== 'enviada';
  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium select-none',
        estado !== 'a_enviar' && 'border-sea/40 bg-sea/10',
        (disabled || travada) && 'cursor-default opacity-70',
        className,
      )}
    >
      <Checkbox
        id={id}
        checked={estado !== 'a_enviar'}
        disabled={disabled || travada}
        onCheckedChange={(c) => aoMudar(c === true ? 'enviada' : 'a_enviar')}
      />
      Enviada
    </label>
  );
}
