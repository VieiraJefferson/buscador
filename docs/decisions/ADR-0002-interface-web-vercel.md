# ADR-0002: Interface web no Vercel e banco compartilhado no Supabase

**Status:** Aceito
**Data:** 2026-10-12
**Decisor:** Jefferson Vieira
**Altera:** [ADR-0001](ADR-0001-arquitetura-buscador-vagas.md), seção 7 (interface do
assistente) e seção 8 (estado entre execuções)

---

## Resumo não-técnico

O buscador ganha um **site próprio, só do Jefferson**, publicado no Vercel e pensado para o
celular. Pelo site ele:

1. vê as vagas do dia, ordenadas por país e por nota de compatibilidade;
2. abre o email de candidatura já pronto de cada vaga. Um botão abre o app de email do
   celular com destinatário, assunto e texto preenchidos, e ele revisa e envia;
3. marca a vaga como "enviada", para acompanhar o que já fez;
4. cola o email de um recrutador e recebe a resposta ideal, pronta para copiar e enviar.

O visual é o do portfólio dele: mesmas cores, tipografia e rolagem suave.

O email diário continua chegando no email pessoal do Jefferson (via Resend, ADR-0001), agora
com um link para o site.

Para o site e a varredura diária enxergarem os mesmos dados, as vagas passam a ficar num
banco na nuvem (Supabase, na Europa), protegido por login.

---

## Contexto

- O ADR-0001 deixou a interface do assistente de resposta em aberto, com a proposta de um
  comando no Claude Code.
- O Jefferson quer fazer **toda a interação pelo celular**. Por isso escolheu uma interface
  web em Next.js e React, publicada no Vercel.
- No ADR-0001, o estado das vagas ficava num SQLite guardado no cache do GitHub Actions. Esse
  arquivo **não é acessível a partir do Vercel**. Coletor e site precisam de um banco
  compartilhado.
- O portfólio do Jefferson (`Projetos/Portifolio`, Vite + React) já tem um sistema visual
  definido, e ele pediu para reaproveitá-lo.

---

## Decisão

### 1. Arquitetura

```
GitHub Actions (diário)                 Vercel (sob demanda)
┌──────────────────────┐               ┌──────────────────────────┐
│ coletor/ (Python)    │               │ web/ (Next.js)           │
│ coleta → filtra →    │   escreve     │ login → vagas → email    │
│ pontua → gera email  │ ───────────►  │ pronto → assistente      │
│ (Haiku e Sonnet 5.5) │   Supabase    │ (Claude Opus 5.5,        │
│ relatório por email  │   (UE)        │  só no servidor)         │
└──────────────────────┘ ◄─────────────└──────────────────────────┘
                                lê / marca enviada
```

| Peça | Responsabilidade |
|---|---|
| `coletor/` | O que o ADR-0001 define (coleta, filtros, pontuação, geração do email, relatório). Grava o resultado no Supabase em vez de num SQLite local. |
| Supabase (região UE, **Irlanda, eu-west-1**) | Banco Postgres compartilhado, autenticação e RLS. As funções do Vercel rodam em Dublin (`dub1`), perto do banco. |
| `web/` | Interface do Jefferson: lista de vagas, email pronto, estado "enviada" e assistente de resposta. |

### 2. Stack da interface

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router), versão estável atual, confirmada no plano de implementação |
| UI | React e TypeScript |
| Hospedagem | Vercel; o diretório raiz do projeto no Vercel é `web/` |
| Dados e login | `@supabase/ssr` e `@supabase/supabase-js` |
| IA | SDK oficial da Anthropic, só em Route Handlers (servidor) |
| Movimento | Lenis (rolagem suave) e Framer Motion (transições), como no portfólio |

### 3. Sistema visual copiado do portfólio

Fonte: `Portifolio/src/styles/global.css` e `src/components/core/SmoothScroll.jsx`.

- **Cores (tema claro, monocromático):** `--bg #ffffff`, `--bg-soft #f4f5f9`,
  `--bg-elev #e1e3ee`, `--ink #0b0c10`, `--ink-dim #3d4250`, `--ink-mute #5f6575`. O único
  destaque é o turquesa do mar: `--cyan #0b6e77` (contraste AA sobre o fundo) e `--pink #43aab7`
  (só decorativo).
- **Tipografia:** Montserrat (títulos, 600 a 900), Inter (texto, 400 a 700) e Space Mono
  (detalhes, 400 e 700). No Next.js são carregadas por `next/font/google`.
- **Forma e movimento:** `--radius 18px`, `--radius-lg 28px`,
  `--ease-out cubic-bezier(0.16, 1, 0.3, 1)` e sombras suaves (`--shadow-card`).
- **Lenis:** mesma configuração do portfólio (`duration 1.15`, `touchMultiplier 1.6`),
  **desligado com `prefers-reduced-motion`**.
- **Fica de fora:** three.js, o filme do hero com GSAP, o cursor customizado, o modo jogo e o
  preloader. Não servem a um app de uso no celular.
- **Mobile-first:** o layout é desenhado primeiro para a largura do celular. Na tela grande,
  ganha mais colunas.

### 4. Telas

| Tela | Conteúdo |
|---|---|
| Entrar | Login por código enviado ao email do Jefferson (era link mágico; ver ADR-0003, seção 5) |
| Vagas | Lista do dia, agrupada pela prioridade de país (ES; NL e DE; PT; resto da UE), com nota, regime e empresa. Filtros por país, regime e estado. |
| Vaga | Descrição, contato da empresa e o email gerado. Botões "Copiar" e "Abrir no app de email" (link `mailto:` com destinatário, assunto e corpo). Botão "Marcar como enviada". |
| Assistente | Campo para colar o email recebido e escolher a vaga relacionada. Devolve a resposta sugerida, com botão "Copiar". |

### 5. Segurança

- **Acesso só do Jefferson:**
  - login pelo Supabase Auth com código por email (ADR-0003, seção 5);
  - cadastro público desligado e uma lista que permite só o email dele;
  - o servidor confirma a identidade com `auth.getUser()` em cada pedido, nunca com
    `getSession()`.
- **RLS ligado em todas as tabelas desde o primeiro dia**, com política por `owner_id`. Toda
  consulta leva também o filtro explícito por dono (contrato APOIO: não presumir o isolamento
  pela camada do banco).
- **Coletor:** grava com um usuário Postgres próprio (`coletor`), com permissões só nas
  tabelas que ele escreve e sem acesso a `candidaturas`. A senha fica no `.env` local e nos
  GitHub Secrets, nunca no Vercel. As gravações levam `owner_id` explícito. A chave secreta
  (service role) do Supabase não é usada.
- **Chave da API da Claude:** fica só nas variáveis de ambiente do servidor no Vercel e nunca
  vai para o navegador. Nenhuma variável `NEXT_PUBLIC_` contém segredo.
- **Assistente de resposta:**
  - o email colado é **dado, nunca instrução** (OWASP LLM01);
  - ele vai para o modelo separado das instruções, e o modelo não tem ferramentas;
  - a saída é validada e devolvida só como texto (OWASP LLM05);
  - o servidor não envia emails;
  - limite de pedidos por minuto na rota, para não haver custo descontrolado.
- **Dados pessoais:** morada e telefone continuam fora do repositório e do banco.
- **Retenção:** contatos apagados após 6 a 12 meses, como no ADR-0001.
- **Cabeçalhos de segurança** no Next.js (CSP, `X-Frame-Options`, `Referrer-Policy`).

### 6. Organização do repositório

```
buscador/
├── coletor/        # Python, rodado pelo GitHub Actions
├── web/            # Next.js, publicado no Vercel
├── config/         # perfil.yaml (lido pelos dois)
└── docs/
```

---

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Comando `/responder` no Claude Code (proposta do ADR-0001) | Não funciona pelo celular. |
| Interface no Telegram ou por email | O Jefferson não usa notificações do Telegram, e um email não dá uma interação boa para colar e copiar textos. |
| Manter o SQLite no cache do Actions | O Vercel não tem acesso a ele. |
| Vercel Postgres (Neon) ou Turso | Funcionariam, mas o Jefferson já domina o Supabase, que traz banco, autenticação e RLS juntos. |
| Proteção por senha do Vercel | É recurso de plano pago e não isola os dados no banco. |
| Copiar o portfólio inteiro (Vite) | O framework é outro e há peças pesadas (three.js, GSAP) que não servem aqui. Copiam-se só os tokens e os padrões. |

---

## Consequências

**Positivas**

- Todo o fluxo fica no celular, do alerta ao envio.
- O botão do `mailto:` reduz a candidatura a revisar e tocar em enviar.
- O visual é consistente com o portfólio do Jefferson.
- Há histórico do que foi enviado e de quando.

**Negativas e trade-offs**

- Mais peças para manter: Supabase, Vercel e autenticação.
- O site fica exposto à internet, o que exige login, RLS e cabeçalhos de segurança desde o
  primeiro dia.
- A senha do usuário `coletor` no GitHub Actions é um segredo. O impacto de um vazamento
  fica limitado às tabelas que ele grava, e o Gitleaks vigia o repositório.
- O tamanho de um link `mailto:` tem limite prático. Emails muito longos podem precisar do
  botão "Copiar" em vez de "Abrir no app".

---

## Ressalva do ponto focal técnico (custos)

| Item | Situação |
|---|---|
| Vercel Hobby | Grátis, só para uso pessoal e não comercial. O caso atual se encaixa. Se o produto um dia for oferecido a terceiros, é preciso plano pago. |
| Supabase Free | Grátis. Pausa o projeto após uma semana sem atividade, mas a gravação diária do coletor o mantém ativo. Os limites do plano são confirmados no momento da implementação. |
| API da Claude | O assistente usa o Claude Opus 5.5 (opção b1 do ADR-0001), ~US$ 3 por mês nos ~90 pedidos estimados. O teto total é de US$ 15 por mês. |

---

## Em aberto

1. ~~Versão do Next.js~~: Next.js 16.3.8, React 19.3, TypeScript 6.0.3, Tailwind 4.3 e componentes shadcn
   sobre radix-ui (ver [`docs/planos/2026-10-14-site.md`](../planos/2026-10-14-site.md)). No Next 16 o
   `middleware.ts` chama-se `proxy.ts`. O site também comanda o coletor e edita o perfil:
   [ADR-0003](ADR-0003-site-como-painel-de-controle.md).
2. ~~Esquema das tabelas~~: definido em
   [`docs/planos/2026-10-12-esquema-banco.md`](../planos/2026-10-12-esquema-banco.md).
   O coletor usa um usuário Postgres `coletor` com acesso restrito; a chave secreta (service
   role) do Supabase não é usada.
3. Domínio: o subdomínio padrão do Vercel ou um domínio próprio.
