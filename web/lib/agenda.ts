// Cálculo de horários livres para entrevistas (ADR do plano de 2026-10-14).
// Sem bibliotecas de datas: usa Intl para converter entre fusos (inclui horário de verão).

export type Disponibilidade = { dia_semana: number; inicio: string; fim: string; fuso: string };
export type Intervalo = { inicio: Date; fim: Date };

/** Minutos de diferença entre o fuso e UTC naquele instante (ex.: Lisboa no verão = +60). */
function deslocamento(instante: Date, fuso: string): number {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instante)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  const comoUtc = Date.UTC(
    partes.year!,
    partes.month! - 1,
    partes.day!,
    partes.hour!,
    partes.minute!,
    partes.second!,
  );
  return Math.round((comoUtc - instante.getTime()) / 60000);
}

/** Hora de parede num fuso (ano, mês 1-12, dia, hora, minuto) → instante UTC. */
export function horaLocalParaUtc(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  fuso: string,
): Date {
  const palpite = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto));
  const primeiro = deslocamento(palpite, fuso);
  const ajustado = new Date(palpite.getTime() - primeiro * 60000);
  const segundo = deslocamento(ajustado, fuso); // corrige a troca de horário de verão
  return new Date(palpite.getTime() - segundo * 60000);
}

/** Data de calendário (ano, mês, dia, dia da semana) de um instante num fuso. */
function dataNoFuso(instante: Date, fuso: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(instante).map((x) => [x.type, x.value]));
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    semana: dias.indexOf(p.weekday ?? ''),
  };
}

const sobrepoe = (a: Intervalo, b: Intervalo) => a.inicio < b.fim && b.inicio < a.fim;

export type OpcoesHorarios = {
  disponibilidade: Disponibilidade[];
  ocupados: Intervalo[]; // bloqueios e entrevistas marcadas
  agora: Date;
  duracaoMin?: number;
  margemMin?: number; // folga antes e depois de cada compromisso
  antecedenciaHoras?: number; // não sugerir nada em cima da hora
  dias?: number;
  quantidade?: number;
  passoMin?: number;
};

/** Próximos horários livres, no máximo um por dia para dar opções variadas. */
export function horariosLivres(o: OpcoesHorarios): Intervalo[] {
  const duracao = (o.duracaoMin ?? 45) * 60000;
  const margem = (o.margemMin ?? 30) * 60000;
  const passo = (o.passoMin ?? 30) * 60000;
  const minimo = o.agora.getTime() + (o.antecedenciaHoras ?? 24) * 3600000;
  const ocupados = o.ocupados.map((x) => ({
    inicio: new Date(x.inicio.getTime() - margem),
    fim: new Date(x.fim.getTime() + margem),
  }));
  const resultado: Intervalo[] = [];

  for (let d = 0; d < (o.dias ?? 14) && resultado.length < (o.quantidade ?? 3); d++) {
    const dia = new Date(o.agora.getTime() + d * 86400000);
    let achouNoDia = false;
    for (const disp of o.disponibilidade) {
      if (achouNoDia) break;
      const local = dataNoFuso(dia, disp.fuso);
      if (local.semana !== disp.dia_semana) continue;
      const [hi = 0, mi = 0] = disp.inicio.split(':').map(Number);
      const [hf = 0, mf = 0] = disp.fim.split(':').map(Number);
      const abre = horaLocalParaUtc(local.ano, local.mes, local.dia, hi, mi, disp.fuso).getTime();
      const fecha = horaLocalParaUtc(local.ano, local.mes, local.dia, hf, mf, disp.fuso).getTime();
      for (let t = abre; t + duracao <= fecha; t += passo) {
        if (t < minimo) continue;
        const candidato = { inicio: new Date(t), fim: new Date(t + duracao) };
        if (ocupados.some((x) => sobrepoe(candidato, x))) continue;
        resultado.push(candidato);
        achouNoDia = true;
        break;
      }
    }
  }
  return resultado;
}

/** "terça, 20 out., 10:00 (Lisboa)" no idioma e fuso pedidos. */
export function formatarHorario(i: Intervalo, fuso: string, idioma = 'pt-BR'): string {
  return new Intl.DateTimeFormat(idioma, {
    timeZone: fuso,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(i.inicio);
}

/** Arquivo .ics de uma entrevista (abre no Google ou Apple Calendar). */
export function gerarIcs(e: { id: string; titulo: string; inicio: Date; fim: Date; link?: string | null }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapar = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//buscador//entrevistas//PT',
    'BEGIN:VEVENT',
    `UID:${e.id}@buscador`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(e.inicio)}`,
    `DTEND:${fmt(e.fim)}`,
    `SUMMARY:${escapar(e.titulo)}`,
    ...(e.link ? [`URL:${e.link}`, `DESCRIPTION:${escapar(e.link)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
