import 'server-only';
import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { supabaseServidor } from '@/lib/supabase/server';

/** Exige sessão válida (getUser valida o token no servidor do Supabase, nunca getSession)
 *  e que o email seja o único permitido. Usar em toda página, ação e rota. */
export async function exigirUsuario() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== env().EMAIL_PERMITIDO.toLowerCase()) {
    if (user) await supabase.auth.signOut();
    redirect('/entrar');
  }
  return { supabase, user };
}

/** Para rotas de API: devolve null em vez de redirecionar. */
export async function usuarioDaApi() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== env().EMAIL_PERMITIDO.toLowerCase()) return null;
  return { supabase, user };
}
