'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { exigirUsuario } from '@/lib/auth';
import type { EstadoCandidatura } from '@/lib/tipos';

const Ids = z.array(z.uuid()).min(1).max(200);
const Estado = z.enum(['a_enviar', 'enviada', 'respondida', 'entrevista', 'recusada', 'sem_resposta']);

/** Cria ou atualiza as candidaturas. Toda escrita leva owner_id explícito (contrato APOIO). */
async function gravarEstado(ids: string[], estado: EstadoCandidatura) {
  const { supabase, user } = await exigirUsuario();
  const agora = new Date().toISOString();
  const { data: existentes } = await supabase
    .from('candidaturas')
    .select('vaga_id, enviada_em')
    .eq('owner_id', user.id)
    .in('vaga_id', ids);
  const enviadaEm = new Map((existentes ?? []).map((c) => [c.vaga_id as string, c.enviada_em as string | null]));
  const linhas = ids.map((vaga_id) => ({
    owner_id: user.id,
    vaga_id,
    estado,
    // o banco exige enviada_em para qualquer estado depois de "a enviar"
    enviada_em: estado === 'a_enviar' ? null : (enviadaEm.get(vaga_id) ?? agora),
  }));
  const { error } = await supabase.from('candidaturas').upsert(linhas, { onConflict: 'owner_id,vaga_id' });
  if (error) throw new Error('Falha ao gravar o estado');
  revalidatePath('/vagas');
  revalidatePath('/');
}

export async function marcarEstado(idsBrutos: string[], estadoBruto: string) {
  await gravarEstado(Ids.parse(idsBrutos), Estado.parse(estadoBruto));
}

export async function descartarVagas(idsBrutos: string[]) {
  const ids = Ids.parse(idsBrutos);
  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase.from('vagas').update({ descartada: true }).eq('owner_id', user.id).in('id', ids);
  if (error) throw new Error('Falha ao descartar');
  revalidatePath('/vagas');
  revalidatePath('/');
}

export async function bloquearEmpresa(empresaIdBruto: string, bloquear: boolean) {
  const empresaId = z.uuid().parse(empresaIdBruto);
  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase
    .from('empresas')
    .update({ bloqueada: bloquear })
    .eq('owner_id', user.id)
    .eq('id', empresaId);
  if (error) throw new Error('Falha ao atualizar a empresa');
  revalidatePath('/vagas');
}

export async function guardarResposta(vagaIdBruto: string, resposta: string) {
  const vagaId = z.uuid().parse(vagaIdBruto);
  const texto = z.string().min(1).max(10000).parse(resposta);
  const { supabase, user } = await exigirUsuario();
  const { data } = await supabase
    .from('candidaturas')
    .select('estado, enviada_em')
    .eq('owner_id', user.id)
    .eq('vaga_id', vagaId)
    .maybeSingle();
  const estado = (data?.estado as EstadoCandidatura | undefined) ?? 'respondida';
  const { error } = await supabase.from('candidaturas').upsert(
    {
      owner_id: user.id,
      vaga_id: vagaId,
      estado,
      enviada_em: estado === 'a_enviar' ? null : (data?.enviada_em ?? new Date().toISOString()),
      resposta_sugerida: texto,
    },
    { onConflict: 'owner_id,vaga_id' },
  );
  if (error) throw new Error('Falha ao guardar a resposta');
}
