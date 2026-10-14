import 'server-only';
import { env } from '@/lib/env';

// Disparo do coletor pelo site (ADR-0003). O token é fine-grained: só o repositório buscador,
// só permissão de Actions. Fica no servidor (Vercel) e nunca vai para o navegador.

export const WORKFLOWS = {
  varrer: 'coletor-varrer.yml',
  descobrir: 'coletor-descobrir.yml',
} as const;
export type Workflow = keyof typeof WORKFLOWS;

export type Execucao = {
  id: number;
  nome: string;
  estado: string; // queued | in_progress | completed
  conclusao: string | null; // success | failure | cancelled | null
  criadaEm: string;
  atualizadaEm: string;
  url: string;
};

async function api(caminho: string, init?: RequestInit) {
  const token = env().GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN ausente');
  return fetch(`https://api.github.com/repos/${env().GITHUB_REPO}${caminho}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
    cache: 'no-store',
  });
}

export async function dispararWorkflow(w: Workflow): Promise<boolean> {
  const r = await api(`/actions/workflows/${WORKFLOWS[w]}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  });
  return r.status === 204;
}

export async function ultimasExecucoes(): Promise<Execucao[]> {
  const r = await api('/actions/runs?per_page=12');
  if (!r.ok) return [];
  const dados = (await r.json()) as {
    workflow_runs: {
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      created_at: string;
      updated_at: string;
      html_url: string;
    }[];
  };
  return dados.workflow_runs
    .filter((x) => x.name.startsWith('coletor-'))
    .map((x) => ({
      id: x.id,
      nome: x.name,
      estado: x.status,
      conclusao: x.conclusion,
      criadaEm: x.created_at,
      atualizadaEm: x.updated_at,
      url: x.html_url,
    }));
}
