import { cn } from '@/lib/utils';

/** Linha de uma lista curta (horário, bloqueio, entrevista, execução), com ações à direita. */
export function ItemLista({
  children,
  acoes,
  destaque = false,
  className,
}: {
  children: React.ReactNode;
  acoes?: React.ReactNode;
  destaque?: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm',
        destaque ? 'border bg-background' : 'bg-soft',
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      {acoes && <div className="flex items-center gap-1">{acoes}</div>}
    </li>
  );
}

/** Lista de ItemLista com a mensagem de vazio no lugar certo. */
export function ListaItens({ vazio, children }: { vazio: string; children: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {children.length === 0 ? <li className="text-sm text-muted-foreground">{vazio}</li> : children}
    </ul>
  );
}
