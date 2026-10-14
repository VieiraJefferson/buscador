'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { exigirUsuario } from '@/lib/auth';
import { marcarEstado, bloquearEmpresa } from '../vagas/actions';

const Hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export async function adicionarDisponibilidade(dia: number, inicio: string, fim: string) {
  const d = z.number().int().min(0).max(6).parse(dia);
  const i = Hora.parse(inicio);
  const f = Hora.parse(fim);
  if (f <= i) throw new Error('O fim tem de ser depois do início');
  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase
    .from('agenda_disponibilidade')
    .insert({ owner_id: user.id, dia_semana: d, inicio: i, fim: f, fuso: 'Europe/Lisbon' });
  if (error) throw new Error('Falha ao gravar');
  revalidatePath('/agenda');
}

export async function adicionarBloqueio(inicio: string, fim: string, motivo: string) {
  const i = z.iso.datetime({ offset: true }).parse(inicio);
  const f = z.iso.datetime({ offset: true }).parse(fim);
  if (new Date(f) <= new Date(i)) throw new Error('O fim tem de ser depois do início');
  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase
    .from('agenda_bloqueios')
    .insert({ owner_id: user.id, inicio: i, fim: f, motivo: z.string().max(200).parse(motivo) || null });
  if (error) throw new Error('Falha ao gravar');
  revalidatePath('/agenda');
}

const Tabela = z.enum(['agenda_disponibilidade', 'agenda_bloqueios', 'entrevistas']);

export async function remover(tabela: string, id: string) {
  const t = Tabela.parse(tabela);
  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase.from(t).delete().eq('owner_id', user.id).eq('id', z.uuid().parse(id));
  if (error) throw new Error('Falha ao remover');
  revalidatePath('/agenda');
  revalidatePath('/');
}

const NovaEntrevista = z.object({
  vagaId: z.uuid().optional(),
  titulo: z.string().min(2).max(200),
  inicio: z.iso.datetime({ offset: true }),
  fim: z.iso.datetime({ offset: true }),
  link: z.url().optional().or(z.literal('')),
});

/** Marca a entrevista: o horário fica ocupado e a candidatura passa a "entrevista". */
export async function criarEntrevista(dados: z.input<typeof NovaEntrevista>) {
  const e = NovaEntrevista.parse(dados);
  const { supabase, user } = await exigirUsuario();
  let candidaturaId: string | null = null;
  let empresaId: string | null = null;
  if (e.vagaId) {
    await marcarEstado([e.vagaId], 'entrevista');
    const { data } = await supabase
      .from('vagas')
      .select('empresa_id, candidaturas(id)')
      .eq('owner_id', user.id)
      .eq('id', e.vagaId)
      .maybeSingle();
    empresaId = (data?.empresa_id as string | undefined) ?? null;
    candidaturaId = (data?.candidaturas as unknown as { id: string }[] | undefined)?.[0]?.id ?? null;
  }
  const { error } = await supabase.from('entrevistas').insert({
    owner_id: user.id,
    candidatura_id: candidaturaId,
    empresa_id: empresaId,
    titulo: e.titulo,
    inicio: e.inicio,
    fim: e.fim,
    link: e.link || null,
  });
  if (error) throw new Error('Falha ao marcar a entrevista');
  revalidatePath('/agenda');
  revalidatePath('/');
}

/** Recusa: candidatura "recusada" e a empresa bloqueada (não volta nas buscas). */
export async function aplicarRecusa(vagaId: string) {
  const id = z.uuid().parse(vagaId);
  const { supabase, user } = await exigirUsuario();
  await marcarEstado([id], 'recusada');
  const { data } = await supabase.from('vagas').select('empresa_id').eq('owner_id', user.id).eq('id', id).maybeSingle();
  if (data?.empresa_id) await bloquearEmpresa(data.empresa_id as string, true);
}
