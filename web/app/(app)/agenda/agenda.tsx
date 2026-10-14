'use client';

import { CalendarPlus, Download, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Campo } from '@/components/app/campo';
import { CampoSelect, opcoesDe } from '@/components/app/campo-select';
import { ItemLista, ListaItens } from '@/components/app/item-lista';
import { Secao } from '@/components/app/secao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dataComDia } from '@/lib/datas';
import { adicionarBloqueio, adicionarDisponibilidade, remover } from './actions';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HORAS = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30; // 07:00 até 21:00
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
type Props = {
  disponibilidade: { id: string; dia_semana: number; inicio: string; fim: string }[];
  bloqueios: { id: string; inicio: string; fim: string; motivo: string | null }[];
  entrevistas: { id: string; titulo: string; inicio: string; fim: string; link: string | null }[];
};

export function Agenda({ disponibilidade, bloqueios, entrevistas }: Props) {
  const [pendente, iniciar] = useTransition();
  const [dia, setDia] = useState('1');
  const [inicio, setInicio] = useState('10:00');
  const [fim, setFim] = useState('12:00');
  const [bInicio, setBInicio] = useState('');
  const [bFim, setBFim] = useState('');
  const [motivo, setMotivo] = useState('');

  const executar = (fn: () => Promise<void>, ok: string) =>
    iniciar(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (e) {
        toast.error((e as Error).message || 'Não foi possível concluir.');
      }
    });

  // <input type="datetime-local"> devolve hora local do aparelho: converte para ISO com fuso
  const comFuso = (local: string) => new Date(local).toISOString();

  const remocao = (tabela: Parameters<typeof remover>[0], id: string, ok: string, rotulo = 'Remover') => (
    <Button size="icon" variant="ghost" aria-label={rotulo} disabled={pendente} onClick={() => executar(() => remover(tabela, id), ok)}>
      <Trash2 />
    </Button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Secao titulo="Disponibilidade semanal" descricao="Horários de Lisboa em que aceita entrevistas.">
        <ListaItens vazio="Nenhum horário ainda.">
          {disponibilidade.map((d) => (
            <ItemLista key={d.id} acoes={remocao('agenda_disponibilidade', d.id, 'Horário removido')}>
              <b>{DIAS[d.dia_semana]}</b> · {d.inicio} às {d.fim}
            </ItemLista>
          ))}
        </ListaItens>
        <div className="grid grid-cols-3 gap-2">
          <CampoSelect rotulo="Dia" valor={dia} aoMudar={setDia} opcoes={DIAS.map((n, i) => ({ valor: String(i), rotulo: n }))} />
          <CampoSelect rotulo="Início" valor={inicio} aoMudar={setInicio} opcoes={opcoesDe(HORAS)} />
          <CampoSelect rotulo="Fim" valor={fim} aoMudar={setFim} opcoes={opcoesDe(HORAS)} />
        </div>
        <Button disabled={pendente} onClick={() => executar(() => adicionarDisponibilidade(Number(dia), inicio, fim), 'Horário adicionado')}>
          <Plus />
          Adicionar horário
        </Button>
      </Secao>

      <Secao titulo="Bloqueios" descricao="Férias ou compromissos: esses períodos nunca são oferecidos.">
        <ListaItens vazio="Nenhum bloqueio.">
          {bloqueios.map((b) => (
            <ItemLista key={b.id} acoes={remocao('agenda_bloqueios', b.id, 'Bloqueio removido')}>
              {dataComDia(b.inicio)} até {dataComDia(b.fim)}
              {b.motivo ? ` · ${b.motivo}` : ''}
            </ItemLista>
          ))}
        </ListaItens>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Início" htmlFor="bloqueio-inicio">
            <Input id="bloqueio-inicio" type="datetime-local" value={bInicio} onChange={(e) => setBInicio(e.target.value)} />
          </Campo>
          <Campo rotulo="Fim" htmlFor="bloqueio-fim">
            <Input id="bloqueio-fim" type="datetime-local" value={bFim} onChange={(e) => setBFim(e.target.value)} />
          </Campo>
        </div>
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" aria-label="Motivo" />
        <Button
          variant="outline"
          disabled={pendente || !bInicio || !bFim}
          onClick={() => executar(() => adicionarBloqueio(comFuso(bInicio), comFuso(bFim), motivo), 'Bloqueio adicionado')}
        >
          <Plus />
          Adicionar bloqueio
        </Button>
      </Secao>

      <Secao
        titulo="Entrevistas marcadas"
        descricao={entrevistas.length === 0 ? 'Nenhuma ainda. Elas aparecem aqui quando confirma um horário no Assistente.' : undefined}
        className="lg:col-span-2"
      >
        {entrevistas.length > 0 && (
          <ListaItens vazio="">
            {entrevistas.map((e) => (
              <ItemLista
                key={e.id}
                destaque
                acoes={
                  <>
                    <Button asChild size="sm" variant="soft">
                      <a href={`/api/entrevistas/${e.id}/ics`}>
                        <Download />
                        Calendário
                      </a>
                    </Button>
                    {e.link && (
                      <Button asChild size="sm" variant="sea">
                        <a href={e.link} target="_blank" rel="noopener noreferrer">
                          <CalendarPlus />
                          Entrar
                        </a>
                      </Button>
                    )}
                    {remocao('entrevistas', e.id, 'Entrevista removida', 'Cancelar')}
                  </>
                }
              >
                <p className="font-medium">{e.titulo}</p>
                <p className="text-muted-foreground">
                  {dataComDia(e.inicio)}
                  {e.link ? ' · com link' : ''}
                </p>
              </ItemLista>
            ))}
          </ListaItens>
        )}
      </Secao>
    </div>
  );
}
