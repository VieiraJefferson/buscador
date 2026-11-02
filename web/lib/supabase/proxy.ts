import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { opcoesCookie } from './cookies';

const PUBLICAS = ['/entrar', '/auth/', '/manifest.webmanifest', '/icon'];

/** Renova a sessão e manda para /entrar quem não está autenticado. getClaims() confere a
 *  assinatura localmente (chave ECC em memória), sem chamada de rede por clique; o email
 *  permitido é conferido em lib/auth.ts, uma vez por pedido. */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, opcoesCookie(options)));
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  if (!data?.claims && !PUBLICAS.some((p) => caminho.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return resposta;
}
