/** Datas sempre no fuso de Lisboa, onde o Jefferson mora. Um formatador para cada uso. */
const FUSO = 'Europe/Lisbon';

const formatador = (opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opcoes });

const curta = formatador({ day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const comDia = formatador({ weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "14 de out., 10:00" */
export const dataCurta = (iso: string) => curta.format(new Date(iso));
/** "ter., 14 de out., 10:00" */
export const dataComDia = (iso: string) => comDia.format(new Date(iso));
