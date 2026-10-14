'use client';

import { CheckCircle2, CircleDashed, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BotoesColetor } from '@/components/app/botoes-coletor';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

type Execucao = {
  id: number;
  nome: string;
  estado: string;
  conclusao: string | null;
  criadaEm: string;
  atualizadaEm: string;
  url: string;
};
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'Europe/Lisbon', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function Estado({ e }: { e: Execucao }) {
  if (e.estado !== 'completed')
    return (
      <Badge variant="sea">
        {e.estado === 'queued' ? <CircleDashed className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
        {e.estado === 'queued' ? 'na fila' : 'a correr'}
      </Badge>
    );
  return e.conclusao === 'success' ? (
    <Badge variant="soft"><CheckCircle2 className="size-3 text-sea" />concluído</Badge>
  ) : (
    <Badge variant="warning"><XCircle className="size-3" />{e.conclusao ?? 'falhou'}</Badge>
  );
}

export function Coletor({
  historico,
}: {
  historico: { id: string; fonte: string; iniciada_em: string; vagas_lidas: number; vagas_novas: number }[];
}) {
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const atualizar = useCallback(async () => {
    try {
      const r = await fetch('/api/coletor', { cache: 'no-store' });
      const dados = await r.json();
      setExecucoes(dados.execucoes ?? []);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Atualiza a cada 10 s enquanto houver execução em andamento.
  useEffect(() => {
    void atualizar();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void atualizar();
    }, 10_000);
    return () => clearInterval(id);
  }, [atualizar]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-4 lg:col-span-2">
        <div>
          <CardTitle>Executar agora</CardTitle>
          <CardDescription>
            A varredura lê as vagas, a IA dá a nota e escreve os emails, e o relatório chega no seu email. A
            descoberta atualiza a lista de empresas (roda sozinha às segundas).
          </CardDescription>
        </div>
        <BotoesColetor aoDisparar={() => setTimeout(atualizar, 3000)} />
      </Card>

      <Card>
        <CardTitle>Execuções no GitHub</CardTitle>
        <ul className="mt-3 flex flex-col gap-2">
          {carregando && <li className="text-sm text-muted-foreground">Carregando…</li>}
          {!carregando && execucoes.length === 0 && (
            <li className="text-sm text-muted-foreground">Sem dados (verifique o GITHUB_TOKEN no Vercel).</li>
          )}
          {execucoes.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-soft px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{e.nome.replace('coletor-', '')}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.criadaEm)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Estado e={e} />
                <a href={e.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir no GitHub">
                  <ExternalLink className="size-4 text-muted-foreground" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Por fonte</CardTitle>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm">
          {historico.length === 0 && <li className="text-muted-foreground">Ainda sem registros.</li>}
          {historico.map((h) => (
            <li key={h.id} className="flex justify-between gap-2">
              <span>{h.fonte}</span>
              <span className="text-muted-foreground">
                {h.vagas_lidas} lidas · {h.vagas_novas} novas · {fmt(h.iniciada_em)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
