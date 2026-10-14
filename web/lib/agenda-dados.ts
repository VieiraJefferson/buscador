import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatarHorario, horariosLivres, type Disponibilidade, type Intervalo } from '@/lib/agenda';

export async function proximosHorarios(supabase: SupabaseClient, dono: string, fusoEmpresa: string, idioma: string) {
  const agora = new Date();
  const [disp, bloq, entr] = await Promise.all([
    supabase.from('agenda_disponibilidade').select('dia_semana, inicio, fim, fuso').eq('owner_id', dono),
    supabase.from('agenda_bloqueios').select('inicio, fim').eq('owner_id', dono).gte('fim', agora.toISOString()),
    supabase.from('entrevistas').select('inicio, fim').eq('owner_id', dono).gte('fim', agora.toISOString()),
  ]);
  const ocupados: Intervalo[] = [...(bloq.data ?? []), ...(entr.data ?? [])].map((x) => ({
    inicio: new Date(x.inicio as string),
    fim: new Date(x.fim as string),
  }));
  const disponibilidade = (disp.data ?? []).map((d) => ({
    ...d,
    inicio: String(d.inicio).slice(0, 5),
    fim: String(d.fim).slice(0, 5),
  })) as Disponibilidade[];
  let fuso = 'Europe/Lisbon';
  try {
    new Intl.DateTimeFormat('en', { timeZone: fusoEmpresa });
    if (fusoEmpresa) fuso = fusoEmpresa;
  } catch {}
  const locale = { en: 'en-GB', es: 'es-ES', pt: 'pt-PT', de: 'de-DE', nl: 'nl-NL', fr: 'fr-FR' }[idioma] ?? 'en-GB';
  return horariosLivres({ disponibilidade, ocupados, agora }).map((h) => ({
    inicio: h.inicio.toISOString(),
    fim: h.fim.toISOString(),
    rotulo: formatarHorario(h, fuso, locale),
  }));
}
