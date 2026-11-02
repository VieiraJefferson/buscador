import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { opcoesCookie } from './cookies';

export async function supabaseServidor() {
  const cookieStore = await cookies();
  const e = env();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, opcoesCookie(options)));
        } catch {
          // Chamado num Server Component: a sessão é renovada pelo proxy.ts.
        }
      },
    },
  });
}
