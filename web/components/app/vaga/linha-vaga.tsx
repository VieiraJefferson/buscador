'use client';

import Link from 'next/link';
import { BadgeNota, BadgesVaga } from '@/components/app/vaga/badges-vaga';
import { Checkbox } from '@/components/ui/checkbox';
import { rotas } from '@/lib/rotas';
import type { VagaLista } from '@/lib/tipos';
import { localDaVaga } from '@/lib/vaga';

/** Uma vaga na lista: seleção para ações em lote e o resto do cartão abre o detalhe. */
export function LinhaVaga({
  vaga: v,
  selecionada,
  aoSelecionar,
}: {
  vaga: VagaLista;
  selecionada: boolean;
  aoSelecionar: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 transition duration-300 ease-(--ease-out) hover:shadow-card">
      <Checkbox
        checked={selecionada}
        onCheckedChange={aoSelecionar}
        aria-label={`Selecionar ${v.titulo}`}
        className="mt-1"
      />
      <Link href={rotas.vaga(v.id)} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{v.titulo}</span>
          <BadgeNota nota={v.nota} />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {v.empresas?.nome} · {localDaVaga(v.cidade, v.pais)}
        </p>
        <div className="mt-2">
          <BadgesVaga
            regime={v.regime}
            consultoria={v.consultoria}
            temEmail={v.emails_gerados.length > 0}
            estado={v.candidaturas[0]?.estado}
          />
        </div>
      </Link>
    </div>
  );
}
