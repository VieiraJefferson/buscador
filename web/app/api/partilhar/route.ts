import { NextResponse } from 'next/server';
import { usuarioDaApi } from '@/lib/auth';

/** Destino do "Partilhar → Buscador" (Android). O texto chega por POST e segue para o
 *  Assistente no fragmento (#), que o navegador nunca envia ao servidor: não fica em logs. */
export async function POST(request: Request) {
  if (!(await usuarioDaApi())) return NextResponse.redirect(new URL('/entrar', request.url), 303);
  const form = await request.formData().catch(() => null);
  const texto = [form?.get('titulo'), form?.get('texto')]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join('\n\n')
    .slice(0, 20000);
  return NextResponse.redirect(new URL(`/assistente#t=${encodeURIComponent(texto)}`, request.url), 303);
}
