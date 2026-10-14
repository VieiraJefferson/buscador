import type { CookieOptions } from '@supabase/ssr';

/** O token da sessão nunca é lido pelo JavaScript da página: só o servidor do site o usa
 *  (o site não tem cliente Supabase no navegador). */
export const opcoesCookie = (o: CookieOptions = {}): CookieOptions => ({
  ...o,
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
});
