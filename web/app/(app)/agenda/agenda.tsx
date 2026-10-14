'use client';

import { CalendarPlus, Download, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adicionarBloqueio, adicionarDisponibilidade, remover } from './actions';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HORAS = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30; // 07:00 até 21:00
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
const fmt = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle>Disponibilidade semanal</CardTitle>
          <CardDescription>Horários de Lisboa em que aceita entrevistas.</CardDescription>
        </div>
        <ul className="flex flex-col gap-2">
          {disponibilidade.length === 0 && <li className="text-sm text-muted-foreground">Nenhum horário ainda.</li>}
          {disponibilidade.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md bg-soft px-3 py-2 text-sm">
              <span>
                <b>{DIAS[d.dia_semana]}</b> · {d.inicio} às {d.fim}
              </span>
              <Button size="icon" variant="ghost" aria-label="Remover" disabled={pendente}
                onClick={() => executar(() => remover('agenda_disponibilidade', d.id), 'Horário removido')}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dia} onValueChange={setDia}>
            <SelectTrigger aria-label="Dia"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIAS.map((n, i) => <SelectItem key={n} value={String(i)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={inicio} onValueChange={setInicio}>
            <SelectTrigger aria-label="Início"><SelectValue /></SelectTrigger>
            <SelectContent>{HORAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fim} onValueChange={setFim}>
            <SelectTrigger aria-label="Fim"><SelectValue /></SelectTrigger>
            <SelectContent>{HORAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button disabled={pendente} onClick={() => executar(() => adicionarDisponibilidade(Number(dia), inicio, fim), 'Horário adicionado')}>
          <Plus />
          Adicionar horário
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle>Bloqueios</CardTitle>
          <CardDescription>Férias ou compromissos: esses períodos nunca são oferecidos.</CardDescription>
        </div>
        <ul className="flex flex-col gap-2">
          {bloqueios.length === 0 && <li className="text-sm text-muted-foreground">Nenhum bloqueio.</li>}
          {bloqueios.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-md bg-soft px-3 py-2 text-sm">
              <span>{fmt(b.inicio)} até {fmt(b.fim)}{b.motivo ? ` · ${b.motivo}` : ''}</span>
              <Button size="icon" variant="ghost" aria-label="Remover" disabled={pendente}
                onClick={() => executar(() => remover('agenda_bloqueios', b.id), 'Bloqueio removido')}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label>Início</Label>
            <Input type="datetime-local" value={bInicio} onChange={(e) => setBInicio(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Fim</Label>
            <Input type="datetime-local" value={bFim} onChange={(e) => setBFim(e.target.value)} />
          </div>
        </div>
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" />
        <Button variant="outline" disabled={pendente || !bInicio || !bFim}
          onClick={() => executar(() => adicionarBloqueio(comFuso(bInicio), comFuso(bFim), motivo), 'Bloqueio adicionado')}>
          <Plus />
          Adicionar bloqueio
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 lg:col-span-2">
        <CardTitle>Entrevistas marcadas</CardTitle>
        {entrevistas.length === 0 && (
          <CardDescription>Nenhuma ainda. Elas aparecem aqui quando confirma um horário no Assistente.</CardDescription>
        )}
        <ul className="flex flex-col gap-2">
          {entrevistas.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div>
                <p className="font-medium">{e.titulo}</p>
                <p className="text-sm text-muted-foreground">{fmt(e.inicio)}{e.link ? ' · com link' : ''}</p>
              </div>
              <div className="flex gap-1">
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
                <Button size="icon" variant="ghost" aria-label="Cancelar" disabled={pendente}
                  onClick={() => executar(() => remover('entrevistas', e.id), 'Entrevista removida')}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
