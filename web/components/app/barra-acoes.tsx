import { cn } from '@/lib/utils';

/** Barra flutuante de ações (seleção em lote, salvar perfil). No celular fica acima do menu
 *  inferior e da área segura; no computador, no canto inferior direito. */
export function BarraAcoes({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex items-center justify-between gap-2 rounded-full border bg-background p-2 pl-5 shadow-card md:inset-x-auto md:right-8 md:bottom-8 md:min-w-80',
        className,
      )}
    >
      {children}
    </div>
  );
}
