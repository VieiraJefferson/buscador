import { ESTADOS, PRIORIDADES, type EstadoCandidatura } from '@/lib/tipos';

/** "Madrid, ES", ou "UE" quando a fonte não diz. */
export const localDaVaga = (cidade: string | null, pais: string | null) => [cidade, pais].filter(Boolean).join(', ') || 'UE';

export const nomePrioridade = (p: number | null) => PRIORIDADES[p ?? 4] ?? 'Outros';

export const rotuloEstado = (e: EstadoCandidatura) => ESTADOS.find((x) => x.valor === e)?.rotulo ?? e;
