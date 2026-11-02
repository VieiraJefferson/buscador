# ADR-0005: Apollo para o email de quem recruta, só nas vagas de nota 4 ou 5

**Status:** Aceito
**Data:** 2026-11-02
**Decisor:** Jefferson Vieira
**Altera:** [ADR-0001](ADR-0001-arquitetura-buscador-vagas.md), seção 5 (ordem de busca do
contato) e seção 9 (a linha "Não usar Apollo")

---

## Resumo não-técnico

- **O problema:** quase nenhuma candidatura tinha o email do destinatário. O sistema só
  achava o `mailbox_email` do Recruitee, e o botão "Abrir no app de email" abria sem o "Para".
- **Agora:**
  - Depois da busca, dos filtros e da nota da IA, **só as empresas com vaga de nota 4 ou 5**
    passam pelo Apollo. Ele acha alguém de recrutamento, RH ou quem lidera engenharia e traz
    o email profissional **verificado**.
  - O site mostra o email com o nome, o cargo e "via Apollo", e o botão já abre com o "Para"
    preenchido.
  - Cada empresa é consultada **uma vez só**, e há um teto mensal de créditos.
  - O envio continua manual.
- **Custo:** plano Basic mensal (US$ 65 por mês, 2.500 créditos por mês), escolhido pelo
  Jefferson em 2026-11-02. O Free não libera os endpoints de pessoas.

## Contexto

- O ADR-0001 proibia o Apollo por dois motivos: o custo e o risco RGPD das bases derivadas
  do LinkedIn (a CNIL multou a KASPR em 240 mil euros, SAN-2024-020).
- Em 2026-11-02 o Jefferson decidiu usar o Apollo, mas só depois do filtro e da nota, para
  que o volume e o custo fiquem baixos (menos de 1.000 candidaturas por mês).
- No plano escolhido, a variante "(b)": o contato do Apollo vai no "Para" mesmo quando a
  empresa já tem o mailbox do Recruitee.

## Decisão

### Fluxo (`coletor/coletor/fontes/apollo.py`, etapa `_apollo` em `__main__.py`)

Roda dentro da etapa da IA, entre a avaliação das vagas e a escrita dos emails:

1. `empresas_para_apollo`: empresas não bloqueadas, que não são agência, sem
   `apollo_consultado_em` e com pelo menos uma vaga ativa, não descartada e de nota 4 ou mais.
   A ordem é a prioridade do país.
2. Sem domínio: `POST /mixed_companies/search` pelo nome (1 crédito). Só aceita a empresa
   cujo nome normalizado (sem acento nem sufixo GmbH, S.L., B.V.…) é igual ao nosso, para não
   pagar o match de uma homônima. O domínio achado é gravado em `empresas.dominio`, se
   nenhuma outra empresa já o tiver.
3. `POST /mixed_people/api_search` (0 créditos) com cargos de recrutamento, RH e engenharia.
   Só entram pessoas com `has_email`, ordenadas por faixa: recrutamento, RH, engenharia,
   fundador. Vendas e outras áreas ficam fora.
4. `POST /people/match` pelo `id` (1 crédito), com `reveal_personal_emails=false`. **Só um
   email com `email_status = verified` é aceito.** Tenta no máximo 2 pessoas por empresa.
5. O contato é gravado com `origem='apollo'` e `tipo='nominal'`, com o nome e o cargo. Os
   emails já gerados para a empresa passam a apontar para ele.
6. `empresas.apollo_consultado_em` é marcado mesmo quando nada é encontrado: o crédito nunca
   é gasto duas vezes.

### Custos e limites

- `APOLLO_LIMITE_MENSAL` (padrão 2.000 créditos, abaixo dos 2.500 do plano) e
  `APOLLO_MAX_EMPRESAS` (padrão 100 por execução). Pior caso: 3 créditos por empresa.
- Os créditos gastos ficam em `execucoes` (fonte `apollo`, coluna `vagas_lidas`), o mesmo
  padrão do teto do TheirStack (`creditos_gastos_no_mes`).
- Três erros seguidos (chave inválida, Apollo fora do ar) interrompem a etapa.
- Sem `APOLLO_API_KEY`, a etapa é pulada.

### Ordem do "Para"

`gravar_email` escolhe o contato do Apollo primeiro, depois o mailbox do ATS.

### Chave

- Chave dedicada, sem "master key", restrita a `mixed_people/api_search`, `people/match` e
  `mixed_companies/search`.
- Enviada no cabeçalho `x-api-key`, nunca na URL nem nos logs.
- Guardada no GitHub Secrets (`APOLLO_API_KEY`) e no `.env` local.

### RGPD (salvaguardas)

- Só emails profissionais. O email pessoal nunca é pedido, e o Apollo também não o revela
  para residentes na UE.
- O contato continua com `apagar_apos` de 12 meses e a retenção existente.
- Nome, cargo e email nunca vão para o prompt da IA.
- **Saída fácil em todo email:** o código acrescenta, depois da validação, uma linha "P.S."
  no idioma da vaga dizendo que basta responder para não receber mais
  (`SAIDA_RGPD` em `coletor/coletor/ia.py`). A IA é instruída a não escrever outra. Só os
  emails gerados a partir de 2026-11-02 têm a linha.
- **Oposição atendida com um clique:** "Bloquear empresa" no site apaga os contatos dela
  (`bloquearEmpresa` em `web/app/(app)/vagas/actions.ts`). A empresa não volta nas buscas, o
  Apollo não a consulta de novo e `gravar_contato` não grava contato de empresa bloqueada.
- O Gmail não foi ligado ao Apollo e a extensão do Chrome não é usada.
- Base legal: interesse legítimo (art. 6(1)(f)), com a candidatura escrita como candidato. É
  um enquadramento técnico, não um parecer jurídico.

## Alternativas consideradas

- **Manter a proibição e usar só o site da empresa e os padrões genéricos (`careers@`).**
  Não tem custo, mas foi descartada por agora: não acha uma pessoa, e o trabalho de raspar
  sites ficaria maior.
- **(a) Apollo só nas empresas sem nenhum contato.** Gasta menos créditos, mas a maioria das
  empresas não tem contato, e o Jefferson prefere o recrutador no "Para".

## Consequências

- Migration `0006_contatos_apollo.sql`: `origem` aceita `apollo`, mais as colunas
  `contatos.nome`, `contatos.cargo` e `empresas.apollo_consultado_em`. **Precisa ser aplicada
  antes da primeira varredura com a chave.**
- Mais contatos nominais na base, o que aumenta a responsabilidade RGPD; mitigado pelas
  salvaguardas acima.
- Empresas muito pequenas podem não estar no Apollo; nesse caso, continua o mailbox ou o
  "contato não encontrado".

## Fontes

- docs.apollo.io/reference/people-api-search (0 créditos, sem email, filtros por domínio e
  cargo)
- docs.apollo.io/reference/people-enrichment (`/people/match`, `reveal_personal_emails`,
  regra da UE)
- docs.apollo.io/docs/api-pricing (créditos por endpoint)
- Tela de planos do Apollo em 2026-11-02 (Basic mensal US$ 65, 2.500 créditos por mês)
