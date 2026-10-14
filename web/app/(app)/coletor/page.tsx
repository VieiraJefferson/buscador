import { Cabecalho } from '@/components/app/cabecalho';
import { exigirUsuario } from '@/lib/auth';
import { Coletor } from './coletor';

export const dynamic = 'force-dynamic';

export default async function ColetorPage() {
  const { supabase, user } = await exigirUsuario();
  const { data } = await supabase
    .from('execucoes')
    .select('id, fonte, iniciada_em, vagas_lidas, vagas_novas')
    .eq('owner_id', user.id)
    .order('iniciada_em', { ascending: false })
    .limit(20);
  return (
    <div>
      <Cabecalho eyebrow="GitHub Actions" titulo="Coletor" />
      <Coletor historico={data ?? []} />
    </div>
  );
}
