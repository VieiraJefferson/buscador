# Decisões importantes do buscador

Resumo vivo das decisões em vigor. O detalhe e o porquê estão nos ADRs
([`decisions/`](decisions/)); a história de cada sessão, no [`diario/`](diario/). Quando uma
decisão muda, este arquivo é atualizado e o ADR também.

**Última atualização:** 2026-10-14

## Produto

| Tema | Decisão | Fonte |
|---|---|---|
| O que é | Buscador e alerta pessoal de vagas tech na UE. Gera o email de candidatura; o Jefferson envia manualmente. | ADR-0001 |
| LinkedIn | **Não usa.** Muitas agências e vagas irreais, e os termos proíbem robôs. | ADR-0001 |
| Brasil | **Fora.** Só vagas na Europa. | ADR-0001 |
| Países (ordem) | 1. Espanha · 2. Holanda e Alemanha · 3. Portugal · 4. resto da UE | ADR-0001 |
| Regime | Remoto ou híbrido em todos. Presencial excluído. | ADR-0001 |
| Senioridade | **Mid e senior.** Júnior, estágio, lead, staff, principal, architect e gestão ficam fora. O CV usa o título neutro "Full-Stack Software Engineer & Architect", sem "Senior", para não perder vagas mid. | Diário de 2026-10-13 |
| Idioma | Exclui vagas que exigem alemão ou holandês fluente. O Jefferson fala PT, EN e ES. | ADR-0001 |
| Empresas | Só as que contratam diretamente. Recrutadoras, headhunters, ETT e as consultorias da lista negra são excluídas. **Outras consultorias ficam, mas abaixo dos empregadores diretos.** | ADR-0001 |
| Ranking | 1. prioridade do país; 2. empregador direto antes de consultoria; 3. nota de compatibilidade (etapa 4). | ADR-0001, migration 0002 |
| Descoberta de empresas | **"Empresa primeiro", custo zero:** listas abertas de empresas por ATS (~24 mil), listas por país e TheirStack grátis; vagas lidas nas APIs públicas dos ATS. Os portais grandes (InfoJobs, Indeed) não são fonte; o Tecnoempleo é dominado por intermediários. Planos pagos não usados. | ADR-0001, pesquisa de 2026-10-13 |
| Contato | Email direto da empresa. Prioridade: `mailbox_email` do Recruitee e email da fonte, depois o site da empresa e padrões genéricos (`careers@`…). Preferência por emails genéricos (RGPD). | ADR-0001 |
| Envio | **Manual.** Nada sai automaticamente. Meta de ~100 candidaturas por semana. | ADR-0001 |
| Email gerado | Sem texto fixo: escrito para cada vaga. **Proibidos "—" e "–".** Sempre como candidato. No idioma da vaga. | ADR-0001 |
| Resposta a recrutadores | Manual, com o assistente: o Jefferson cola o email e recebe a resposta. O email colado não é guardado. | ADR-0001, ADR-0002 |
| Autorização de trabalho e sponsor | Fora do sistema; o Jefferson trata com cada empresa. Tem autorização em ES, PT, DE e NL. | ADR-0001 |

## Arquitetura

| Tema | Decisão | Fonte |
|---|---|---|
| Coletor | Python, rodado uma vez por dia pelo GitHub Actions num repositório privado | ADR-0001 |
| Site | Next.js + React + TypeScript no Vercel, pensado para o celular, com o visual do portfólio (cores, Montserrat/Inter/Space Mono, Lenis) | ADR-0002 |
| Banco | Supabase na Irlanda (eu-west-1), 6 tabelas com RLS | ADR-0002, plano do esquema |
| Acesso ao banco pelo coletor | Usuário Postgres `coletor` com acesso restrito, via pooler de sessão. **A chave secreta (service role) não é usada.** | Plano do esquema |
| Login no site | Supabase Auth com link mágico, cadastro público desligado, só o email do Jefferson | ADR-0002 |
| Relatório diário | Por email, **enviado pelo Resend** (chave só de envio) para o **email pessoal** do Jefferson. O Gmail dedicado falhou por causa do telefone. | ADR-0001 |
| Segredos | `.env` local (ignorado pelo git), GitHub Secrets e variáveis do Vercel. Nomes claros, lidos num único arquivo de configuração. Gitleaks em cada push. | ADR-0001, plano do esquema |

| Painel de controle | O site roda a varredura e a descoberta (API do GitHub com token fine-grained só de Actions), edita o perfil (tabela `perfis`; o coletor lê de lá) e tem agenda interna e assistente de resposta. | ADR-0003 |
| Stack do site | Next.js 16.3.8, React 19.3, TypeScript 6.0.3, Tailwind 4.3, shadcn/radix, visual do portfólio, região `dub1` | ADR-0002, plano do site |

## IA

| Tarefa | Modelo | Fonte |
|---|---|---|
| Classificar agência e pontuar vagas | Claude Haiku 5.5 (`claude-haiku-5-5`) | ADR-0001 |
| Escrever os emails de candidatura | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | ADR-0001 |
| Assistente de resposta | Claude Haiku 5.5 classifica (recusa, convite, pedido de informação) e Claude Opus 5.5 (`claude-opus-5-5`) escreve a resposta, com horários livres da agenda no convite | ADR-0001, ADR-0003 |
| Fallback em recusa | `fallbacks: "default"` (`server-side-fallback-2026-07-01`) no Sonnet e no Opus | Planos de 2026-10-14 |
| Orçamento | Teto de **US$ 15 por mês** (estimativa ~US$ 13), garantido por um limite no console da Anthropic. A API é cobrada à parte da assinatura do Claude. | ADR-0001 |
| Segurança | Conteúdo externo é dado, nunca instrução (OWASP LLM01). Sem ferramentas com efeito externo. Saída validada. | ADR-0001, ADR-0002 |

## Dados pessoais e RGPD

- Morada, telefone e o PDF do CV nunca entram no git nem no banco.
- Contatos apagados 12 meses depois (`apagar_apos`).
- Repositório privado; a base de contatos nunca é publicada.
- Sem Apollo nem bases derivadas do LinkedIn.

## Forma de trabalhar

- Conversa e documentos em **português do Brasil**.
- Fluxo: pesquisar → plano → aprovação → implementar. Walkthrough de uma micro-etapa por vez.
- O Claude nunca faz commit, push nem troca de branch. Sugere `git add` um por linha e uma
  mensagem de 2 linhas, sem aspas duplas e **sem Co-Authored-By nem menção a IA**.
- Decisões de custo são do Jefferson, apresentadas como "Ressalva do ponto focal técnico".
