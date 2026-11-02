import { describe, expect, it } from 'vitest';
import type { EstadoCandidatura } from './tipos';
import { estadoBateComFiltro } from './vaga';

const casos: [EstadoCandidatura | undefined, string, boolean][] = [
  [undefined, 'a_enviar', true],
  ['a_enviar', 'a_enviar', true],
  ['enviada', 'a_enviar', false],
  ['enviada', 'aguardando', true],
  ['respondida', 'aguardando', false],
  ['respondida', 'andamento', true],
  ['entrevista', 'andamento', true],
  ['recusada', 'encerradas', true],
  ['sem_resposta', 'encerradas', true],
  ['enviada', 'encerradas', false],
  ['entrevista', 'entrevista', true],
  [undefined, 'enviada', false],
];

describe('estadoBateComFiltro', () => {
  it.each(casos)('estado %s com filtro %s → %s', (estado, filtro, esperado) => {
    expect(estadoBateComFiltro(estado, filtro)).toBe(esperado);
  });
});
