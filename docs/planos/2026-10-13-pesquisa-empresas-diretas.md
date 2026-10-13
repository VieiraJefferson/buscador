# Pesquisa: como encontrar empresas que contratam diretamente (2026-10-13)

Pesquisa feita com cinco agentes em paralelo. Os preços e números foram vistos em
2026-10-13. Ela complementa a [validação de fontes](2026-10-12-validacao-fontes.md) e
altera a seção 3 do [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md).

## Resumo não-técnico

- **Os portais grandes de emprego não servem como fonte.** InfoJobs e Indeed/Glassdoor proíbem
  automação nos termos de uso. O Tecnoempleo é dominado por recrutadoras e consultoras: só
  cerca de 5% do volume é claramente de empregadores diretos.
- **A melhor estratégia é "empresa primeiro":** descobrir as empresas que contratam a stack
  do Jefferson e ler as vagas no site ou no sistema de recrutamento da própria empresa. É
  grátis e só traz empregadores diretos.
- **Decisão do Jefferson: custo zero.** Os serviços pagos (~€155 a 200 por mês) são feitos
  para equipes de vendas com milhares de empresas por mês. Para ~100 bons matches por semana,
  o plano grátis basta. Se a cobertura ficar curta, o pago é reavaliado.

## Estratégia adotada (custo zero)

| Peça | Para quê | Custo |
|---|---|---|
| **Listas abertas de empresas por ATS** (`kalil0321/ats-scrapers`, MIT, ~24 mil empresas nos 8 ATS validados e ~23 mil no JOIN; `veresk06/open-ats-feed`, MIT, 18 mil boards vivos) | Volume: base de empresas a consultar | Grátis |
| **APIs públicas dos ATS** (Ashby, Lever, Greenhouse, Personio, Recruitee, Teamtailor, SmartRecruiters, Workable) | Ler as vagas da própria empresa. É 100% empregador direto | Grátis |
| **Listas por país:** `marmelo/tech-companies-in-portugal` (PT, com cidade), `inazr/job_scanner` (DE), `remote-es/remotes` (ES, sem licença, só consulta), ACCIÓ Startup Hub (Barcelona), Startupxplore (ES), Techleap Finder (NL, consulta manual) | Empresas com sinal de país | Grátis |
| **TheirStack, plano grátis** (50 empresas + 200 vagas por mês) | Filtro de qualidade: empresas que contratam a stack, por país, com `company_type=direct_employer` e domínio | Grátis |
| **Agregadores grátis:** Arbeitnow, Himalayas (`country=`), Landing.jobs (com filtro de consultoras), Bundesagentur v6 com `zeitarbeit=false&pav=false` | Complemento | Grátis |
| **Hunter, plano grátis** (50 buscas por mês) | Último recurso para o email | Grátis |
| **Alertas manuais por email:** JobFluent ("no recruiters", BCN/MAD), Welcome to the Jungle, Relocate.me, hiring.cafe | Uso manual no celular | Grátis |

### Pipeline

1. **Encontrar empresas:** listas abertas + listas por país + TheirStack grátis.
2. **Excluir intermediários:**
   - lista negra própria (Accenture, NTT Data, Capgemini, Sopra Steria, Indra, Viewnext,
     UST, Deloitte, Hays, Michael Page, Randstad, Adecco, Jobandtalent, Manfred, Jobgether…);
   - registros oficiais de agências: SNE (agencias de colocación, ES), IEFP (empresas de
     trabalho temporário, PT), BA AÜG (DE);
   - palavras-chave ("our client", "nuestro cliente", "unser Kunde"…);
   - classificação por IA.
3. **Ver as vagas no site da empresa:** pelo domínio, achar a página de carreiras e o ATS e
   ler pela API pública. Se não houver ATS conhecido, ler o JSON-LD `JobPosting`.
4. **Contato:** `mailbox_email` do Recruitee, página de carreiras, aviso legal ou Impressum,
   padrões genéricos e, por último, o Hunter grátis.

### Primeira passagem e varredura diária

As listas abertas não trazem o país. Por isso:

- **na primeira passagem** (e depois uma vez por semana), o coletor testa cada empresa e
  guarda só as que têm vagas nos países do Jefferson;
- **na varredura diária**, consulta só essas empresas.

Assim não são feitos ~24 mil pedidos por dia.

## O que é cada serviço

- **TheirStack:** ferramenta de vendas B2B que descobre empresas pelas vagas que elas
  publicam. Traz vagas (título, descrição, país, regime, salário, data, link, fonte) e
  empresas (nome, domínio, setor, tamanho, tecnologias, empregador direto ou agência). Cerca
  de 40% dos dados vêm do Indeed e 19% do LinkedIn, recolhidos pelo próprio TheirStack. Não
  lista Portugal nas estatísticas. Não publica como classifica "empregador direto", e algumas
  agências escapam ao filtro.
- **Hunter:** ferramenta de vendas que encontra os emails publicados na internet para um
  domínio (genéricos e de pessoas), o padrão de email e verificação. Usar só emails genéricos
  de RH (RGPD).

## Descartado

| Opção | Motivo |
|---|---|
| InfoJobs (API) | Termos proíbem apps que agregam ofertas; registro de apps suspenso |
| Indeed / Glassdoor | Termos proíbem automação; sem API de leitura (Glassdoor fundida na Indeed em 2026-07) |
| Tecnoempleo como fonte principal | Dominado por intermediários |
| Jobandtalent | É ETT |
| Jobgether | Intermediário |
| Talent.com | Agregador pago por clique |
| Honeypot | Fechou em 2025 |
| BuiltWith, Wappalyzer | Detectam tecnologia do site e não das vagas (sinal errado); US$ 250 a 495 por mês |
| Crunchbase, Dealroom, SABI, Coresignal, Mantiks, Techmap feed | Caros para uso pessoal ou fora do critério |
| Planos pagos do TheirStack e Fantastic.jobs | Decisão de custo zero do Jefferson; reavaliar se faltar cobertura |

## Pontos a validar na implementação

- Testar no TheirStack grátis (contar resultados não gasta créditos) quantas empresas
  passam o filtro por país e se ~20 consultoras espanholas conhecidas são classificadas como
  agência.
- Os slugs das listas abertas precisam de validação. A taxa de aproveitamento medida pelo
  `veresk06` vai de 38% (Lever) a 73% (Ashby).
- O host do Greenhouse aparece como `boards.greenhouse.io` e `job-boards.greenhouse.io`: aceitar
  os dois.
- `remote-es/remotes` não tem licença: usar só como consulta, sem redistribuir.

## Fontes principais

- TheirStack: [preços](https://theirstack.com/en/pricing), [planos](https://theirstack.com/en/docs/pricing/plans), [busca de empresas](https://theirstack.com/en/docs/api-reference/companies/search_companies_v1), [excluir agências](https://theirstack.com/en/docs/app/job-search/excluding-recruiting-agencies), [fontes](https://theirstack.com/en/docs/data/job/sources)
- [Hunter: preços](https://hunter.io/pricing)
- [Fantastic.jobs](https://fantastic.jobs/api)
- [InfoJobs: termos da API](https://developer.infojobs.net/legal/legal/terms-of-use.xhtml)
- [Indeed: termos](https://www.indeed.com/legal)
- [Tecnoempleo: informe de emprego em informática](https://www.tecnoempleo.com/informe-empleo-informatica.php)
- [Bundesagentur Jobsuche API](https://github.com/bundesAPI/jobsuche-api)
- Listas de empresas: [kalil0321/ats-scrapers](https://github.com/kalil0321/ats-scrapers), [veresk06/open-ats-feed](https://github.com/veresk06/open-ats-feed), [marmelo/tech-companies-in-portugal](https://github.com/marmelo/tech-companies-in-portugal), [inazr/job_scanner](https://github.com/inazr/job_scanner)
- Registros de agências: [SNE agencias de colocación](https://www.sistemanacionalempleo.es/AgenciasColocacion_WEB/listadoAgencias.do?modo=inicio), [IEFP empresas de trabalho temporário](https://www.iefp.pt/en/empresas-trabalho-temporario), [BA AÜG](https://spitzenverbaende.arbeitsagentur.de)
- [JobFluent](https://www.jobfluent.com) · [hiring.cafe](https://hiringcafe.com) · [Welcome to the Jungle](https://www.welcometothejungle.com)
