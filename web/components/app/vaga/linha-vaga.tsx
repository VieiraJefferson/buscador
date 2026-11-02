'use client';

import Link from 'next/link';
import { BadgeNota, BadgesVaga } from '@/components/app/vaga/badges-vaga';
import { CaixaEnviada } from '@/components/app/vaga/caixa-enviada';
import { Checkbox } from '@/components/ui/checkbox';
import { rotas } from '@/lib/rotas';
import type { EstadoCandidatura, VagaLista } from '@/lib/tipos';
import { localDaVaga } from '@/lib/vaga';

/** Uma vaga na lista: seleção para ações em lote, a caixinha "Enviada" e o resto do cartão
 *  abre o detalhe. */
export function LinhaVaga({
  vaga: v,
  estado,
  selecionada,
  aoSelecionar,
  aoMarcarEnviada,
  pendente = false,
}: {
  vaga: VagaLista;
  estado: EstadoCandidatura;
  selecionada: boolean;
  aoSelecionar: () => void;
  aoMarcarEnviada: (novo: 'enviada' | 'a_enviar') => void;
  pendente?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 transition duration-300 ease-(--ease-out) hover:shadow-card">
      <Checkbox
        checked={selecionada}
        onCheckedChange={aoSelecionar}
        aria-label={`Selecionar ${v.titulo}`}
        className="mt-1"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-start">
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
              estado={estado}
            />
          </div>
        </Link>
        <CaixaEnviada estado={estado} aoMudar={aoMarcarEnviada} disabled={pendente} className="self-start" />
      </div>
    </div>
  );
}
