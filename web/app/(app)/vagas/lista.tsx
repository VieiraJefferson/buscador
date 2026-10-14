'use client';

import { Check, MailCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ESTADOS, PRIORIDADES, REGIMES, type VagaLista } from '@/lib/tipos';
import { descartarVagas, marcarEstado } from './actions';

export function ListaVagas({ vagas }: { vagas: VagaLista[] }) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();

  const alternar = (id: string) =>
    setSelecionadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function emLote(acao: 'enviada' | 'descartar') {
    const ids = [...selecionadas];
    iniciar(async () => {
      try {
        if (acao === 'descartar') await descartarVagas(ids);
        else await marcarEstado(ids, 'enviada');
        toast.success(acao === 'descartar' ? `${ids.length} vagas descartadas` : `${ids.length} marcadas como enviadas`);
        setSelecionadas(new Set());
      } catch {
        toast.error('Não foi possível concluir.');
      }
    });
  }

  if (!vagas.length) {
    return <p className="rounded-xl bg-soft p-8 text-center text-sm text-muted-foreground">Nenhuma vaga com estes filtros.</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {vagas.map((v, i) => {
          // título do grupo quando muda a prioridade de país
          const cabecalho = i === 0 || v.prioridade_pais !== vagas[i - 1]?.prioridade_pais;
          const estado = v.candidaturas[0]?.estado;
          return (
            <li key={v.id}>
              {cabecalho && (
                <p className="eyebrow mt-4 mb-2 first:mt-0">
                  {PRIORIDADES[v.prioridade_pais ?? 4] ?? 'Outros'}
                </p>
              )}
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4 transition hover:shadow-card">
                <Checkbox
                  checked={selecionadas.has(v.id)}
                  onCheckedChange={() => alternar(v.id)}
                  aria-label={`Selecionar ${v.titulo}`}
                  className="mt-1"
                />
                <Link href={`/vagas/${v.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{v.titulo}</span>
                    {v.nota && (
                      <Badge variant={v.nota >= 4 ? 'sea' : 'soft'}>nota {v.nota}/5</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {v.empresas?.nome} · {[v.cidade, v.pais].filter(Boolean).join(', ') || 'UE'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{REGIMES[v.regime]}</Badge>
                    {v.consultoria && <Badge variant="warning">consultoria</Badge>}
                    {v.emails_gerados.length > 0 && (
                      <Badge variant="sea">
                        <MailCheck className="size-3" />
                        email pronto
                      </Badge>
                    )}
                    {estado && estado !== 'a_enviar' && (
                      <Badge>{ESTADOS.find((e) => e.valor === estado)?.rotulo}</Badge>
                    )}
                  </div>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {selecionadas.size > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex items-center justify-between gap-2 rounded-full border bg-background p-2 pl-5 shadow-card md:inset-x-auto md:right-8 md:bottom-8">
          <span className="text-sm font-medium">{selecionadas.size} selecionadas</span>
          <div className="flex gap-2">
            <Button size="sm" variant="soft" disabled={pendente} onClick={() => emLote('descartar')}>
              <Trash2 />
              Descartar
            </Button>
            <Button size="sm" disabled={pendente} onClick={() => emLote('enviada')}>
              <Check />
              Enviadas
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
