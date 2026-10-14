import { cn } from '@/lib/utils';

/** Número grande com rótulo, no estilo display do portfólio (Montserrat 900). */
export function Estatistica({
  rotulo,
  valor,
  detalhe,
  tamanho = 'md',
  invertido = false,
}: {
  rotulo: string;
  valor: number | string;
  detalhe?: React.ReactNode;
  tamanho?: 'sm' | 'md' | 'xl';
  invertido?: boolean;
}) {
  return (
    <div>
      <p className={cn('eyebrow', invertido && 'text-white/60')}>{rotulo}</p>
      <p
        className={cn(
          'font-display font-black tracking-tight',
          { sm: 'mt-1 text-2xl', md: 'mt-3 text-4xl', xl: 'mt-6 text-7xl md:text-8xl' }[tamanho],
        )}
      >
        {valor}
      </p>
      {detalhe && <p className={cn('mt-1 text-xs', invertido ? 'text-white/70' : 'text-muted-foreground')}>{detalhe}</p>}
    </div>
  );
}
