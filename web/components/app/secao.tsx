import type { LucideIcon } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Bloco de conteúdo com título, descrição opcional e uma ação à direita.
 *  É a unidade de todas as telas (vaga, agenda, assistente, perfil, coletor). */
export function Secao({
  titulo,
  descricao,
  icone: Icone,
  acao,
  className,
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  icone?: LucideIcon;
  acao?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icone && <Icone className="size-4 shrink-0 text-sea" />}
            <CardTitle>{titulo}</CardTitle>
          </div>
          {descricao && <CardDescription className="mt-1">{descricao}</CardDescription>}
        </div>
        {acao}
      </div>
      {children}
    </Card>
  );
}
