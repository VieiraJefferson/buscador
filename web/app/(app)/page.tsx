import { ArrowUpRight, CalendarClock, MessageSquareText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { BotoesColetor } from '@/components/app/botoes-coletor';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { exigirUsuario } from '@/lib/auth';
import { PRIORIDADES } from '@/lib/tipos';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function inicioDoDia() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function Inicio() {
  const { supabase, user } = await exigirUsuario();
  const dono = user.id;

  const [novasHoje, ativas, candidaturas, entrevistas, execucao] = await Promise.all([
    supabase
      .from('vagas')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', dono)
      .eq('ativa', true)
      .eq('descartada', false)
      .gte('nota', 3)
      .gte('vista_primeira_em', inicioDoDia()),
    supabase
      .from('vagas')
      .select('prioridade_pais, nota, emails_gerados(id), candidaturas(estado)')
      .eq('owner_id', dono)
      .eq('ativa', true)
      .eq('descartada', false)
      .gte('nota', 3)
      .limit(2000),
    supabase.from('candidaturas').select('estado').eq('owner_id', dono),
    supabase
      .from('entrevistas')
      .select('id, titulo, inicio')
      .eq('owner_id', dono)
      .gte('inicio', new Date().toISOString())
      .order('inicio')
      .limit(3),
    supabase
      .from('execucoes')
      .select('fonte, iniciada_em, vagas_lidas, vagas_novas')
      .eq('owner_id', dono)
      .order('iniciada_em', { ascending: false })
      .limit(1),
  ]);

  const vagas = (ativas.data ?? []) as {
    prioridade_pais: number | null;
    nota: number | null;
    emails_gerados: { id: string }[];
    candidaturas: { estado: string }[];
  }[];
  const pendentes = vagas.filter((v) => !v.candidaturas.length || v.candidaturas[0]?.estado === 'a_enviar');
  const porPais = [1, 2, 3, 4].map((p) => ({
    p,
    total: pendentes.filter((v) => v.prioridade_pais === p).length,
  }));
  const comEmail = pendentes.filter((v) => v.emails_gerados.length).length;
  const contagem = (estado: string) => (candidaturas.data ?? []).filter((c) => c.estado === estado).length;
  const ultima = execucao.data?.[0];

  return (
    <div>
      <p className="eyebrow mb-2">Hoje</p>
      <h1 className="mb-6 font-display text-3xl font-black tracking-tight md:mb-8 md:text-5xl">
        Olá, Jefferson.
      </h1>

      {/* Bento grid: 2 colunas no celular, 4 no desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Link href="/vagas?estado=novas" className="col-span-2 md:row-span-2">
          <Card className="flex h-full flex-col justify-between bg-primary text-primary-foreground transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-white/60">Vagas novas hoje</span>
              <ArrowUpRight className="size-5 text-white/60" />
            </div>
            <div>
              <p className="font-display text-7xl font-black md:text-8xl">{novasHoje.count ?? 0}</p>
              <p className="mt-2 text-sm text-white/70">
                {comEmail} com email pronto para enviar
              </p>
            </div>
          </Card>
        </Link>

        {porPais.map(({ p, total }) => (
          <Link key={p} href={`/vagas?prioridade=${p}`}>
            <Card className="h-full transition hover:-translate-y-0.5">
              <CardDescription>{PRIORIDADES[p]}</CardDescription>
              <p className="mt-3 font-display text-4xl font-black">{total}</p>
              <p className="text-xs text-muted-foreground">a enviar</p>
            </Card>
          </Link>
        ))}

        <Card className="col-span-2">
          <CardTitle>Candidaturas</CardTitle>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['enviada', 'Enviadas'],
              ['respondida', 'Respondidas'],
              ['entrevista', 'Entrevistas'],
            ].map(([estado, rotulo]) => (
              <Link key={estado} href={`/vagas?estado=${estado}`} className="rounded-lg bg-soft py-3 hover:bg-elev">
                <p className="font-display text-2xl font-black">{contagem(estado!)}</p>
                <p className="text-xs text-muted-foreground">{rotulo}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="col-span-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-sea" />
            <CardTitle>Próximas entrevistas</CardTitle>
          </div>
          <ul className="mt-3 space-y-2">
            {(entrevistas.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhuma marcada.</li>
            )}
            {(entrevistas.data ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{e.titulo}</span>
                <Badge variant="sea">
                  {new Intl.DateTimeFormat('pt-BR', {
                    timeZone: 'Europe/Lisbon',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(e.inicio))}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-sea" />
            <CardTitle>Coletor</CardTitle>
          </div>
          <CardDescription className="mt-1">
            {ultima
              ? `Última execução: ${new Date(ultima.iniciada_em).toLocaleString('pt-BR', { timeZone: 'Europe/Lisbon' })} · ${ultima.vagas_novas} novas`
              : 'Ainda sem execuções registradas.'}
          </CardDescription>
          <div className="mt-4">
            <BotoesColetor compacto />
          </div>
        </Card>

        <Link href="/assistente" className="col-span-2">
          <Card
            className={cn(
              'flex h-full items-center justify-between gap-4 transition hover:-translate-y-0.5',
            )}
          >
            <div>
              <CardTitle>Recebeu uma resposta?</CardTitle>
              <CardDescription>Cole o email da empresa e receba a resposta pronta.</CardDescription>
            </div>
            <MessageSquareText className="size-8 shrink-0 text-sea" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
