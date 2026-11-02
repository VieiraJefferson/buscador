'use client';

import { Ban, Copy, Mail, MessageSquareReply, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CampoSelect } from '@/components/app/campo-select';
import { CaixaEnviada } from '@/components/app/vaga/caixa-enviada';
import { Magnetico } from '@/components/app/movimento/magnetico';
import { Secao } from '@/components/app/secao';
import { Button } from '@/components/ui/button';
import { ehCelular, linkGmail, linkMailto } from '@/lib/email-link';
import { rotas } from '@/lib/rotas';
import { ESTADOS, type EstadoCandidatura } from '@/lib/tipos';
import { bloquearEmpresa, descartarVagas, marcarEstado } from '../actions';

type Props = {
  vagaId: string;
  empresaId: string | null;
  empresaBloqueada: boolean;
  estado: EstadoCandidatura;
  email: { assunto: string; corpo: string; para: string | null; quem: string | null } | null;
};

export function AcoesVaga({ vagaId, empresaId, empresaBloqueada, estado, email }: Props) {
  const [pendente, iniciar] = useTransition();
  const [estadoAtual, setEstadoAtual] = useState(estado);

  const executar = (fn: () => Promise<void>, ok: string) =>
    iniciar(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch {
        toast.error('Não foi possível concluir.');
      }
    });

  async function copiar() {
    if (!email) return;
    await navigator.clipboard.writeText(`${email.assunto}\n\n${email.corpo}`);
    toast.success('Email copiado');
  }

  const mudarEstado = (v: EstadoCandidatura, ok: string) => {
    setEstadoAtual(v);
    executar(() => marcarEstado([vagaId], v), ok);
  };

  function abrirApp() {
    if (!email) return;
    // Rede de segurança: o texto também vai para a área de transferência. A cópia começa antes
    // de abrir o Gmail, enquanto a página ainda tem o foco.
    navigator.clipboard?.writeText(`${email.assunto}\n\n${email.corpo}`).catch(() => {});
    if (ehCelular(navigator.userAgent)) {
      window.location.href = linkMailto(email);
    } else {
      // Síncrono, dentro do clique: senão o bloqueador de pop-ups barra a aba nova.
      window.open(linkGmail(email), '_blank', 'noopener,noreferrer');
    }
    // Abrir normalmente significa que vai enviar: deixa um atalho para marcar.
    if (estadoAtual === 'a_enviar') {
      toast('Enviou?', {
        duration: 15000,
        action: { label: 'Marcar enviada', onClick: () => mudarEstado('enviada', 'Marcada como enviada') },
      });
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <Secao
        titulo="Email de candidatura"
        descricao={
          email
            ? `Para: ${email.para ?? 'contato não encontrado (veja o anúncio)'}${email.para && email.quem ? ` (${email.quem})` : ''}`
            : 'Ainda sem email gerado. A IA escreve os emails das vagas com nota 4 ou 5 na próxima varredura.'
        }
      >
        {email && (
          <>
            <div>
              <p className="font-semibold">{email.assunto}</p>
              <p className="mt-2 text-sm whitespace-pre-wrap text-ink-dim">{email.corpo}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Magnetico>
                <Button onClick={abrirApp} size="lg">
                  <Mail />
                  Abrir no Gmail
                </Button>
              </Magnetico>
              <Button onClick={copiar} variant="outline" size="lg">
                <Copy />
                Copiar
              </Button>
            </div>
          </>
        )}
      </Secao>

      <Secao titulo="Candidatura">
        <CaixaEnviada
          estado={estadoAtual}
          disabled={pendente}
          aoMudar={(v) => mudarEstado(v, v === 'enviada' ? 'Marcada como enviada' : 'Voltou para a enviar')}
        />
        <CampoSelect
          rotulo="Estado da candidatura"
          valor={estadoAtual}
          aoMudar={(v) => mudarEstado(v as EstadoCandidatura, 'Estado atualizado')}
          opcoes={ESTADOS.map((e) => ({ valor: e.valor, rotulo: e.rotulo }))}
          disabled={pendente}
        />
        <Button asChild variant="sea">
          <Link href={rotas.assistente(vagaId)}>
            <MessageSquareReply />
            Colar resposta da empresa
          </Link>
        </Button>
        <Button variant="soft" disabled={pendente} onClick={() => executar(() => descartarVagas([vagaId]), 'Vaga descartada')}>
          <Trash2 />
          Descartar vaga
        </Button>
        {empresaId && (
          <Button
            variant="ghost"
            disabled={pendente}
            onClick={() =>
              executar(
                () => bloquearEmpresa(empresaId, !empresaBloqueada),
                empresaBloqueada ? 'Empresa desbloqueada' : 'Empresa bloqueada e contatos apagados',
              )
            }
          >
            <Ban />
            {empresaBloqueada ? 'Desbloquear empresa' : 'Bloquear empresa'}
          </Button>
        )}
      </Secao>
    </div>
  );
}
