import { ESTADOS, PRIORIDADES, type EstadoCandidatura } from '@/lib/tipos';

/** "Madrid, ES", ou "UE" quando a fonte não diz. */
export const localDaVaga = (cidade: string | null, pais: string | null) => [cidade, pais].filter(Boolean).join(', ') || 'UE';

export const nomePrioridade = (p: number | null) => PRIORIDADES[p ?? 4] ?? 'Outros';

export const rotuloEstado = (e: EstadoCandidatura) => ESTADOS.find((x) => x.valor === e)?.rotulo ?? e;

/**
 * Grupos de estado usados nas abas da lista de vagas. "a_enviar" inclui as vagas ainda sem
 * candidatura; os outros valores de filtro são o próprio estado.
 */
export const FASES: { valor: string; rotulo: string; estados: EstadoCandidatura[] }[] = [
  { valor: 'a_enviar', rotulo: 'A enviar', estados: ['a_enviar'] },
  { valor: 'aguardando', rotulo: 'Aguardando resposta', estados: ['enviada'] },
  { valor: 'andamento', rotulo: 'Em andamento', estados: ['respondida', 'entrevista'] },
  { valor: 'encerradas', rotulo: 'Encerradas', estados: ['recusada', 'sem_resposta'] },
];

export function estadoBateComFiltro(estado: EstadoCandidatura | undefined, filtro: string): boolean {
  const atual = estado ?? 'a_enviar';
  const fase = FASES.find((f) => f.valor === filtro);
  return fase ? fase.estados.includes(atual) : atual === filtro;
}
