import { describe, expect, it } from 'vitest';
import { gerarIcs, horaLocalParaUtc, horariosLivres } from './agenda';

const LISBOA = 'Europe/Lisbon';
// Segunda a sexta, 10:00 às 12:00 em Lisboa
const SEMANA = [1, 2, 3, 4, 5].map((d) => ({ dia_semana: d, inicio: '10:00', fim: '12:00', fuso: LISBOA }));

describe('horaLocalParaUtc', () => {
  it('converte com horário de verão e de inverno de Lisboa', () => {
    expect(horaLocalParaUtc(2026, 10, 20, 10, 0, LISBOA).toISOString()).toBe('2026-10-20T09:00:00.000Z');
    // o horário de verão termina em 25/10/2026
    expect(horaLocalParaUtc(2026, 10, 27, 10, 0, LISBOA).toISOString()).toBe('2026-10-27T10:00:00.000Z');
    expect(horaLocalParaUtc(2026, 10, 20, 10, 0, 'Europe/Madrid').toISOString()).toBe(
      '2026-10-20T08:00:00.000Z',
    );
  });
});

describe('horariosLivres', () => {
  const agora = new Date('2026-10-14T08:00:00Z'); // quarta-feira

  it('respeita a antecedência mínima e devolve um horário por dia útil', () => {
    const r = horariosLivres({ disponibilidade: SEMANA, ocupados: [], agora });
    expect(r.map((x) => x.inicio.toISOString())).toEqual([
      '2026-10-15T09:00:00.000Z', // quinta 10:00 Lisboa (quarta fica dentro das 24 h)
      '2026-10-16T09:00:00.000Z', // sexta
      '2026-10-19T09:00:00.000Z', // segunda (fim de semana pulado)
    ]);
  });

  it('pula horários ocupados, com margem de 30 minutos', () => {
    const entrevista = { inicio: new Date('2026-10-15T09:00:00Z'), fim: new Date('2026-10-15T09:45:00Z') };
    const r = horariosLivres({ disponibilidade: SEMANA, ocupados: [entrevista], agora, quantidade: 1 });
    // 10:00-10:45 ocupado + 30 min de margem: não cabem 45 min até as 12:00, vai para sexta
    expect(r[0]?.inicio.toISOString()).toBe('2026-10-16T09:00:00.000Z');
  });

  it('um bloqueio de dia inteiro remove o dia', () => {
    const ferias = { inicio: new Date('2026-10-15T00:00:00Z'), fim: new Date('2026-10-16T00:00:00Z') };
    const r = horariosLivres({ disponibilidade: SEMANA, ocupados: [ferias], agora, quantidade: 1 });
    expect(r[0]?.inicio.toISOString()).toBe('2026-10-16T09:00:00.000Z');
  });
});

describe('gerarIcs', () => {
  it('gera um evento válido e escapa vírgulas', () => {
    const ics = gerarIcs({
      id: 'x1',
      titulo: 'Entrevista, Produto SL',
      inicio: new Date('2026-10-20T09:00:00Z'),
      fim: new Date('2026-10-20T09:45:00Z'),
    });
    expect(ics).toContain('DTSTART:20261020T090000Z');
    expect(ics).toContain('SUMMARY:Entrevista\\, Produto SL');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });
});
