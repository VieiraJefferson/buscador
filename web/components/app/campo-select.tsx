'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type Opcao = { valor: string; rotulo: string };

/** Select a partir de uma lista de opções: o mesmo componente em filtros, agenda, perfil,
 *  estado da candidatura e assistente. */
export function CampoSelect({
  valor,
  aoMudar,
  opcoes,
  rotulo,
  placeholder,
  disabled,
  className,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: readonly Opcao[];
  /** Nome acessível quando não há <Label> visível. */
  rotulo?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value={valor} onValueChange={aoMudar} disabled={disabled}>
      <SelectTrigger aria-label={rotulo} className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Atalho para listas simples em que o valor é o próprio texto. */
export const opcoesDe = (valores: readonly string[]): Opcao[] => valores.map((v) => ({ valor: v, rotulo: v }));
