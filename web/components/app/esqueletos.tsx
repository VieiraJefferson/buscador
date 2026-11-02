import { Skeleton } from '@/components/ui/skeleton';

/** Telas de espera (loading.tsx): aparecem no mesmo instante do toque, no formato da
 *  tela que vem, enquanto o servidor busca os dados. */

function EsqueletoCabecalho() {
  return (
    <div className="mb-6 md:mb-8">
      <Skeleton className="mb-3 h-3 w-28" />
      <Skeleton className="h-9 w-56 md:h-11" />
    </div>
  );
}

export function EsqueletoInicio() {
  return (
    <div>
      <EsqueletoCabecalho />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Skeleton className="col-span-2 h-56 rounded-xl md:row-span-2 md:h-auto" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="col-span-2 h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoLista() {
  return (
    <div>
      <EsqueletoCabecalho />
      <Skeleton className="mb-3 h-3 w-24" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoDetalhe() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-3/4" />
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/** Telas feitas de seções (agenda, assistente, perfil, coletor). */
export function EsqueletoSecoes({ quantidade = 2 }: { quantidade?: number }) {
  return (
    <div>
      <EsqueletoCabecalho />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: quantidade }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
