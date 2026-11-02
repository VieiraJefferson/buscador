import { describe, expect, it } from 'vitest';
import { Classificacao } from './classificacao';

const base = { resumo: 'x', empresa: 'Acme', idioma: 'en', fuso_empresa: '' };

describe('Classificacao', () => {
  it('aceita o pedido para não receber mais emails (saída RGPD)', () => {
    expect(Classificacao.safeParse({ ...base, tipo: 'nao_contatar' }).success).toBe(true);
  });

  it('continua aceitando os tipos antigos e rejeita tipo desconhecido', () => {
    for (const tipo of ['recusa', 'convite_entrevista', 'pedido_informacao', 'outro']) {
      expect(Classificacao.safeParse({ ...base, tipo }).success).toBe(true);
    }
    expect(Classificacao.safeParse({ ...base, tipo: 'spam' }).success).toBe(false);
  });
});
