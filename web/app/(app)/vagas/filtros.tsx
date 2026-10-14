'use client';

import { SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const CHAVE = 'buscador:filtros-vagas';
const TODOS = 'todos';

const CAMPOS = [
  {
    nome: 'prioridade',
    rotulo: 'País',
    opcoes: [
      ['1', 'Espanha'],
      ['2', 'Holanda e Alemanha'],
      ['3', 'Portugal'],
      ['4', 'Resto da UE'],
    ],
  },
  {
    nome: 'regime',
    rotulo: 'Regime',
    opcoes: [
      ['remoto', 'Remoto'],
      ['hibrido', 'Híbrido'],
      ['desconhecido', 'A confirmar'],
    ],
  },
  {
    nome: 'nota',
    rotulo: 'Nota mínima',
    padrao: '3 ou mais',
    opcoes: [
      ['5', '5'],
      ['4', '4 ou mais'],
      ['todas', 'Todas, inclusive sem nota'],
      ['sem', 'Ainda sem nota'],
    ],
  },
  {
    nome: 'estado',
    rotulo: 'Estado',
    opcoes: [
      ['novas', 'Novas hoje'],
      ['a_enviar', 'A enviar'],
      ['enviada', 'Enviadas'],
      ['respondida', 'Respondidas'],
      ['entrevista', 'Entrevista'],
      ['recusada', 'Recusadas'],
    ],
  },
  {
    nome: 'tipo',
    rotulo: 'Empresa',
    opcoes: [
      ['direto', 'Empregador direto'],
      ['consultoria', 'Consultoria'],
    ],
  },
] as const;

export function Filtros() {
  const router = useRouter();
  const caminho = usePathname();
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
      if (salvo) router.replace(`${caminho}?${salvo}`);
    } catch {}
  }, [busca, caminho, router]);

  function definir(nome: string, valor: string) {
    const p = new URLSearchParams(busca.toString());
    if (!valor || valor === TODOS) p.delete(nome);
    else p.set(nome, valor);
    router.replace(`${caminho}?${p.toString()}`);
  }

  const ativos = CAMPOS.filter((c) => busca.get(c.nome)).length;

  return (
    <div className="flex w-full gap-2 md:w-auto">
      <form
        className="flex-1 md:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          definir('q', q.trim());
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no título…" />
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
            {CAMPOS.map((c) => (
              <div key={c.nome} className="flex flex-col gap-1.5">
                <Label>{c.rotulo}</Label>
                <Select value={busca.get(c.nome) ?? TODOS} onValueChange={(v) => definir(c.nome, v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>{'padrao' in c ? c.padrao : 'Todos'}</SelectItem>
                    {c.opcoes.map(([valor, rotulo]) => (
                      <SelectItem key={valor} value={valor}>
                        {rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => router.replace(caminho + '?estado=a_enviar')}>
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
