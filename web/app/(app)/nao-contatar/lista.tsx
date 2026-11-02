'use client';

import { Undo2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { bloquearEmpresa } from '../vagas/actions';

type Empresa = { id: string; nome: string; dominio: string | null; atualizado_em: string };

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function ListaNaoContatar({ empresas }: { empresas: Empresa[] }) {
  const [pendente, iniciar] = useTransition();
  // Confirmação no próprio botão (sem diálogo): o primeiro toque arma, o segundo desbloqueia.
  const [armada, setArmada] = useState<string | null>(null);

  function desbloquear(id: string) {
    if (armada !== id) {
      setArmada(id);
      return;
    }
    iniciar(async () => {
      try {
        await bloquearEmpresa(id, false);
        toast.success('Empresa desbloqueada. Os contatos apagados não voltam.');
      } catch {
        toast.error('Não foi possível concluir.');
      } finally {
        setArmada(null);
      }
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {empresas.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{e.nome}</p>
            <p className="truncate text-sm text-muted-foreground">
              {e.dominio ?? 'sem domínio'} · desde {data(e.atualizado_em)}
            </p>
          </div>
          <Button variant={armada === e.id ? 'outline' : 'ghost'} size="sm" disabled={pendente} onClick={() => desbloquear(e.id)}>
            <Undo2 />
            {armada === e.id ? 'Confirmar desbloqueio' : 'Desbloquear'}
          </Button>
        </li>
      ))}
    </ul>
  );
}
