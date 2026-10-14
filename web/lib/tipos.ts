// Espelho das tabelas do banco (supabase/migrations/0001..0003).

export type Regime = 'remoto' | 'hibrido' | 'presencial' | 'desconhecido';
export type EstadoCandidatura =
  | 'a_enviar'
  | 'enviada'
  | 'respondida'
  | 'entrevista'
  | 'recusada'
  | 'sem_resposta';

export const ESTADOS: { valor: EstadoCandidatura; rotulo: string }[] = [
  { valor: 'a_enviar', rotulo: 'A enviar' },
  { valor: 'enviada', rotulo: 'Enviada' },
  { valor: 'respondida', rotulo: 'Respondida' },
  { valor: 'entrevista', rotulo: 'Entrevista' },
  { valor: 'recusada', rotulo: 'Recusada' },
  { valor: 'sem_resposta', rotulo: 'Sem resposta' },
];

export const PRIORIDADES: Record<number, string> = {
  1: 'Espanha',
  2: 'Holanda e Alemanha',
  3: 'Portugal',
  4: 'Resto da UE',
};

export const REGIMES: Record<Regime, string> = {
  remoto: 'Remoto',
  hibrido: 'Híbrido',
  presencial: 'Presencial',
  desconhecido: 'A confirmar',
};

export type VagaLista = {
  id: string;
  titulo: string;
  url: string;
  pais: string | null;
  cidade: string | null;
  regime: Regime;
  prioridade_pais: number | null;
  nota: number | null;
  nota_justificativa: string | null;
  consultoria: boolean;
  vista_primeira_em: string;
  empresas: { id: string; nome: string; bloqueada: boolean } | null;
  candidaturas: { estado: EstadoCandidatura }[];
  emails_gerados: { id: string }[];
};
