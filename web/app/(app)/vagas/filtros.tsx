'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Campo } from '@/components/app/campo';
import { CampoSelect, type Opcao } from '@/components/app/campo-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { type FiltrosVagas, rotas } from '@/lib/rotas';
import { ESTADOS, PRIORIDADES } from '@/lib/tipos';

const CHAVE = 'buscador:filtros-vagas';
const TODOS = 'todos';

type Filtro = { nome: keyof FiltrosVagas; rotulo: string; padrao?: string; opcoes: Opcao[] };

const FILTROS: Filtro[] = [
  {
    nome: 'prioridade',
    rotulo: 'País',
    opcoes: Object.entries(PRIORIDADES).map(([valor, rotulo]) => ({ valor, rotulo })),
  },
  {
    nome: 'regime',
    rotulo: 'Regime',
    opcoes: [
      { valor: 'remoto', rotulo: 'Remoto' },
      { valor: 'hibrido', rotulo: 'Híbrido' },
      { valor: 'desconhecido', rotulo: 'A confirmar' },
    ],
  },
  {
    nome: 'nota',
    rotulo: 'Nota mínima',
    padrao: '3 ou mais',
    opcoes: [
      { valor: '5', rotulo: '5' },
      { valor: '4', rotulo: '4 ou mais' },
      { valor: 'todas', rotulo: 'Todas, inclusive sem nota' },
      { valor: 'sem', rotulo: 'Ainda sem nota' },
    ],
  },
  {
    nome: 'estado',
    rotulo: 'Estado',
    opcoes: [
      { valor: 'novas', rotulo: 'Novas hoje' },
      ...ESTADOS.filter((e) => e.valor !== 'sem_resposta').map((e) => ({ valor: e.valor, rotulo: e.rotulo })),
    ],
  },
  {
    nome: 'tipo',
    rotulo: 'Empresa',
    opcoes: [
      { valor: 'direto', rotulo: 'Empregador direto' },
      { valor: 'consultoria', rotulo: 'Consultoria' },
    ],
  },
];

const paraFiltros = (p: URLSearchParams) => Object.fromEntries(p) as FiltrosVagas;

export function Filtros() {
  const router = useRouter();
  const busca = useSearchParams();
  const [q, setQ] = useState(busca.get('q') ?? '');

  // Sem filtros na URL: restaura a última escolha (só neste navegador).
  useEffect(() => {
    if (busca.toString()) {
      try {
        localStorage.setItem(CHAVE, busca.toString());
      } catch {}
      return;
    }
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) router.replace(rotas.vagas(paraFiltros(new URLSearchParams(salvo))));
    } catch {}
  }, [busca, router]);

  function definir(nome: string, valor: string) {
    const p = new URLSearchParams(busca.toString());
    if (!valor || valor === TODOS) p.delete(nome);
    else p.set(nome, valor);
    router.replace(rotas.vagas(paraFiltros(p)));
  }

  const ativos = FILTROS.filter((f) => busca.get(f.nome)).length;

  return (
    <div className="flex w-full gap-2 md:w-auto">
      <form
        className="flex-1 md:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          definir('q', q.trim());
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no título…" aria-label="Buscar no título" />
      </form>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal />
            Filtros{ativos ? ` (${ativos})` : ''}
          </Button>
        </SheetTrigger>
        <SheetContent title="Filtros">
          <div className="flex flex-col gap-4">
            {FILTROS.map((f) => (
              <Campo key={f.nome} rotulo={f.rotulo}>
                <CampoSelect
                  rotulo={f.rotulo}
                  valor={busca.get(f.nome) ?? TODOS}
                  aoMudar={(v) => definir(f.nome, v)}
                  opcoes={[{ valor: TODOS, rotulo: f.padrao ?? 'Todos' }, ...f.opcoes]}
                />
              </Campo>
            ))}
            <div className="mt-2 flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => router.replace(rotas.vagas({ estado: 'a_enviar' }))}>
                Limpar
              </Button>
              <SheetClose asChild>
                <Button className="flex-1">Ver vagas</Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
