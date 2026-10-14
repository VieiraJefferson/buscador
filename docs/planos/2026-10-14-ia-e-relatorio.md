# IA no coletor e relatório diário (etapas 4 e 5)

**Data:** 2026-10-14
**Código:** `coletor/coletor/ia.py`, `coletor/coletor/relatorio.py`, `coletor/coletor/__main__.py`
**Decisões de origem:** [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md),
seções 6 e 8 (modelos da opção b1, relatório pelo Resend)

## Resumo não-técnico

Depois de gravar as vagas do dia, o coletor passa a fazer duas coisas novas:

1. **Avalia cada vaga nova com IA:**
   - diz se a empresa é um empregador direto, uma consultoria ou uma recrutadora;
   - dá uma **nota de 1 a 5** de compatibilidade com o seu perfil, com uma frase explicando.
   - Uma recrutadora sai da lista e a empresa passa a ser ignorada. Uma consultoria fica, mas
     abaixo dos empregadores diretos.
2. **Escreve o email de candidatura** das melhores vagas (nota 4 ou 5), até 20 por dia:
   - no idioma da vaga;
   - sem travessões;
   - sempre como candidato e só com fatos do seu perfil.

No fim, **manda o relatório do dia para o seu email**, com as vagas agrupadas por país, a nota,
o tipo de empresa e quais já têm email pronto.

## Como funciona

| Passo | Modelo | Detalhe |
|---|---|---|
| Avaliação | Claude Haiku 5.5 (`claude-haiku-5-5`) | `messages.parse` com o modelo pydantic `Avaliacao` (saída validada); `effort: low`; perfil em cache (`cache_control: ephemeral`); até 200 vagas por execução, 4 em paralelo |
| Email | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | `output_config.format` com JSON schema (`assunto`, `corpo`); `effort: medium`; fallback automático em recusa (`server-side-fallback-2026-07-01`, `fallbacks: "default"`); até 20 por execução, nota mínima 4 |
| Relatório | Resend | `POST https://api.resend.com/emails` de `onboarding@resend.dev` para `RELATORIO_DESTINO`; HTML com todo o texto escapado |

- **O que a avaliação muda na vaga:**
  - `nota`, `nota_justificativa` e `idioma`;
  - `consultoria` passa a `true` se a IA classificar assim;
  - `ativa` passa a `false` se for recrutadora, se exigir alemão ou holandês, ou se for
    presencial;
  - o `regime` só é preenchido quando ainda estava "desconhecido".
- **Email:** vai para `emails_gerados`, com o contato da empresa quando existe (os genéricos
  primeiro).
- **Perfil:** o coletor lê o perfil do banco (tabela `perfis`, editável no site). Se ainda não
  existir, lê `config/perfil.yaml`. O telefone e os contatos não vão para os prompts.
- **Limites:** `COLETOR_MAX_AVALIACOES` (200) e `COLETOR_MAX_EMAILS` (20) por execução. O teto
  de US$ 15 por mês fica no console da Anthropic.

## Segurança (OWASP Top 10 for LLM Applications 2025)

- **LLM01 (injeção):** o texto da vaga vai entre `<vaga>` e `</vaga>` no turno do usuário. As
  instruções do sistema dizem que é dado não confiável, e um `</vaga>` dentro do texto é
  removido.
- **LLM06 (agência excessiva):** nenhum modelo tem ferramentas. A IA só devolve dados.
- **LLM05 (saída):** toda saída é validada por esquema (pydantic). O email passa por
  `validar_email`, que recusa travessões, assunto vazio, corpo curto e marcadores não
  preenchidos, e o banco recusa travessões de novo (`check`).
- **Dados pessoais:** o telefone fica fora do prompt (há teste para isso). O email que a
  empresa responde não passa pelo coletor.

## Validação

- 56 testes passam, todos com a API simulada (nenhuma chamada real).
- **Regra 14 (teste que falha antes e passa depois):**
  `test_email_com_travessao_e_recusado`. Sem o validador, um email com "—" passa (verificado em
  2026-10-14); com ele, é recusado. Outro teste confirma que o email com travessão é pedido de
  novo e que o limpo é aceito.
- O SDK está fixado em `anthropic>=1.11.0,<1.12` (1.11.0, de 2026-09-30).

## Produção

O workflow `coletor-varrer` recebe `ANTHROPIC_API_KEY`, `RESEND_API_KEY` e
`RELATORIO_DESTINO` (Secrets) e `SITE_URL` (Variable). O tempo máximo subiu para 60 min.

## Correção feita junto

O `varrer` mantinha a conexão ao banco aberta enquanto consultava milhares de empresas, o que
leva minutos, e o pooler podia derrubá-la. Agora usa conexões curtas antes e depois da rede,
como o `descobrir`.
