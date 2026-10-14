import 'server-only';
import { z } from 'zod';

// Variáveis do servidor (Vercel). Os valores nunca vão para o navegador nem para os logs.
const Esquema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  EMAIL_PERMITIDO: z.email(),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  GITHUB_TOKEN: z.string().min(10).optional(),
  GITHUB_REPO: z.string().regex(/^[\w.-]+\/[\w.-]+$/).default('VieiraJefferson/buscador'),
  SITE_URL: z.url().optional(),
});

export type Env = z.infer<typeof Esquema>;

let cache: Env | null = null;

export function env(): Env {
  if (cache) return cache;
  const r = Esquema.safeParse(process.env);
  if (!r.success) {
    const nomes = r.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Variáveis de ambiente inválidas ou em falta: ${nomes}`);
  }
  cache = r.data;
  return cache;
}
