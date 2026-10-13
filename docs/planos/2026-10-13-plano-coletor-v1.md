# Coletor v1 (etapa 3)

**Data:** 2026-10-13
**Estado:** implementado; falta a primeira execução real
**Código:** [`coletor/`](../../coletor/)
**Decisões de origem:** [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md) e
[pesquisa "empresa primeiro"](2026-10-13-pesquisa-empresas-diretas.md)

## Resumo não-técnico

O coletor é o programa que faz a varredura. Ele:

1. **monta a lista de empresas** a partir de listas abertas: cerca de 24 mil empresas com o
   sistema de recrutamento identificado, mais as empresas espanholas da lista `remote-es`;
2. **lê as vagas direto no sistema de recrutamento de cada empresa** e em quatro
   agregadores grátis;
3. **filtra:** país (Espanha primeiro), remoto ou híbrido, júnior a mid, sem exigência de
   alemão ou holandês, sem agências nem consultoras, e só vagas de desenvolvimento;
4. **remove duplicados** e **grava no banco**, junto com o email de candidaturas quando a
   fonte o traz (Recruitee).

Ainda não usa IA (etapa 4) nem roda sozinho todos os dias (etapa 5).

## Como usar

Os comandos rodam dentro da pasta `coletor/`. Requisitos: Python 3.12 e
[uv](https://docs.astral.sh/uv/).

```bash
cd coletor
uv sync
uv run python -m coletor descobrir --dry-run --amostra 30   # teste, não grava nada
uv run python -m coletor varrer --dry-run --amostra 30      # teste, não grava nada
uv run python -m coletor descobrir                          # 1.ª vez: monta a lista (demorado)
uv run python -m coletor varrer                             # vagas do dia
```

- **`descobrir`:** lê as listas abertas, consulta cada empresa e grava no banco só as que têm
  vagas na UE. Na primeira vez leva dezenas de minutos (~24 mil empresas). Depois, uma vez por
  semana.
- **`varrer`:** consulta só as empresas já gravadas e os agregadores, e grava as vagas que
  passam nos filtros. Também desativa as vagas que sumiram e apaga os contatos vencidos (RGPD).
- As credenciais vêm do `.env` da raiz (`SUPABASE_DB_URL`, `OWNER_ID`), ou do ambiente no
  GitHub Actions. O `--dry-run` não precisa delas.

## Estrutura

| Arquivo | Função |
|---|---|
| `coletor/config.py` | Único lugar que lê variáveis de ambiente, `config/perfil.yaml` e a lista de agências |
| `coletor/modelos.py` | Formato padrão de vaga e de empresa (validação com pydantic; URL só http/https) |
| `coletor/rede.py` | Pedidos HTTP: 16 em paralelo no total, 4 por site, timeout de 20 s, novas tentativas em 429/5xx com espera e validação de slug |
| `coletor/texto.py` | HTML para texto, normalização, países (nomes em 7 línguas e cidades) e regime |
| `coletor/fontes/` | Ashby, Lever (global e UE), Greenhouse, Recruitee, Teamtailor (RSS), SmartRecruiters, Workable, Personio (XML) e os agregadores Arbeitnow, Himalayas, Landing.jobs e Bundesagentur v6 |
| `coletor/empresas.py` | Listas `kalil0321/ats-scrapers`, `veresk06/open-ats-feed` e `remote-es/remotes`, mais a detecção do ATS a partir do URL |
| `coletor/filtros.py` | Agência → perfil → senioridade → país e prioridade → regime → idioma |
| `coletor/dados/agencias.yaml` | Lista negra de recrutadoras, plataformas intermediárias e consultoras, e palavras-chave em 5 línguas |
| `coletor/dedupe.py` | Chave contra duplicados: empresa sem sufixo societário mais título sem marcador de gênero |
| `coletor/contatos.py` | Email de candidaturas do Recruitee (`ats_mailbox`) |
| `coletor/banco.py` | Gravação com o usuário `coletor`, sempre com `owner_id` explícito |
| `coletor/__main__.py` | Comandos `descobrir` e `varrer` |
| `tests/` | 49 testes com respostas de exemplo fiéis às reais, sem rede |

## Regras dos filtros

| Regra | Comportamento |
|---|---|
| Agência | O nome da empresa está na lista negra ou o texto tem expressões como "on behalf of our client", "nuestro cliente" ou "unser Kunde". Uma empresa do banco que está na lista negra é marcada `eh_agencia` e deixa de ser varrida |
| Perfil | O título precisa ser de desenvolvimento (developer, engineer, desarrollador, entwickler…). Vendas, marketing, engenharia mecânica e afins ficam fora |
| Senioridade | **Mid e senior entram** (decisão de 2026-10-13). Exclui júnior, entry level, graduate, trainee, estágio, working student, lead, staff, principal, head, director, manager, architect e executive |
| País | ES = 1; NL e DE = 2; PT = 3; resto da UE = 4. Fora da UE (e Brasil) é rejeitado. "Europe" sem país só conta para vagas remotas (prioridade 4) |
| Regime | Presencial é rejeitado. "Desconhecido" passa, e a IA decide na etapa 4 |
| Idioma | Rejeita a vaga se exige alemão ou holandês (expressões como "fluent German" e "Deutschkenntnisse"), se o anúncio está escrito em alemão ou holandês, ou se o título é alemão |

## Segurança

- Slugs validados com um padrão estrito antes de montar qualquer URL, e URLs só nos modelos
  fixos de cada ATS (proteção contra SSRF).
- XML lido com `defusedxml` (proteção contra XML malicioso).
- Nenhum segredo nos logs. O erro de conexão mostra só o tipo do erro, e os logs do `httpx`
  com URLs ficam desligados.
- As listas abertas são lidas na hora e não são copiadas para o repositório. A `remote-es`
  não tem licença: é só consultada.
- O Gitleaks rodou em 2026-10-13 sobre os arquivos novos: nenhum vazamento no código (as
  únicas ocorrências estão no `.env`, ignorado pelo git).

## Validação

- `ruff check`: sem erros.
- `pytest`: 49 testes passam, sem rede (44 do coletor base e 5 do TheirStack).
- Defeitos encontrados pelos testes e corrigidos: títulos alemães compostos
  ("Softwareentwickler", "Entwicklung") não eram reconhecidos como desenvolvimento.
- **Teste real só de leitura** (`varrer --dry-run --amostra 30`, 2026-10-13, 13 s):
  - sementes carregadas: kalil0321 24.420, veresk06 16.087 e remote-es 279;
  - 2.842 vagas lidas em 30 empresas e 4 agregadores, 105 aceitas;
  - rejeições: 1.964 fora do perfil, 271 por senioridade, 230 por regime, 118 de agência,
    86 fora da UE e 45 por idioma;
  - três defeitos encontrados e corrigidos:
    - a Himalayas ignora `offset` e pagina por `page`; antes as vagas vinham repetidas;
    - "Business Developer" passava como desenvolvimento;
    - tecnologias soltas no título ("AI-Enabled Revenue Operations Specialist") bastavam
      para passar; agora o título precisa nomear uma função de desenvolvimento.
  - Ainda passam vagas de perfil próximo, como "Data Engineer", "Analytics Engineer" e
    "Research Engineer". A IA da etapa 4 dá a nota de compatibilidade.
- **Falta:** a primeira execução real com gravação no Supabase.

## TheirStack (adicionado em 2026-10-13)

- **Para quê:** descobrir empregadores diretos. O `descobrir` semanal pede ao TheirStack vagas
  `mid_level` ou `senior`, remotas ou híbridas, dos últimos 7 dias, de `direct_employer`, com
  títulos da stack. Exclui lead, staff, architect, manager, director, head, intern e junior, e
  as agências da lista negra com 6 ou mais caracteres (o TheirStack compara por substring).
- **Custo:** 1 crédito por vaga devolvida (documentação oficial). Orçamento de 50 por semana
  (ES 25, NL e DE 15, PT 10) e teto de 200 por mês, calculado na tabela `execucoes`. A execução
  fica registrada antes das gravações, para o teto contar os créditos mesmo se algo falhar.
- **Ganho:** o `final_url` revela o ATS. A empresa vai para o banco e passa a ser varrida todo
  dia de graça pela API pública dela.
- **Teste explícito:** `uv run python -m coletor descobrir --dry-run --amostra 1 --theirstack 5`
  gasta no máximo 5 créditos e não grava nada.
- **Sem `THEIRSTACK_API_KEY`**, a fonte é pulada.

## Ficou para depois

- Busca de email no site da empresa (página de carreiras, aviso legal, Impressum) e Hunter.
- Detecção do ATS a partir do site, para as empresas que só têm domínio (`remote-es` sem
  link de ATS e `marmelo/tech-companies-in-portugal`).
- Registros oficiais de agências (SNE, IEFP, BA AÜG).
- InfoJobs, Adzuna e ITJobs (sem chave por agora).
