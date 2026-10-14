'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tags } from '@/components/app/tags';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { salvarPerfil } from './actions';

type Perfil = Record<string, unknown>;
type Experiencia = { cargo?: string; empresa?: string; periodo?: string; local?: string; destaques?: string[] };
type Prioridade = { ordem: number; paises: string[]; regimes: string[] };

const NIVEIS = ['nativo', 'fluente', 'avancado', 'intermediario', 'basico'];
const REGIMES = ['remoto', 'hibrido', 'presencial'];

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

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="identidade">
        <TabsList>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="vagas">Vagas que procuro</TabsTrigger>
          <TabsTrigger value="competencias">Competências</TabsTrigger>
          <TabsTrigger value="experiencia">Experiência</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <CardTitle>Identidade</CardTitle>
            {(['nome', 'cargo'] as const).map((c) => (
              <div key={c} className="flex flex-col gap-1.5">
                <Label className="capitalize">{c}</Label>
                <Input value={String(candidato[c] ?? '')} onChange={(e) => definir('candidato', { ...candidato, [c]: e.target.value })} />
              </div>
            ))}
            {(['portfolio', 'github', 'linkedin'] as const).map((c) => (
              <div key={c} className="flex flex-col gap-1.5">
                <Label className="capitalize">{c}</Label>
                <Input
                  type="url"
                  value={String(links[c] ?? '')}
                  onChange={(e) => definir('candidato', { ...candidato, links: { ...links, [c]: e.target.value } })}
                />
              </div>
            ))}
            <CardDescription>Telefone e morada não ficam aqui: nunca vão para os prompts.</CardDescription>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardTitle>Idiomas</CardTitle>
            {Object.entries(idiomas)
              .filter(([k]) => k !== 'exigencias_excluidas')
              .map(([nome, nivel]) => (
                <div key={nome} className="flex items-center gap-2">
                  <Input value={nome} readOnly className="flex-1 capitalize" />
                  <Select value={String(nivel)} onValueChange={(v) => definir('idiomas', { ...idiomas, [nome]: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
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
            <Label className="mt-2">Excluir vagas que exigem fluência em</Label>
            <Tags
              valor={lista(idiomas.exigencias_excluidas)}
              aoMudar={(v) => definir('idiomas', { ...idiomas, exigencias_excluidas: v })}
              placeholder="alemao, holandes…"
            />
          </Card>
        </TabsContent>

        <TabsContent value="vagas" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <CardTitle>Títulos e níveis</CardTitle>
            <Label>Títulos que procuro</Label>
            <Tags valor={lista(p.titulos_alvo)} aoMudar={(v) => definir('titulos_alvo', v)} />
            <Label>Níveis incluídos</Label>
            <Tags valor={lista(senioridade.incluir)} aoMudar={(v) => definir('senioridade', { ...senioridade, incluir: v })} />
            <Label>Níveis excluídos</Label>
            <Tags valor={lista(senioridade.excluir)} aoMudar={(v) => definir('senioridade', { ...senioridade, excluir: v })} />
          </Card>

          <Card className="flex flex-col gap-3">
            <CardTitle>Países e regime, por prioridade</CardTitle>
            {prioridades.map((pr, i) => (
              <div key={i} className="rounded-lg bg-soft p-3">
                <p className="eyebrow mb-2">Prioridade {pr.ordem}</p>
                <Tags
                  valor={pr.paises}
                  aoMudar={(v) => {
                    const n = [...prioridades];
                    n[i] = { ...pr, paises: v.map((x) => x.toUpperCase()) };
                    definir('localidade', { ...localidade, prioridades: n });
                  }}
                  placeholder="ES, NL, DE, PT ou UE_RESTANTE"
                />
                <div className="mt-2 flex gap-4">
                  {REGIMES.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={pr.regimes.includes(r)}
                        onCheckedChange={(c) => {
                          const n = [...prioridades];
                          n[i] = { ...pr, regimes: c ? [...pr.regimes, r] : pr.regimes.filter((x) => x !== r) };
                          definir('localidade', { ...localidade, prioridades: n });
                        }}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Label>Países excluídos</Label>
            <Tags
              valor={lista(localidade.excluir_paises)}
              aoMudar={(v) => definir('localidade', { ...localidade, excluir_paises: v.map((x) => x.toUpperCase()) })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="competencias" className="mt-4 grid gap-4 md:grid-cols-2">
          {Object.entries(competencias).map(([area, itens]) => (
            <Card key={area} className="flex flex-col gap-2">
              <CardTitle className="capitalize">{area.replaceAll('_', ' ')}</CardTitle>
              <Tags valor={lista(itens)} aoMudar={(v) => definir('competencias', { ...competencias, [area]: v })} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="experiencia" className="mt-4 flex flex-col gap-4">
          {experiencia.map((e, i) => {
            const mudar = (campo: keyof Experiencia, valor: unknown) => {
              const n = [...experiencia];
              n[i] = { ...e, [campo]: valor };
              definir('experiencia', n);
            };
            return (
              <Card key={i} className="grid gap-3 md:grid-cols-2">
                {(['cargo', 'empresa', 'periodo', 'local'] as const).map((c) => (
                  <div key={c} className="flex flex-col gap-1.5">
                    <Label className="capitalize">{c}</Label>
                    <Input value={String(e[c] ?? '')} onChange={(ev) => mudar(c, ev.target.value)} />
                  </div>
                ))}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label>Destaques (um por linha)</Label>
                  <Textarea value={linhas(e.destaques)} onChange={(ev) => mudar('destaques', deLinhas(ev.target.value))} />
                </div>
                <Button
                  variant="ghost"
                  className="justify-self-start"
                  onClick={() => definir('experiencia', experiencia.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                  Remover experiência
                </Button>
              </Card>
            );
          })}
          <Button variant="outline" onClick={() => definir('experiencia', [{ cargo: '', empresa: '', periodo: '', destaques: [] }, ...experiencia])}>
            <Plus />
            Adicionar experiência
          </Button>
          <Card className="flex flex-col gap-2">
            <CardTitle>Formação e cursos (um por linha)</CardTitle>
            <Textarea value={linhas(p.formacao)} onChange={(e) => definir('formacao', deLinhas(e.target.value))} />
            <Textarea
              value={linhas(p.formacao_complementar)}
              onChange={(e) => definir('formacao_complementar', deLinhas(e.target.value))}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 flex justify-end md:bottom-6">
        <Button size="lg" onClick={salvar} disabled={pendente} className="shadow-card">
          <Save />
          {pendente ? 'Salvando…' : 'Salvar perfil'}
        </Button>
      </div>
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
