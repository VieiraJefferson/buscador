# ADR-0007: Logo e links na assinatura do Gmail, não no corpo do email

**Status:** Aceito
**Data:** 2026-11-02
**Decisor:** Jefferson Vieira
**Relaciona:** [ADR-0006](ADR-0006-envio-pelo-gmail-e-fases-da-candidatura.md) (envio pelo Gmail)

---

## Resumo não-técnico

- **O problema:** o link do portfólio chegava como texto, e não havia rodapé com a marca do
  Jefferson.
- **Por que acontece:** o site abre o email pelo link do Gmail (PC) ou pelo `mailto:`
  (celular). Os dois só levam texto puro. Não há como mandar um link com nome ou uma imagem
  por eles.
- **Agora:**
  - o logo JV, o nome, o cargo e os links (Portfólio, GitHub, LinkedIn) ficam na **assinatura
    do Gmail**, configurada uma vez no computador;
  - o Gmail põe essa assinatura em todo email novo, no PC e no app do celular, desde que a
    "assinatura móvel" do app esteja desligada;
  - a IA deixa de escrever links no texto, para nada aparecer duplicado.

## Opções avaliadas

| Opção | No PC | No celular | Escolha |
|-------|-------|------------|---------|
| Rodapé feito pelo site + botão "Copiar formatado" (HTML colado no Gmail) | Funciona, com um Ctrl+V a mais | Não é confiável: o `mailto:` é só texto, e colar formatado no app varia | Não |
| Rascunho criado pela API do Gmail | Funciona | Funciona | Não: liga o site à conta Gmail, frente nova e contrária à decisão atual |
| **Assinatura do Gmail** | Funciona | Funciona, se a assinatura móvel estiver desligada | **Sim** |

## Fonte externa (regra 14)

A ajuda do Gmail diz três coisas:

- a assinatura do computador aceita imagem (por URL) e formatação;
- no app, "se você não criar uma assinatura no app Gmail, as mensagens novas usam a
  assinatura do computador";
- a assinatura móvel é só texto.

Fontes:
- [Criar uma assinatura no Gmail (Android)](https://support.google.com/mail/answer/8395?co=GENIE.Platform%3DAndroid&hl=en)
- [Criar uma assinatura no Gmail (iPhone)](https://support.google.com/mail/answer/8395?hl=en&co=GENIE.Platform%3DiOS)
- [Problemas com assinaturas do Gmail](https://support.google.com/mail/answer/11468381?hl=en)

## Decisão técnica

- **`coletor/coletor/ia.py`:**
  - o prompt do email passa a mandar fechar só com a despedida e o nome, sem links nem bloco
    de assinatura;
  - `_resumo_perfil` deixa de enviar `candidato.links` ao modelo.
- **Assistente (`web/lib/ia.ts` e `web/app/api/resposta-empresa/route.ts`):** a mesma regra,
  e os links saem do perfil enviado ao modelo.
- **Logo:** `https://portifolio-jefferson-vieira.vercel.app/icon-192.png`. É PNG, porque o
  Outlook não mostra WebP. Respondeu 200, do tipo `image/png`, em 2026-11-02.
- **Teste:** `test_email_nao_leva_links_porque_a_assinatura_do_gmail_ja_tem` em
  `coletor/tests/test_ia_relatorio.py`. Falhou antes e passa depois.

## Consequências

- **Positivas:**
  - logo e links clicáveis no PC e no celular;
  - assinatura sempre igual, sem depender da IA.
- **Negativas:**
  - a assinatura entra em todos os emails do Gmail, não só nas candidaturas;
  - os emails gerados antes desta mudança ainda trazem o link escrito pela IA no texto. É
    preciso apagar essa linha antes de enviar, ou esperar que sejam gerados de novo.
- Ainda falta confirmar, num teste do Jefferson, que os links da assinatura continuam
  clicáveis quando o email sai do app do celular.
