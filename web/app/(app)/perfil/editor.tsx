'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { BarraAcoes } from '@/components/app/barra-acoes';
import { Campo } from '@/components/app/campo';
import { CampoSelect, opcoesDe } from '@/components/app/campo-select';
import { Magnetico } from '@/components/app/movimento/magnetico';
import { Secao } from '@/components/app/secao';
import { Tags } from '@/components/app/tags';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { salvarPerfil } from './actions';

type Perfil = Record<string, unknown>;
type Experiencia = { cargo?: string; empresa?: string; periodo?: string; local?: string; destaques?: string[] };
type Prioridade = { ordem: number; paises: string[]; regimes: string[] };

const NIVEIS = ['nativo', 'fluente', 'avancado', 'intermediario', 'basico'];
const REGIMES = ['remoto', 'hibrido', 'presencial'];
const ROTULOS = {
  nome: 'Nome',
  cargo: 'Cargo',
  portfolio: 'Portfólio',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  empresa: 'Empresa',
  periodo: 'Período',
  local: 'Local',
} as const;

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const lista = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
const linhas = (v: unknown) => lista(v).join('\n');
const deLinhas = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

export function EditorPerfil({ inicial }: { inicial: Perfil }) {
  const [p, setP] = useState<Perfil>(inicial);
  const [pendente, iniciar] = useTransition();
  const definir = (chave: string, valor: unknown) => setP((atual) => ({ ...atual, [chave]: valor }));

  const candidato = obj(p.candidato);
  const links = obj(candidato.links);
  const idiomas = obj(p.idiomas);
  const senioridade = obj(p.senioridade);
  const competencias = obj(p.competencias);
  const localidade = obj(p.localidade);
  const prioridades = (Array.isArray(localidade.prioridades) ? localidade.prioridades : []) as Prioridade[];
  const experiencia = (Array.isArray(p.experiencia) ? p.experiencia : []) as Experiencia[];

  const salvar = () =>
    iniciar(async () => {
      try {
        await salvarPerfil(p);
        toast.success('Perfil salvo. A próxima varredura já usa estes dados.');
      } catch {
        toast.error('Não foi possível salvar.');
      }
    });

  const mudarPrioridade = (i: number, parcial: Partial<Prioridade>) => {
    const n = [...prioridades];
    n[i] = { ...prioridades[i]!, ...parcial };
    definir('localidade', { ...localidade, prioridades: n });
  };

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-16">
      <Tabs defaultValue="identidade">
        <TabsList>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="vagas">Vagas que procuro</TabsTrigger>
          <TabsTrigger value="competencias">Competências</TabsTrigger>
          <TabsTrigger value="experiencia">Experiência</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-4 grid gap-4 md:grid-cols-2">
          <Secao titulo="Identidade" descricao="Telefone e morada não ficam aqui: nunca vão para os prompts.">
            {(['nome', 'cargo'] as const).map((c) => (
              <Campo key={c} rotulo={ROTULOS[c]} htmlFor={`perfil-${c}`}>
                <Input id={`perfil-${c}`} value={String(candidato[c] ?? '')} onChange={(e) => definir('candidato', { ...candidato, [c]: e.target.value })} />
              </Campo>
            ))}
            {(['portfolio', 'github', 'linkedin'] as const).map((c) => (
              <Campo key={c} rotulo={ROTULOS[c]} htmlFor={`perfil-${c}`}>
                <Input
                  id={`perfil-${c}`}
                  type="url"
                  value={String(links[c] ?? '')}
                  onChange={(e) => definir('candidato', { ...candidato, links: { ...links, [c]: e.target.value } })}
                />
              </Campo>
            ))}
          </Secao>

          <Secao titulo="Idiomas">
            {Object.entries(idiomas)
              .filter(([k]) => k !== 'exigencias_excluidas')
              .map(([nome, nivel]) => (
                <div key={nome} className="flex items-center gap-2">
                  <span className="flex-1 font-medium capitalize">{nome}</span>
                  <CampoSelect
                    rotulo={`Nível de ${nome}`}
                    valor={String(nivel)}
                    aoMudar={(v) => definir('idiomas', { ...idiomas, [nome]: v })}
                    opcoes={opcoesDe(NIVEIS)}
                    className="w-40"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover ${nome}`}
                    onClick={() => {
                      const { [nome]: _, ...resto } = idiomas;
                      definir('idiomas', resto);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            <NovoIdioma aoAdicionar={(nome) => definir('idiomas', { ...idiomas, [nome]: 'intermediario' })} />
            <Campo rotulo="Excluir vagas que exigem fluência em">
              <Tags
                valor={lista(idiomas.exigencias_excluidas)}
                aoMudar={(v) => definir('idiomas', { ...idiomas, exigencias_excluidas: v })}
                placeholder="alemao, holandes…"
              />
            </Campo>
          </Secao>
        </TabsContent>

        <TabsContent value="vagas" className="mt-4 grid gap-4 md:grid-cols-2">
          <Secao titulo="Títulos e níveis">
            <Campo rotulo="Títulos que procuro">
              <Tags valor={lista(p.titulos_alvo)} aoMudar={(v) => definir('titulos_alvo', v)} />
            </Campo>
            <Campo rotulo="Níveis incluídos">
              <Tags valor={lista(senioridade.incluir)} aoMudar={(v) => definir('senioridade', { ...senioridade, incluir: v })} />
            </Campo>
            <Campo rotulo="Níveis excluídos">
              <Tags valor={lista(senioridade.excluir)} aoMudar={(v) => definir('senioridade', { ...senioridade, excluir: v })} />
            </Campo>
          </Secao>

          <Secao titulo="Países e regime, por prioridade">
            {prioridades.map((pr, i) => (
              <div key={i} className="rounded-lg bg-soft p-3">
                <p className="eyebrow mb-2">Prioridade {pr.ordem}</p>
                <Tags
                  valor={pr.paises}
                  aoMudar={(v) => mudarPrioridade(i, { paises: v.map((x) => x.toUpperCase()) })}
                  placeholder="ES, NL, DE, PT ou UE_RESTANTE"
                />
                <div className="mt-2 flex gap-4">
                  {REGIMES.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={pr.regimes.includes(r)}
                        onCheckedChange={(c) => mudarPrioridade(i, { regimes: c ? [...pr.regimes, r] : pr.regimes.filter((x) => x !== r) })}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Campo rotulo="Países excluídos">
              <Tags
                valor={lista(localidade.excluir_paises)}
                aoMudar={(v) => definir('localidade', { ...localidade, excluir_paises: v.map((x) => x.toUpperCase()) })}
              />
            </Campo>
          </Secao>
        </TabsContent>

        <TabsContent value="competencias" className="mt-4 grid gap-4 md:grid-cols-2">
          {Object.entries(competencias).map(([area, itens]) => (
            <Secao key={area} titulo={area.replaceAll('_', ' ')} className="[&_h3]:capitalize">
              <Tags valor={lista(itens)} aoMudar={(v) => definir('competencias', { ...competencias, [area]: v })} />
            </Secao>
          ))}
        </TabsContent>

        <TabsContent value="experiencia" className="mt-4 flex flex-col gap-4">
          <Button variant="outline" onClick={() => definir('experiencia', [{ cargo: '', empresa: '', periodo: '', destaques: [] }, ...experiencia])}>
            <Plus />
            Adicionar experiência
          </Button>
          {experiencia.map((e, i) => {
            const mudar = (campo: keyof Experiencia, valor: unknown) => {
              const n = [...experiencia];
              n[i] = { ...e, [campo]: valor };
              definir('experiencia', n);
            };
            return (
              <Secao
                key={i}
                titulo={e.cargo || 'Nova experiência'}
                descricao={e.empresa}
                acao={
                  <Button size="icon" variant="ghost" aria-label="Remover experiência" onClick={() => definir('experiencia', experiencia.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                }
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {(['cargo', 'empresa', 'periodo', 'local'] as const).map((c) => (
                    <Campo key={c} rotulo={ROTULOS[c]} htmlFor={`exp-${i}-${c}`}>
                      <Input id={`exp-${i}-${c}`} value={String(e[c] ?? '')} onChange={(ev) => mudar(c, ev.target.value)} />
                    </Campo>
                  ))}
                  <Campo rotulo="Destaques (um por linha)" htmlFor={`exp-${i}-destaques`} className="md:col-span-2">
                    <Textarea id={`exp-${i}-destaques`} value={linhas(e.destaques)} onChange={(ev) => mudar('destaques', deLinhas(ev.target.value))} data-lenis-prevent />
                  </Campo>
                </div>
              </Secao>
            );
          })}
          <Secao titulo="Formação e cursos" descricao="Um por linha.">
            <Campo rotulo="Formação" htmlFor="formacao">
              <Textarea id="formacao" value={linhas(p.formacao)} onChange={(e) => definir('formacao', deLinhas(e.target.value))} data-lenis-prevent />
            </Campo>
            <Campo rotulo="Cursos" htmlFor="formacao-complementar">
              <Textarea
                id="formacao-complementar"
                value={linhas(p.formacao_complementar)}
                onChange={(e) => definir('formacao_complementar', deLinhas(e.target.value))}
                data-lenis-prevent
              />
            </Campo>
          </Secao>
        </TabsContent>
      </Tabs>

      <BarraAcoes>
        <span className="truncate text-sm text-muted-foreground">A próxima varredura usa estes dados.</span>
        <Magnetico>
          <Button onClick={salvar} disabled={pendente}>
            <Save />
            {pendente ? 'Salvando…' : 'Salvar perfil'}
          </Button>
        </Magnetico>
      </BarraAcoes>
    </div>
  );
}

function NovoIdioma({ aoAdicionar }: { aoAdicionar: (nome: string) => void }) {
  const [nome, setNome] = useState('');
  return (
    <div className="flex gap-2">
      <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Novo idioma" />
      <Button
        variant="soft"
        onClick={() => {
          if (nome.trim()) aoAdicionar(nome.trim().toLowerCase());
          setNome('');
        }}
      >
        <Plus />
        Adicionar
      </Button>
    </div>
  );
}
