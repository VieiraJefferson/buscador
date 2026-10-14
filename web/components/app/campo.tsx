import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Rótulo + controle + ajuda opcional. Todo campo de formulário passa por aqui. */
export function Campo({
  rotulo,
  htmlFor,
  ajuda,
  acao,
  className,
  children,
}: {
  rotulo: string;
  htmlFor?: string;
  ajuda?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{rotulo}</Label>
        {acao}
      </div>
      {children}
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  );
}
