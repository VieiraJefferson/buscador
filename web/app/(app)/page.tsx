import { CalendarClock, MessageSquareText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { BotoesColetor } from '@/components/app/botoes-coletor';
import { CartaoBento } from '@/components/app/cartao-bento';
import { Estatistica } from '@/components/app/estatistica';
import { ItemLista, ListaItens } from '@/components/app/item-lista';
import { Badge } from '@/components/ui/badge';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { exigirUsuario } from '@/lib/auth';
import { dataCurta } from '@/lib/datas';
import { rotas } from '@/lib/rotas';
import { PRIORIDADES } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

type Resumo = {
  novas_hoje: number;
  com_email: number;
  por_pais: Record<string, number>;
  candidaturas: Record<string, number>;
};

const CANDIDATURAS = [
  ['enviada', 'Enviadas'],
  ['respondida', 'Respondidas'],
  ['entrevista', 'Entrevistas'],
] as const;

export default async function Inicio() {
  const { supabase, user } = await exigirUsuario();

  // Contagens numa só chamada ao banco (função resumo_inicio, migration 0005).
  const [resumo, entrevistas, execucao] = await Promise.all([
    supabase.rpc('resumo_inicio'),
    supabase
      .from('entrevistas')
      .select('id, titulo, inicio')
      .eq('owner_id', user.id)
      .gte('inicio', new Date().toISOString())
      .order('inicio')
      .limit(3),
    supabase
      .from('execucoes')
      .select('iniciada_em, vagas_novas')
      .eq('owner_id', user.id)
      .order('iniciada_em', { ascending: false })
      .limit(1),
  ]);

  const r = (resumo.data ?? { novas_hoje: 0, com_email: 0, por_pais: {}, candidaturas: {} }) as Resumo;
  const ultima = execucao.data?.[0];

  return (
    <div>
      <p className="eyebrow mb-2">Hoje</p>
      <h1 className="mb-6 font-display text-3xl font-black tracking-tight md:mb-8 md:text-5xl">Olá, Jefferson.</h1>

      {/* Bento grid: 2 colunas no celular, 4 no computador */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <CartaoBento href={rotas.vagas({ estado: 'novas' })} destaque className="col-span-2 md:row-span-2">
          <Estatistica
            rotulo="Vagas novas hoje"
            valor={r.novas_hoje}
            detalhe={`${r.com_email} com email pronto para enviar`}
            tamanho="xl"
            invertido
          />
        </CartaoBento>

        {[1, 2, 3, 4].map((p, i) => (
          <CartaoBento key={p} href={rotas.vagas({ prioridade: String(p) })} atraso={80 * (i + 1)}>
            <Estatistica rotulo={PRIORIDADES[p]!} valor={r.por_pais[p] ?? 0} detalhe="a enviar" />
          </CartaoBento>
        ))}

        <CartaoBento className="col-span-2" atraso={100}>
          <CardTitle>Candidaturas</CardTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            {CANDIDATURAS.map(([estado, rotulo]) => (
              <Link
                key={estado}
                href={rotas.vagas({ estado })}
                className="rounded-lg bg-soft py-3 transition duration-200 hover:bg-elev"
              >
                <Estatistica rotulo={rotulo} valor={r.candidaturas[estado] ?? 0} tamanho="sm" />
              </Link>
            ))}
          </div>
        </CartaoBento>

        <CartaoBento className="col-span-2" atraso={160}>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-sea" />
            <CardTitle>Próximas entrevistas</CardTitle>
          </div>
          <ListaItens vazio="Nenhuma marcada.">
            {(entrevistas.data ?? []).map((e) => (
              <ItemLista key={e.id} acoes={<Badge variant="sea">{dataCurta(e.inicio)}</Badge>}>
                <span className="truncate font-medium">{e.titulo}</span>
              </ItemLista>
            ))}
          </ListaItens>
        </CartaoBento>

        <CartaoBento className="col-span-2" atraso={220}>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-sea" />
              <CardTitle>Coletor</CardTitle>
            </div>
            <CardDescription className="mt-1">
              {ultima
                ? `Última execução: ${dataCurta(ultima.iniciada_em)} · ${ultima.vagas_novas} novas`
                : 'Ainda sem execuções registradas.'}
            </CardDescription>
          </div>
          <BotoesColetor compacto />
        </CartaoBento>

        <CartaoBento href={rotas.assistente()} className="col-span-2" atraso={280}>
          <div className="flex items-center justify-between gap-4 pr-8">
            <div>
              <CardTitle>Recebeu uma resposta?</CardTitle>
              <CardDescription>Cole o email da empresa e receba a resposta pronta.</CardDescription>
            </div>
            <MessageSquareText className="size-8 shrink-0 text-sea" />
          </div>
        </CartaoBento>
      </div>
    </div>
  );
}
