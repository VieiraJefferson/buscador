'use client';

import { BriefcaseBusiness, CalendarDays, Home, type LucideIcon, MessageSquareText, Play, UserRound } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IndicadorLink } from '@/components/app/indicador-link';
import { rotas } from '@/lib/rotas';
import { cn } from '@/lib/utils';
import { BotaoSair } from './botao-sair';

type Item = { href: Route; rotulo: string; icone: LucideIcon };

const ITENS: Item[] = [
  { href: rotas.inicio, rotulo: 'Início', icone: Home },
  { href: rotas.vagas(), rotulo: 'Vagas', icone: BriefcaseBusiness },
  { href: rotas.assistente(), rotulo: 'Assistente', icone: MessageSquareText },
  { href: rotas.agenda, rotulo: 'Agenda', icone: CalendarDays },
  { href: rotas.perfil, rotulo: 'Perfil', icone: UserRound },
  { href: rotas.coletor, rotulo: 'Coletor', icone: Play },
];

const ativo = (atual: string, href: string) => (href === '/' ? atual === '/' : atual.startsWith(href));

/** Menu lateral (computador) e inferior (celular). Cada item mostra o carregamento no
 *  instante do toque (IndicadorLink). */
export function Navegacao() {
  const atual = usePathname();
  return (
    <>
      <nav className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-1 border-r p-5 md:flex">
        <p className="mb-6 font-display text-xl font-black tracking-tight">Buscador</p>
        {ITENS.map(({ href, rotulo, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-dim transition duration-200 ease-(--ease-out) hover:bg-soft',
              ativo(atual, href) && 'bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            <Icone className="size-4" />
            {rotulo}
            <IndicadorLink className="ml-auto" />
          </Link>
        ))}
        <BotaoSair className="mt-auto" />
      </nav>
      {/* Celular: menu inferior fixo, botões grandes (o Coletor fica no Início) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITENS.slice(0, 5).map(({ href, rotulo, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground',
              ativo(atual, href) && 'text-foreground',
            )}
          >
            <Icone className={cn('size-5', ativo(atual, href) && 'text-sea')} />
            {rotulo}
            <IndicadorLink className="absolute top-1.5" />
          </Link>
        ))}
      </nav>
    </>
  );
}
