import { ArrowUpRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { Revelar } from '@/components/app/movimento/revelar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Célula do bento grid. `className` define o espaço na grade (col-span, row-span);
 * `href` torna o cartão inteiro clicável; `destaque` usa o fundo escuro do portfólio.
 * `atraso` escalona a entrada (ms).
 */
export function CartaoBento({
  href,
  destaque = false,
  atraso = 0,
  className,
  children,
}: {
  href?: Route;
  destaque?: boolean;
  atraso?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const cartao = (
    <Card
      className={cn(
        'relative flex h-full flex-col justify-between gap-3 transition duration-300 ease-(--ease-out)',
        href && 'hover:-translate-y-0.5 hover:shadow-card',
        destaque && 'border-transparent bg-primary text-primary-foreground',
      )}
    >
      {href && (
        <ArrowUpRight
          className={cn('absolute top-5 right-5 size-5', destaque ? 'text-white/60' : 'text-muted-foreground')}
        />
      )}
      {children}
    </Card>
  );
  return (
    <Revelar atraso={atraso} className={className}>
      {href ? (
        <Link href={href} className="block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
          {cartao}
        </Link>
      ) : (
        cartao
      )}
    </Revelar>
  );
}
