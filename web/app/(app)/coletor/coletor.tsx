'use client';

import { CheckCircle2, CircleDashed, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BotoesColetor } from '@/components/app/botoes-coletor';
import { ItemLista, ListaItens } from '@/components/app/item-lista';
import { Secao } from '@/components/app/secao';
import { Badge } from '@/components/ui/badge';
import { dataCurta } from '@/lib/datas';

type Execucao = {
  id: number;
  nome: string;
  estado: string;
  conclusao: string | null;
  criadaEm: string;
  atualizadaEm: string;
  url: string;
};
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
      <Secao
        titulo="Executar agora"
        descricao="A varredura lê as vagas, a IA dá a nota e escreve os emails, e o relatório chega no seu email. Roda sozinha na segunda e na quinta; a descoberta atualiza a lista de empresas às segundas."
        className="lg:col-span-2"
      >
        <BotoesColetor aoDisparar={() => setTimeout(atualizar, 3000)} />
      </Secao>

      <Secao titulo="Execuções no GitHub">
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ListaItens vazio="Sem dados (verifique o GITHUB_TOKEN no Vercel).">
            {execucoes.map((e) => (
              <ItemLista
                key={e.id}
                acoes={
                  <>
                    <Estado e={e} />
                    <a href={e.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir no GitHub">
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </a>
                  </>
                }
              >
                <p className="font-medium">{e.nome.replace('coletor-', '')}</p>
                <p className="text-xs text-muted-foreground">{dataCurta(e.criadaEm)}</p>
              </ItemLista>
            ))}
          </ListaItens>
        )}
      </Secao>

      <Secao titulo="Por fonte">
        <ListaItens vazio="Ainda sem registros.">
          {historico.map((h) => (
            <ItemLista key={h.id} acoes={<span className="text-xs text-muted-foreground">{dataCurta(h.iniciada_em)}</span>}>
              <p className="font-medium">{h.fonte}</p>
              <p className="text-xs text-muted-foreground">
                {h.vagas_lidas} lidas · {h.vagas_novas} novas
              </p>
            </ItemLista>
          ))}
        </ListaItens>
      </Secao>
    </div>
  );
}
