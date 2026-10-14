import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gerarIcs } from '@/lib/agenda';
import { usuarioDaApi } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await usuarioDaApi();
  if (!sessao) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ erro: 'id inválido' }, { status: 400 });
  const { data } = await sessao.supabase
    .from('entrevistas')
    .select('id, titulo, inicio, fim, link')
    .eq('owner_id', sessao.user.id)
    .eq('id', id.data)
    .maybeSingle();
  if (!data) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
  const ics = gerarIcs({ ...data, inicio: new Date(data.inicio), fim: new Date(data.fim) });
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="entrevista.ics"',
    },
  });
}
