'use client';

import { BriefcaseBusiness, CalendarDays, Home, MessageSquareText, Play, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BotaoSair } from './botao-sair';

const ITENS = [
  { href: '/', rotulo: 'Início', icone: Home },
  { href: '/vagas', rotulo: 'Vagas', icone: BriefcaseBusiness },
  { href: '/assistente', rotulo: 'Assistente', icone: MessageSquareText },
  { href: '/agenda', rotulo: 'Agenda', icone: CalendarDays },
  { href: '/perfil', rotulo: 'Perfil', icone: UserRound },
  { href: '/coletor', rotulo: 'Coletor', icone: Play },
];

const ativo = (atual: string, href: string) => (href === '/' ? atual === '/' : atual.startsWith(href));

export function Navegacao() {
  const atual = usePathname();
  return (
    <>
      {/* Desktop: barra lateral */}
      <nav className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-1 border-r p-5 md:flex">
        <p className="mb-6 font-display text-xl font-black tracking-tight">Buscador</p>
        {ITENS.map(({ href, rotulo, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-dim transition hover:bg-soft',
              ativo(atual, href) && 'bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            <Icone className="size-4" />
            {rotulo}
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
              'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground',
              ativo(atual, href) && 'text-foreground',
            )}
          >
            <Icone className={cn('size-5', ativo(atual, href) && 'text-sea')} />
            {rotulo}
          </Link>
        ))}
      </nav>
    </>
  );
}
