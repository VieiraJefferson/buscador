import { type NextRequest, NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get('code');
  if (codigo) {
    const supabase = await supabaseServidor();
    await supabase.auth.exchangeCodeForSession(codigo);
  }
  return NextResponse.redirect(new URL('/', request.url));
}
