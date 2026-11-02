import type { Route } from 'next';

/**
 * Mapa único das rotas do app. Menu, bento e atalhos usam só isto, sem caminhos escritos à
 * mão. Com `typedRoutes` (next.config.ts), um caminho que não existe vira erro de compilação.
 */
export type FiltrosVagas = Partial<
  Record<'prioridade' | 'pais' | 'regime' | 'nota' | 'estado' | 'tipo' | 'q', string>
>;

const comBusca = <T extends string>(caminho: T, busca?: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(busca ?? {})) if (v) p.set(k, v);
  const q = p.toString();
  return (q ? `${caminho}?${q}` : caminho) as Route;
};

export const rotas = {
  inicio: '/' as Route,
  entrar: '/entrar' as Route,
  vagas: (filtros?: FiltrosVagas) => comBusca('/vagas', filtros),
  vaga: (id: string) => `/vagas/${id}` as Route,
  assistente: (vaga?: string) => comBusca('/assistente', { vaga }),
  agenda: '/agenda' as Route,
  perfil: '/perfil' as Route,
  coletor: '/coletor' as Route,
} as const;
