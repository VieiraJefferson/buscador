import { Cabecalho } from '@/components/app/cabecalho';
import { exigirUsuario } from '@/lib/auth';
import { Agenda } from './agenda';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const { supabase, user } = await exigirUsuario();
  const agora = new Date().toISOString();
  const [disp, bloq, entr] = await Promise.all([
    supabase.from('agenda_disponibilidade').select('id, dia_semana, inicio, fim').eq('owner_id', user.id).order('dia_semana').order('inicio'),
    supabase.from('agenda_bloqueios').select('id, inicio, fim, motivo').eq('owner_id', user.id).gte('fim', agora).order('inicio'),
    supabase.from('entrevistas').select('id, titulo, inicio, fim, link').eq('owner_id', user.id).gte('fim', agora).order('inicio'),
  ]);
  return (
    <div>
      <Cabecalho eyebrow="Horários para entrevistas" titulo="Agenda" />
      <Agenda
        disponibilidade={(disp.data ?? []).map((d) => ({ ...d, inicio: String(d.inicio).slice(0, 5), fim: String(d.fim).slice(0, 5) }))}
        bloqueios={bloq.data ?? []}
        entrevistas={entr.data ?? []}
      />
    </div>
  );
}
