'use client';

import { Check, SearchX, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { BarraAcoes } from '@/components/app/barra-acoes';
import { EstadoVazio } from '@/components/app/estado-vazio';
import { LinhaVaga } from '@/components/app/vaga/linha-vaga';
import { Button } from '@/components/ui/button';
import type { EstadoCandidatura, VagaLista } from '@/lib/tipos';
import { nomePrioridade } from '@/lib/vaga';
import { descartarVagas, marcarEstado } from './actions';

export function ListaVagas({ vagas }: { vagas: VagaLista[] }) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();
  // Marcação otimista da caixinha "Enviada": aparece na hora, o servidor confirma depois.
  const [marcadas, setMarcadas] = useState<Record<string, EstadoCandidatura>>({});
  const estadoDe = (v: VagaLista): EstadoCandidatura => marcadas[v.id] ?? v.candidaturas[0]?.estado ?? 'a_enviar';

  function marcarEnviada(id: string, novo: 'enviada' | 'a_enviar') {
    setMarcadas((m) => ({ ...m, [id]: novo }));
    iniciar(async () => {
      try {
        await marcarEstado([id], novo);
        toast.success(novo === 'enviada' ? 'Marcada como enviada' : 'Voltou para a enviar');
      } catch {
        setMarcadas((m) => {
          const { [id]: _, ...resto } = m;
          return resto;
        });
        toast.error('Não foi possível concluir.');
      }
    });
  }

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
    return (
      <EstadoVazio
        icone={SearchX}
        titulo="Nenhuma vaga com estes filtros."
        descricao='Por padrão aparecem só vagas já avaliadas com nota 3 ou mais. Em Filtros, "Nota mínima" mostra as outras.'
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {vagas.map((v, i) => (
          <li key={v.id}>
            {/* título do grupo quando muda a prioridade de país */}
            {(i === 0 || v.prioridade_pais !== vagas[i - 1]?.prioridade_pais) && (
              <p className="eyebrow mt-4 mb-2 first:mt-0">{nomePrioridade(v.prioridade_pais)}</p>
            )}
            <LinhaVaga
              vaga={v}
              estado={estadoDe(v)}
              selecionada={selecionadas.has(v.id)}
              aoSelecionar={() => alternar(v.id)}
              aoMarcarEnviada={(novo) => marcarEnviada(v.id, novo)}
              pendente={pendente}
            />
          </li>
        ))}
      </ul>

      {selecionadas.size > 0 && (
        <BarraAcoes>
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
        </BarraAcoes>
      )}
    </>
  );
}
