'use client';

import { Ban, CalendarCheck, ClipboardPaste, Copy, Loader2, Save, Sparkles } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Campo } from '@/components/app/campo';
import { CampoSelect } from '@/components/app/campo-select';
import { Magnetico } from '@/components/app/movimento/magnetico';
import { Revelar } from '@/components/app/movimento/revelar';
import { Secao } from '@/components/app/secao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { aplicarRecusa, criarEntrevista } from '../agenda/actions';
import { guardarResposta } from '../vagas/actions';

type Opcao = { vagaId: string; rotulo: string; empresa: string };
type Horario = { inicio: string; fim: string; rotulo: string };
type Resultado = {
  classificacao: { tipo: string; resumo: string; empresa: string; idioma: string };
  resposta: string | null;
  horarios: Horario[];
};

const TIPOS: Record<string, { rotulo: string; variante: 'sea' | 'warning' | 'soft' }> = {
  recusa: { rotulo: 'Recusa', variante: 'warning' },
  convite_entrevista: { rotulo: 'Convite para entrevista', variante: 'sea' },
  pedido_informacao: { rotulo: 'Pedido de informação', variante: 'soft' },
  outro: { rotulo: 'Outro', variante: 'soft' },
};
const NENHUMA = 'nenhuma';

function textoPartilhado(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.hash.match(/^#t=(.*)$/s);
  try {
    return m?.[1] ? decodeURIComponent(m[1]) : '';
  } catch {
    return '';
  }
}

export function Assistente({ opcoes, vagaInicial }: { opcoes: Opcao[]; vagaInicial: string | null }) {
  // Texto vindo do "Partilhar → Buscador" (/api/partilhar) chega no fragmento do URL.
  const [texto, setTexto] = useState(textoPartilhado);
  useEffect(() => {
    if (window.location.hash.startsWith('#t=')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);
  const [vagaId, setVagaId] = useState<string>(vagaInicial ?? NENHUMA);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [resposta, setResposta] = useState('');
  const [horario, setHorario] = useState<Horario | null>(null);
  const [link, setLink] = useState('');
  const [pendente, iniciar] = useTransition();
  const vaga = opcoes.find((o) => o.vagaId === vagaId) ?? null;

  async function colar() {
    try {
      setTexto(await navigator.clipboard.readText());
    } catch {
      toast.error('O navegador não deixou ler a área de transferência. Cole com Ctrl+V.');
    }
  }

  async function analisar() {
    setAnalisando(true);
    setResultado(null);
    try {
      const r = await fetch('/api/resposta-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, vagaId: vaga?.vagaId }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro ?? 'erro');
      setResultado(dados);
      setResposta(dados.resposta ?? '');
      setHorario(dados.horarios?.[0] ?? null);
      // Sem vaga escolhida: tenta associar pelo nome da empresa que escreveu
      if (!vaga && dados.classificacao.empresa) {
        const nome = dados.classificacao.empresa.toLowerCase();
        const achada = opcoes.find((o) => o.empresa && nome.includes(o.empresa.toLowerCase()));
        if (achada) setVagaId(achada.vagaId);
      }
    } catch (e) {
      toast.error(`Não foi possível analisar: ${(e as Error).message}`);
    } finally {
      setAnalisando(false);
    }
  }

  const executar = (fn: () => Promise<void>, ok: string) =>
    iniciar(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch {
        toast.error('Não foi possível concluir.');
      }
    });

  const tipo = resultado ? TIPOS[resultado.classificacao.tipo] ?? TIPOS.outro! : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Secao titulo="Email da empresa" descricao="O email colado não é guardado.">
        <Campo rotulo="Vaga relacionada">
          <CampoSelect
            rotulo="Vaga relacionada"
            valor={vagaId}
            aoMudar={setVagaId}
            placeholder="Escolha a candidatura"
            opcoes={[{ valor: NENHUMA, rotulo: 'Não sei / nenhuma' }, ...opcoes.map((o) => ({ valor: o.vagaId, rotulo: o.rotulo }))]}
          />
        </Campo>
        <Campo
          rotulo="Texto recebido"
          htmlFor="email-empresa"
          acao={
            <Button size="sm" variant="soft" onClick={colar}>
              <ClipboardPaste />
              Colar
            </Button>
          }
        >
          <Textarea
            id="email-empresa"
            suppressHydrationWarning
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole aqui o email que a empresa enviou."
            className="min-h-56"
            data-lenis-prevent
          />
        </Campo>
        <Magnetico className="flex">
          <Button size="lg" className="w-full" onClick={analisar} disabled={analisando || texto.trim().length < 20}>
            {analisando ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {analisando ? 'Analisando…' : 'Analisar e responder'}
          </Button>
        </Magnetico>
      </Secao>

      {resultado && tipo && (
        <Revelar>
          <Secao titulo="Análise" descricao={resultado.classificacao.resumo} acao={<Badge variant={tipo.variante}>{tipo.rotulo}</Badge>}>
            {resultado.classificacao.tipo === 'recusa' && (
              <div className="rounded-lg bg-soft p-4">
                <p className="text-sm">
                  Marcar a candidatura como <b>recusada</b> e <b>bloquear a empresa</b> para ela não voltar nas buscas?
                </p>
                <Button
                  className="mt-3"
                  disabled={!vaga || pendente}
                  onClick={() => vaga && executar(() => aplicarRecusa(vaga.vagaId), 'Recusa registrada e empresa bloqueada')}
                >
                  <Ban />
                  Aplicar
                </Button>
                {!vaga && <p className="mt-2 text-xs text-muted-foreground">Escolha a vaga relacionada primeiro.</p>}
              </div>
            )}

            {resultado.classificacao.tipo === 'convite_entrevista' && (
              <div className="flex flex-col gap-2 rounded-lg bg-soft p-4">
                <p className="font-display font-bold">Horários livres da sua agenda</p>
                {resultado.horarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário livre nos próximos 14 dias. Cadastre a sua disponibilidade na Agenda.
                  </p>
                ) : (
                  <>
                    {resultado.horarios.map((h) => (
                      <button
                        key={h.inicio}
                        type="button"
                        onClick={() => setHorario(h)}
                        aria-pressed={horario?.inicio === h.inicio}
                        className={cn(
                          'rounded-md border bg-background px-3 py-2 text-left text-sm transition duration-200',
                          horario?.inicio === h.inicio && 'border-sea ring-2 ring-sea/30',
                        )}
                      >
                        {h.rotulo}
                      </button>
                    ))}
                    <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link da chamada (opcional)" aria-label="Link da chamada" />
                    <Button
                      variant="sea"
                      disabled={!horario || pendente}
                      onClick={() =>
                        horario &&
                        executar(
                          () =>
                            criarEntrevista({
                              vagaId: vaga?.vagaId,
                              titulo: `Entrevista · ${vaga?.empresa || resultado.classificacao.empresa || 'empresa'}`,
                              inicio: horario.inicio,
                              fim: horario.fim,
                              link,
                            }),
                          'Entrevista marcada na agenda',
                        )
                      }
                    >
                      <CalendarCheck />
                      Confirmar quando a empresa aceitar
                    </Button>
                  </>
                )}
              </div>
            )}

            <Campo rotulo="Resposta sugerida (edite à vontade)" htmlFor="resposta">
              <Textarea id="resposta" value={resposta} onChange={(e) => setResposta(e.target.value)} className="min-h-56" data-lenis-prevent />
            </Campo>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(resposta);
                  toast.success('Resposta copiada');
                }}
                disabled={!resposta}
              >
                <Copy />
                Copiar
              </Button>
              <Button
                variant="outline"
                disabled={!vaga || !resposta || pendente}
                onClick={() => vaga && executar(() => guardarResposta(vaga.vagaId, resposta), 'Resposta guardada na candidatura')}
              >
                <Save />
                Guardar na candidatura
              </Button>
            </div>
          </Secao>
        </Revelar>
      )}
    </div>
  );
}
