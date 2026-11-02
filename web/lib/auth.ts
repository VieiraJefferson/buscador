import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { env } from '@/lib/env';
import { supabaseServidor } from '@/lib/supabase/server';

export type Usuario = { id: string; email: string };

/**
 * Sessão do pedido atual, conferida uma vez só (cache do React por pedido).
 *
 * getClaims() confere a assinatura do token localmente, com a chave pública ECC do projeto
 * (guardada em memória por 10 min). Não há chamada de rede por clique: o Supabase só é
 * consultado no login e na renovação do token. Nunca usar getSession() para autorizar.
 * Fonte: guia "Server-Side Auth for Next.js" do Supabase.
 */
const sessao = cache(async () => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === 'string' ? claims.email : '';
  const permitido = !!claims?.sub && email.toLowerCase() === env().EMAIL_PERMITIDO.toLowerCase();
  return { supabase, user: permitido ? ({ id: claims.sub, email } as Usuario) : null, temSessao: !!claims };
});

/** Exige sessão válida e o único email permitido. Usar em toda página e ação. */
export async function exigirUsuario() {
  const { supabase, user, temSessao } = await sessao();
  if (!user) {
    if (temSessao) await supabase.auth.signOut();
    redirect('/entrar');
  }
  return { supabase, user };
}

/** Para rotas de API: devolve null em vez de redirecionar. */
export async function usuarioDaApi() {
  const { supabase, user } = await sessao();
  return user ? { supabase, user } : null;
}
