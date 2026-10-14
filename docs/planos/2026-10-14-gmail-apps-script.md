# Respostas das empresas lidas direto do Gmail (Apps Script)

**Data:** 2026-10-14
**Status:** recomendação aceita pelo Jefferson; **fazer depois do deploy** do site
(etapas já decididas em [`2026-10-14-site.md`](2026-10-14-site.md)). Antes de implementar:
plano detalhado com arquivos afetados, ADR próprio e aprovação explícita.
**Decisões de origem:** [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md) (nada é
enviado automaticamente) e [ADR-0003](../decisions/ADR-0003-site-como-painel-de-controle.md)
(assistente de resposta).

## Resumo não-técnico

Hoje a resposta da empresa chega ao buscador só quando você cola o email no Assistente ou
usa "Partilhar → Buscador". A ideia é o próprio Gmail entregar esses emails ao buscador. A
resposta pronta volta como **rascunho no mesmo fio do email**. Você revisa e envia, e nada
sai sozinho.

## Como funcionaria

1. Um Google Apps Script roda **dentro da conta Gmail do Jefferson**, a cada 10 minutos, com
   gatilho de tempo, sem custo e sem servidor novo.
2. Ele lê os emails novos da caixa de entrada e envia ao site **só o remetente**.
3. O site confere se o remetente é de uma empresa com candidatura "enviada". Só nesse caso o
   script envia o texto do email. Recrutadores ou empresas fora do banco entram apenas quando
   o email tiver a etiqueta `buscador`, aplicada à mão.
4. O site classifica o email e escreve a resposta, com a mesma lógica do Assistente:
   - recusa: marca a candidatura e bloqueia a empresa;
   - convite: inclui horários livres da agenda.
5. O script cria a resposta como **rascunho** no fio do email e marca o email como tratado,
   para não processar duas vezes.

## Segurança (a detalhar no plano)

- O pedido do script ao site leva um segredo próprio, guardado nas propriedades do script e
  nunca no código ou no git. A comparação no site é feita em tempo constante e tem limite de
  pedidos.
- Só emails de empresas conhecidas, ou com a etiqueta, saem do Gmail.
- O texto do email é dado, nunca instrução (OWASP LLM01), e não é guardado no banco.
- Rascunho apenas, nunca envio automático.

## Alternativas descartadas por agora

| Opção | Motivo |
|---|---|
| Gmail API a partir do GitHub Actions | Exige app OAuth no Google; sem verificação, o token expira a cada 7 dias |
| Endereço de entrada (Resend ou Cloudflare) | Exige domínio próprio ou reencaminhamento manual de cada email |

## Pontos em aberto para o plano

- Rota nova no site (por exemplo `/api/gmail`), com autenticação por segredo e não por sessão.
- Como registrar no banco a ação tomada, como candidatura respondida ou empresa bloqueada,
  sem guardar o texto do email.
- Escopos do Apps Script e o limite diário de `UrlFetchApp`.
