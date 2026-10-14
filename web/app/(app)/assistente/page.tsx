import { Cabecalho } from '@/components/app/cabecalho';
import { exigirUsuario } from '@/lib/auth';
import { Assistente } from './assistente';

export const dynamic = 'force-dynamic';

export default async function AssistentePage({
  searchParams,
}: {
  searchParams: Promise<{ vaga?: string }>;
}) {
  const { vaga } = await searchParams;
  const { supabase, user } = await exigirUsuario();
  // Candidaturas em andamento, para associar a resposta à vaga certa
  const { data } = await supabase
    .from('candidaturas')
    .select('vaga_id, estado, vagas(titulo, empresas(nome))')
    .eq('owner_id', user.id)
    .in('estado', ['enviada', 'respondida', 'entrevista', 'a_enviar'])
    .order('atualizado_em', { ascending: false })
    .limit(100);
  const opcoes = (data ?? []).map((c) => {
    const v = c.vagas as unknown as { titulo: string; empresas: { nome: string } | null } | null;
    return { vagaId: c.vaga_id as string, rotulo: `${v?.empresas?.nome ?? '?'} · ${v?.titulo ?? ''}`, empresa: v?.empresas?.nome ?? '' };
  });

  return (
    <div>
      <Cabecalho eyebrow="Resposta da empresa" titulo="Assistente" />
      <Assistente opcoes={opcoes} vagaInicial={vaga ?? null} />
    </div>
  );
}
