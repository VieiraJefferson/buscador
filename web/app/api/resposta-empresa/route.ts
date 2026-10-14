import { NextResponse } from 'next/server';
import { z } from 'zod';
import { proximosHorarios } from '@/lib/agenda-dados';
import { usuarioDaApi } from '@/lib/auth';
import { classificar, dentroDoLimite, escreverResposta } from '@/lib/ia';
import { carregarPerfil } from '@/lib/perfil';

const Corpo = z.object({ texto: z.string().min(20).max(20000), vagaId: z.uuid().optional() });

/** Classifica o email da empresa (Haiku) e escreve a resposta (Opus). O email não é guardado. */
export async function POST(request: Request) {
  const sessao = await usuarioDaApi();
  if (!sessao) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  if (!dentroDoLimite()) return NextResponse.json({ erro: 'muitos pedidos, espere um minuto' }, { status: 429 });
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: 'texto inválido' }, { status: 400 });
  const { supabase, user } = sessao;

  try {
    const classificacao = await classificar(corpo.data.texto);
    if (!classificacao) return NextResponse.json({ erro: 'não foi possível analisar' }, { status: 422 });

    let vaga: { titulo: string; empresa: string } | null = null;
    if (corpo.data.vagaId) {
      const { data } = await supabase
        .from('vagas')
        .select('titulo, empresas(nome)')
        .eq('owner_id', user.id)
        .eq('id', corpo.data.vagaId)
        .maybeSingle();
      if (data) vaga = { titulo: data.titulo as string, empresa: (data.empresas as unknown as { nome: string } | null)?.nome ?? '' };
    }

    const horarios =
      classificacao.tipo === 'convite_entrevista'
        ? await proximosHorarios(supabase, user.id, classificacao.fuso_empresa, classificacao.idioma)
        : [];
    const { dados: perfil } = await carregarPerfil(supabase, user.id);
    // Contatos pessoais ficam fora do prompt.
    const { candidato, ...resto } = perfil as { candidato?: Record<string, unknown> };
    const perfilSeguro = { candidato: { nome: candidato?.nome, cargo: candidato?.cargo, links: candidato?.links }, ...resto };
    const resposta = await escreverResposta({
      email: corpo.data.texto,
      classificacao,
      perfil: perfilSeguro,
      vaga,
      horarios: horarios.map((h) => h.rotulo),
    });
    return NextResponse.json({ classificacao, resposta, horarios });
  } catch {
    return NextResponse.json({ erro: 'falha ao falar com a IA' }, { status: 502 });
  }
}
