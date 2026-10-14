import { Cabecalho } from '@/components/app/cabecalho';
import { exigirUsuario } from '@/lib/auth';
import type { VagaLista } from '@/lib/tipos';
import { Filtros } from './filtros';
import { ListaVagas } from './lista';

export const dynamic = 'force-dynamic';

type Busca = Record<string, string | undefined>;

export default async function VagasPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const f = await searchParams;
  const { supabase, user } = await exigirUsuario();

  let consulta = supabase
    .from('vagas')
    .select(
      'id, titulo, url, pais, cidade, regime, prioridade_pais, nota, nota_justificativa, consultoria, vista_primeira_em, empresas!inner(id, nome, bloqueada), candidaturas(estado), emails_gerados(id)',
    )
    .eq('owner_id', user.id)
    .eq('ativa', true)
    .eq('empresas.bloqueada', false);

  if (f.prioridade && /^[1-4]$/.test(f.prioridade)) consulta = consulta.eq('prioridade_pais', Number(f.prioridade));
  if (f.pais && /^[A-Z]{2}$/.test(f.pais)) consulta = consulta.eq('pais', f.pais);
  if (f.regime && ['remoto', 'hibrido', 'desconhecido'].includes(f.regime)) consulta = consulta.eq('regime', f.regime);
  if (f.nota && /^[1-5]$/.test(f.nota)) consulta = consulta.gte('nota', Number(f.nota));
  if (f.tipo === 'direto') consulta = consulta.eq('consultoria', false);
  if (f.tipo === 'consultoria') consulta = consulta.eq('consultoria', true);
  if (f.estado === 'novas') {
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    consulta = consulta.gte('vista_primeira_em', hoje.toISOString());
  }
  if (f.q) {
    const termo = f.q.replace(/[%,()]/g, ' ').trim().slice(0, 60);
    if (termo) consulta = consulta.ilike('titulo', `%${termo}%`);
  }

  const { data } = await consulta
    .order('prioridade_pais', { ascending: true, nullsFirst: false })
    .order('consultoria', { ascending: true })
    .order('nota', { ascending: false, nullsFirst: false })
    .limit(300);

  let vagas = (data ?? []) as unknown as VagaLista[];
  // Estado da candidatura: filtro aplicado aqui (a relação é opcional)
  const estado = f.estado;
  if (estado && estado !== 'novas') {
    vagas = vagas.filter((v) =>
      estado === 'a_enviar'
        ? !v.candidaturas.length || v.candidaturas[0]?.estado === 'a_enviar'
        : v.candidaturas[0]?.estado === estado,
    );
  }

  return (
    <div>
      <Cabecalho eyebrow="Empregadores diretos primeiro" titulo="Vagas">
        <Filtros />
      </Cabecalho>
      <ListaVagas vagas={vagas} />
    </div>
  );
}
