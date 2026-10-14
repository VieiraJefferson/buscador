'use client';

import { Ban, Copy, Mail, MessageSquareReply, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CampoSelect } from '@/components/app/campo-select';
import { Magnetico } from '@/components/app/movimento/magnetico';
import { Secao } from '@/components/app/secao';
import { Button } from '@/components/ui/button';
import { rotas } from '@/lib/rotas';
import { ESTADOS, type EstadoCandidatura } from '@/lib/tipos';
import { bloquearEmpresa, descartarVagas, marcarEstado } from '../actions';

type Props = {
  vagaId: string;
  empresaId: string | null;
  empresaBloqueada: boolean;
  estado: EstadoCandidatura;
  email: { assunto: string; corpo: string; para: string | null } | null;
};

// Links mailto muito longos falham em alguns apps: acima disto, o botão copia o texto.
const LIMITE_MAILTO = 1800;

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

  const mailto = email
    ? `mailto:${email.para ?? ''}?subject=${encodeURIComponent(email.assunto)}&body=${encodeURIComponent(email.corpo)}`
    : '';

  function abrirApp() {
    if (!email) return;
    if (mailto.length > LIMITE_MAILTO) {
      void copiar();
      toast.info('Texto longo: copiado. Cole no seu app de email.');
      return;
    }
    window.location.href = mailto;
    // Abrir no app normalmente significa que vai enviar: deixa um atalho para marcar.
    toast('Enviou?', { action: { label: 'Marcar enviada', onClick: () => executar(() => marcarEstado([vagaId], 'enviada'), 'Marcada como enviada') } });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <Secao
        titulo="Email de candidatura"
        descricao={
          email
            ? `Para: ${email.para ?? 'contato não encontrado (veja o anúncio)'}`
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
                  Abrir no app de email
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
        <CampoSelect
          rotulo="Estado da candidatura"
          valor={estadoAtual}
          aoMudar={(v) => {
            setEstadoAtual(v as EstadoCandidatura);
            executar(() => marcarEstado([vagaId], v), 'Estado atualizado');
          }}
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
                empresaBloqueada ? 'Empresa desbloqueada' : 'Empresa bloqueada: não volta nas buscas',
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
