'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { exigirUsuario } from '@/lib/auth';

const Perfil = z
  .record(z.string(), z.unknown())
  .refine((p) => JSON.stringify(p).length < 100_000, 'Perfil grande demais');

/** O coletor lê este registro na próxima varredura (tabela perfis, migration 0003). */
export async function salvarPerfil(dados: unknown) {
  const perfil = Perfil.parse(dados);
  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase
    .from('perfis')
    .upsert({ owner_id: user.id, dados: perfil }, { onConflict: 'owner_id' });
  if (error) throw new Error('Falha ao salvar o perfil');
  revalidatePath('/perfil');
}
