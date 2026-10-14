import type { LucideIcon } from 'lucide-react';

/** Mensagem para lista sem itens, com ação opcional (ex.: limpar filtros). */
export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-soft px-6 py-10 text-center">
      {Icone && <Icone className="size-6 text-muted-foreground" />}
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
