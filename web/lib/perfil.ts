import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import inicial from '@/lib/perfil-inicial.json';

export type Perfil = Record<string, unknown>;

/** Perfil do banco (editado no site); na primeira vez, o conteúdo de config/perfil.yaml. */
export async function carregarPerfil(supabase: SupabaseClient, dono: string): Promise<{ dados: Perfil; salvo: boolean }> {
  const { data } = await supabase.from('perfis').select('dados').eq('owner_id', dono).maybeSingle();
  if (data?.dados) return { dados: data.dados as Perfil, salvo: true };
  return { dados: inicial as Perfil, salvo: false };
}
