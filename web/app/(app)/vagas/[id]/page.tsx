import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Secao } from '@/components/app/secao';
import { BadgeNota, BadgesVaga } from '@/components/app/vaga/badges-vaga';
import { exigirUsuario } from '@/lib/auth';
import { rotas } from '@/lib/rotas';
import type { EstadoCandidatura, Regime } from '@/lib/tipos';
import { localDaVaga, nomePrioridade } from '@/lib/vaga';
import { AcoesVaga } from './acoes';

export const dynamic = 'force-dynamic';

export default async function VagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, user } = await exigirUsuario();

  const { data: v } = await supabase
    .from('vagas')
    .select(
      'id, titulo, url, descricao, pais, cidade, regime, prioridade_pais, nota, nota_justificativa, consultoria, empresa_id, empresas(id, nome, bloqueada, dominio), emails_gerados(id, assunto, corpo, idioma, gerado_em, contatos(email)), candidaturas(estado, resposta_sugerida)',
    )
    .eq('owner_id', user.id)
    .eq('id', id)
    .maybeSingle();
  if (!v) notFound();

  const empresa = v.empresas as unknown as { id: string; nome: string; bloqueada: boolean; dominio: string | null } | null;
  const emails = (v.emails_gerados ?? []) as unknown as {
    id: string;
    assunto: string;
    corpo: string;
    idioma: string;
    gerado_em: string;
    contatos: { email: string } | null;
  }[];
  const email = emails.sort((a, b) => b.gerado_em.localeCompare(a.gerado_em))[0] ?? null;
  const candidatura = (v.candidaturas as unknown as { estado: EstadoCandidatura; resposta_sugerida: string | null }[])[0];

  return (
    <div className="flex flex-col gap-4">
      <Link href={rotas.vagas()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Vagas
      </Link>

      <header>
        <p className="eyebrow mb-2">{nomePrioridade(v.prioridade_pais)}</p>
        <h1 className="font-display text-2xl font-black tracking-tight md:text-4xl">{v.titulo}</h1>
        <p className="mt-1 text-muted-foreground">
          {empresa?.nome} · {localDaVaga(v.cidade, v.pais)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <BadgeNota nota={v.nota} />
          <BadgesVaga regime={v.regime as Regime} consultoria={v.consultoria} bloqueada={empresa?.bloqueada} />
        </div>
        {v.nota_justificativa && <p className="mt-3 text-sm text-ink-dim">{v.nota_justificativa}</p>}
      </header>

      <AcoesVaga
        vagaId={v.id}
        empresaId={empresa?.id ?? null}
        empresaBloqueada={empresa?.bloqueada ?? false}
        estado={candidatura?.estado ?? 'a_enviar'}
        email={email ? { assunto: email.assunto, corpo: email.corpo, para: email.contatos?.email ?? null } : null}
      />

      {candidatura?.resposta_sugerida && (
        <Secao titulo="Resposta guardada">
          <p className="text-sm whitespace-pre-wrap text-ink-dim">{candidatura.resposta_sugerida}</p>
        </Secao>
      )}

      <Secao
        titulo="Descrição"
        acao={
          <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-sm text-sea">
            Ver anúncio
            <ExternalLink className="size-3.5" />
          </a>
        }
      >
        <p className="max-h-[60svh] overflow-y-auto text-sm whitespace-pre-wrap text-ink-dim" data-lenis-prevent>
          {v.descricao || 'Sem descrição na fonte.'}
        </p>
      </Secao>
    </div>
  );
}
