import { z } from 'zod';

// Esquema da classificação do email da empresa (saída estruturada do Haiku, lib/ia.ts).
// Fica fora de lib/ia.ts, que é server-only, para poder ser testado.

export const TIPOS_RESPOSTA = ['recusa', 'convite_entrevista', 'pedido_informacao', 'nao_contatar', 'outro'] as const;

export const Classificacao = z.object({
  tipo: z.enum(TIPOS_RESPOSTA),
  resumo: z.string().describe('Uma frase em português do Brasil'),
  empresa: z.string().describe('Nome da empresa que escreveu, se aparecer; senão vazio'),
  idioma: z.enum(['en', 'es', 'pt', 'de', 'nl', 'fr', 'outro']),
  fuso_empresa: z
    .string()
    .describe('Fuso IANA da empresa se for possível inferir (ex.: Europe/Madrid); senão vazio'),
});
export type Classificacao = z.infer<typeof Classificacao>;
