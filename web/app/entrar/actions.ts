'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { env } from '@/lib/env';
import { supabaseServidor } from '@/lib/supabase/server';

type Estado = { ok: boolean; msg: string; email?: string } | null;

function permitido(email: string) {
  return email.toLowerCase() === env().EMAIL_PERMITIDO.toLowerCase();
}

/** Envia o código de acesso. O modelo "Magic Link" do Supabase traz {{ .Token }}, não o link. */
export async function enviarCodigo(_: Estado, form: FormData): Promise<Estado> {
  const email = z.email().safeParse(form.get('email'));
  if (!email.success) return { ok: false, msg: 'Email inválido.' };
  // Resposta igual para qualquer email: não revela qual endereço é o permitido.
  const resposta = { ok: true, msg: 'Se o email estiver autorizado, o código chega em instantes.', email: email.data };
  if (!permitido(email.data)) return resposta;

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false },
  });
  if (error) return { ok: false, msg: 'Não foi possível enviar o código agora. Espere um minuto e tente de novo.', email: email.data };
  return resposta;
}

const Codigo = z.object({ email: z.email(), codigo: z.string().regex(/^\d{6,10}$/) });

/** Confere o código na mesma aba (verifyOtp) e abre a sessão. */
export async function verificarCodigo(_: Estado, form: FormData): Promise<Estado> {
  const dados = Codigo.safeParse({
    email: form.get('email'),
    codigo: String(form.get('codigo') ?? '').replace(/\s/g, ''),
  });
  const invalido = { ok: false, msg: 'Código inválido ou expirado.', email: dados.data?.email };
  if (!dados.success || !permitido(dados.data.email)) return invalido;

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.verifyOtp({
    email: dados.data.email,
    token: dados.data.codigo,
    type: 'email',
  });
  if (error) return invalido;
  redirect('/');
}

/** Encerra a sessão. Ação de servidor (POST com verificação de origem), nunca um link GET. */
export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect('/entrar');
}
