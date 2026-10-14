import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioDaApi } from '@/lib/auth';
import { dispararWorkflow, ultimasExecucoes } from '@/lib/github';

/** GET: últimas execuções do coletor. POST: dispara varrer ou descobrir (ADR-0003). */
export async function GET() {
  if (!(await usuarioDaApi())) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  try {
    return NextResponse.json({ execucoes: await ultimasExecucoes() });
  } catch {
    return NextResponse.json({ execucoes: [], erro: 'GitHub indisponível' }, { status: 502 });
  }
}

const Corpo = z.object({ workflow: z.enum(['varrer', 'descobrir']) });

export async function POST(request: Request) {
  if (!(await usuarioDaApi())) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: 'workflow inválido' }, { status: 400 });
  try {
    const ok = await dispararWorkflow(corpo.data.workflow);
    return ok
      ? NextResponse.json({ ok: true }, { status: 202 })
      : NextResponse.json({ erro: 'o GitHub recusou o pedido' }, { status: 502 });
  } catch {
    return NextResponse.json({ erro: 'GitHub indisponível' }, { status: 502 });
  }
}
