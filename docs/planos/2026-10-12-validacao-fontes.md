# Validação ao vivo das fontes de vagas (2026-10-12)

Etapa 1 do roteiro. Foi feita uma chamada por endpoint, só de leitura, sem chave e sem
gravar nada. Serve de base ao plano do coletor (etapa 3) e fecha a pendência "validação ao
vivo" do [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md).

## Resumo não-técnico

- **16 das 19 fontes testadas funcionam sem cadastro.**
- **Descoberta importante:** o Recruitee, sistema de recrutamento muito usado na Holanda,
  traz em cada vaga um **email da própria empresa para receber candidaturas**. É contato
  direto, sem intermediário.
- As fontes com melhores dados de país e de regime (remoto ou híbrido) são **Ashby, Lever,
  Recruitee, SmartRecruiters, Teamtailor e Workable**.
- Três fontes precisam de uma chave grátis que só o Jefferson pode pedir: **InfoJobs**
  (Espanha), **ITJobs** (Portugal) e **Adzuna** (UE).
- O RSS do Tecnoempleo não tem URL fixa: é preciso gerar o feed no site.

## Resultado por fonte

### Sistemas de recrutamento (ATS), consultados empresa por empresa

| Fonte | Status | Empresa testada | Vagas | País / regime | Observação |
|---|---|---|---|---|---|
| Ashby | ✅ 200 | n8n | 40 | `workplaceType` (Remote/Hybrid/OnSite), `isRemote`, `address` | Os campos mais completos |
| Lever (global) | ✅ 200 | spotify | 83 | `workplaceType` (hybrid…), `country` (ISO-2) | `mistral` respondeu 200 com 0 vagas (empresa sem vagas ou mudou de ATS) |
| Lever (instância UE) | ❌ 404 | mistral, glovo, contentful | — | — | Nenhuma das testadas está na instância UE. Usar só se a empresa estiver lá. |
| Greenhouse | ✅ 200 | gitlab | 221 | `location.name` em texto (ex.: "Remote, France") | O regime vem do texto |
| Personio | ✅ 200 | tado | 1 | `office` em texto, `seniority`, `yearsOfExperience`, `keywords` | `taxfix` deu 404. O slug precisa ser descoberto empresa a empresa. |
| Recruitee | ✅ 200 | vandebron | 13 | `remote`, `hybrid`, `on_site`, `country_code`, `city` | **`mailbox_email` preenchido em 13 de 13 vagas** (`…@{empresa}.recruitee.com`) |
| Teamtailor (RSS) | ✅ 200 | polestar | 22 | `remoteStatus` (`hybrid`, `none`, `onsite`), localização | |
| SmartRecruiters | ✅ 200 | Ubisoft2 | 343 | `location.country`, `location.remote`, `location.hybrid` | `Visa` deu 200 com 0 vagas |
| Workable | ✅ 200 | blueground | 8 | `country`, `city`, `telecommuting` | `hellofresh` deu 200 com 0 vagas; `workable` deu 404 |

### Agregadores e portais

| Fonte | Status | Vagas por chamada | País / regime | Observação |
|---|---|---|---|---|
| Arbeitnow | ✅ 200 | 325 por página | `remote` (booleano), `location` | Alemanha e UE; dados vindos de ATS |
| Bundesagentur für Arbeit | ✅ v6 / ❌ v4 | 3.483 para "Softwareentwickler" | A estudar | **A v4 dá 403; a v6 funciona** com `X-API-Key: jobboerse-jobsuche`. Resultados em `ergebnisliste`. O filtro `arbeitszeit=ho` devolve 0 na v6, então o parâmetro de home office precisa ser descoberto. |
| Himalayas | ✅ 200 | 20 | `country=ES` funciona; `locationRestrictions` | Só vagas remotas |
| Remotive | ✅ 200 | 15 | `candidate_required_location` (a maioria "Worldwide") | No máximo 4 chamadas por dia |
| RemoteOK | ✅ 200 | 99 | `location` livre e pouco preenchida | Pouca utilidade para filtrar por país |
| We Work Remotely (RSS) | ✅ 200 | 25 | `region` | |
| Landing.jobs | ✅ 200 | 50 | `remote`, `locations`, faixa salarial | A documentação era antiga, mas a API funciona |
| Tecnoempleo (RSS) | ❌ 404 | — | — | Não há URL fixa. O feed é gerado a partir de uma busca no site. |
| InfoJobs, ITJobs, Adzuna | ⏸ não testadas | — | — | Precisam de chave grátis, a pedir pelo Jefferson |

### Listas para descobrir empresas

| Fonte | Status | Conteúdo |
|---|---|---|
| `remote-es/remotes` | ✅ | README com cerca de 300 linhas de lista: empresas com contrato espanhol e remoto |
| `remoteintech/remote-jobs` | ✅ | 886 empresas, um arquivo por empresa (`src/companies/`) |

## Consequências para o plano do coletor

1. **Prioridade de implementação**, pela qualidade dos dados: Ashby, Lever, Recruitee,
   SmartRecruiters, Teamtailor, Workable, Arbeitnow e Landing.jobs. Depois Greenhouse,
   Personio e Himalayas. Por último a Bundesagentur v6 e os RSS de vagas remotas.
2. **Contato direto:** o `mailbox_email` do Recruitee entra como fonte número 1 de email,
   antes da busca no site da empresa. A candidatura cai no sistema de recrutamento da própria
   empresa, sem intermediário.
3. **Slugs:** o ATS de cada empresa precisa de detecção. Um 200 com 0 vagas não indica erro:
   a empresa existe, mas não tem vagas abertas.
4. **Regime em texto livre** (Greenhouse, Personio, RemoteOK): exige classificação por
   palavras-chave ou pelo LLM.
5. **Bundesagentur:** usar a v6 e descobrir o filtro de home office antes de implementar.
6. **Ações do Jefferson** (quando chegar a etapa do coletor): pedir as chaves grátis da
   InfoJobs, do ITJobs e da Adzuna, e gerar no site do Tecnoempleo o RSS de uma busca
   ("desarrollador", teletrabajo).
