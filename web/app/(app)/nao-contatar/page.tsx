import { ShieldCheck } from 'lucide-react';
import { Cabecalho } from '@/components/app/cabecalho';
import { EstadoVazio } from '@/components/app/estado-vazio';
import { exigirUsuario } from '@/lib/auth';
import { ListaNaoContatar } from './lista';

export const dynamic = 'force-dynamic';

/**
 * Empresas bloqueadas: recusaram, pediram para não receber mais emails (saída RGPD) ou foram
 * bloqueadas à mão. Não voltam nas vagas, o coletor e o Apollo não as consultam e os contatos
 * delas foram apagados (ADR-0005, ADR-0006).
 */
export default async function NaoContatarPage() {
  const { supabase, user } = await exigirUsuario();
  const { data } = await supabase
    .from('empresas')
    .select('id, nome, dominio, atualizado_em')
    .eq('owner_id', user.id)
    .eq('bloqueada', true)
    .order('atualizado_em', { ascending: false })
    .limit(500);
  const empresas = (data ?? []) as { id: string; nome: string; dominio: string | null; atualizado_em: string }[];

  return (
    <div>
      <Cabecalho eyebrow="Recusas e pedidos de saída" titulo="Não contatar" />
      {empresas.length ? (
        <ListaNaoContatar empresas={empresas} />
      ) : (
        <EstadoVazio
          icone={ShieldCheck}
          titulo="Nenhuma empresa bloqueada."
          descricao="Quando uma empresa recusar ou pedir para não receber mais emails, aplique no Assistente e ela aparece aqui."
        />
      )}
    </div>
  );
}
