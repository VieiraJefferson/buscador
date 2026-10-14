'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { env } from '@/lib/env';
import { supabaseServidor } from '@/lib/supabase/server';

export async function enviarLink(_: unknown, form: FormData) {
  const email = z.email().safeParse(form.get('email'));
  // Resposta igual para qualquer email: não revela qual endereço é o permitido.
  const resposta = { ok: true, msg: 'Se o email estiver autorizado, o link chega em instantes.' };
  if (!email.success) return { ok: false, msg: 'Email inválido.' };
  if (email.data.toLowerCase() !== env().EMAIL_PERMITIDO.toLowerCase()) return resposta;

  const origem = env().SITE_URL ?? `https://${(await headers()).get('host')}`;
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origem}/auth/callback`, shouldCreateUser: false },
  });
  if (error) return { ok: false, msg: 'Não foi possível enviar o link agora. Tente de novo.' };
  return resposta;
}
