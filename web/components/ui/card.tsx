import type * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border bg-card p-5 text-card-foreground shadow-card', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('font-display text-lg font-bold tracking-tight', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export { Card, CardDescription, CardTitle };
