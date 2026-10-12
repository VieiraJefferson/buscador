# ADR-0001: Arquitetura do buscador pessoal de vagas na UE

**Status:** Aceito
**Data:** 2026-10-12
**Decisor:** Jefferson Vieira
**Perfil usado nos filtros:** [`config/perfil.yaml`](../../config/perfil.yaml)

---

## Resumo não-técnico

Este projeto é um **buscador pessoal de vagas de tecnologia na Europa**. Todo dia ele
procura vagas em empresas que contratam **diretamente**, sem agências nem recrutadores
intermediários, e manda um relatório por email.

Para cada vaga boa o relatório traz:

- a empresa, o cargo, o país e o regime de trabalho (remoto ou híbrido);
- uma nota de compatibilidade com o perfil do Jefferson;
- o email de contato da própria empresa;
- **um email de candidatura pronto**, escrito para aquela vaga a partir do perfil dele e
  sem travessões, para não parecer escrito por IA.

O Jefferson revisa e envia cada email **manualmente**. A meta é cerca de 100 candidaturas
por semana: qualidade, não volume.

Quando uma empresa responde, ele cola o email no **assistente de resposta**, que escreve a
resposta ideal usando os dados do perfil como contexto. O envio, de novo, é manual.

**O que o sistema não faz, de propósito:**

- Não usa o LinkedIn. Lá há muitas agências que ficam com mais de 25% do salário, vagas
  irreais e recrutadores fora da área, além de o LinkedIn proibir robôs.
- Não procura vagas no Brasil.
- Não se candidata em plataformas (Gupy, Greenhouse e semelhantes) nem envia nada sozinho.
- Não responde emails sozinho.

**Ordem de prioridade dos países:**

1. Espanha
2. Holanda e Alemanha
3. Portugal
4. Restante da UE

Sempre remoto ou híbrido. Vagas presenciais ficam fora.

---

## Contexto

- O Jefferson é Full-Stack Developer (React, Next.js, TypeScript, Node.js, Python, AWS, OCI e
  IA com agentes), mora em Portugal e fala português, inglês e espanhol. Não fala alemão
  nem holandês.
- Ele quer **falar direto com a empresa que precisa da vaga**. Assim não depende de
  plataformas com terceiros e quartos intermediários, nem compete com currículos inflados
  e recrutadores fora da área.
- O projeto é de uso pessoal: um único usuário, repositório privado.
- A pesquisa de ferramentas, fontes e repositórios foi feita em 2026-10-12. Ela está
  resumida nos [Anexos](#anexos), com links.

---

## Decisão

### 1. Escopo

O sistema é um **buscador e gerador de rascunhos**, não um robô de candidatura.

| Faz | Não faz |
|---|---|
| Varredura diária de fontes públicas de vagas | Login ou automação em portais de emprego |
| Filtro por perfil, país, regime, idioma e senioridade | Candidatura em ATS ou formulários |
| Exclusão de agências e intermediários | Envio automático de email |
| Busca do email de contato direto da empresa | Resposta automática a recrutadores |
| Geração de email de candidatura pronto | Uso do LinkedIn, em qualquer forma |
| Relatório diário por email | Vagas no Brasil |
| Assistente de resposta (o usuário cola o email recebido) | |

### 2. Prioridade geográfica e regime

| Ordem | Países | Regime aceito |
|---|---|---|
| 1 | Espanha (ES) | Remoto ou híbrido |
| 2 | Holanda (NL), Alemanha (DE) | Remoto ou híbrido |
| 3 | Portugal (PT) | Remoto ou híbrido |
| 4 | Restante da UE | Remoto ou híbrido |

- Vagas presenciais são sempre excluídas. Vagas no Brasil também.
- Na Holanda e na Alemanha, vagas que **exigem alemão ou holandês fluente** são excluídas.
- **Autorização de trabalho e sponsor não são filtrados.** O Jefferson trata isso diretamente
  com cada empresa.
- No relatório, a ordem dos países pesa antes da nota de compatibilidade.

### 3. Fontes de vagas

O critério é ter um endpoint público ou uma API documentada, ser grátis e trazer, de
preferência, vagas publicadas pelo próprio empregador.

**3.1 ATS das empresas (fonte principal).** Um ATS é o sistema de recrutamento que a
própria empresa usa. A vaga publicada lá é da empresa, não de um intermediário. O sistema
usa o ATS **só para descobrir a vaga**; o contato é feito por email, direto com a empresa.

| ATS | Endpoint público | Campos úteis |
|---|---|---|
| Ashby | `api.ashbyhq.com/posting-api/job-board/{nome}` | `workplaceType`, `isRemote`, país |
| Lever | `api.lever.co/v0/postings/{site}?mode=json` (e `api.eu.lever.co`) | `workplaceType`, `country` |
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | `location.name` (texto) |
| Personio | `{empresa}.jobs.personio.de/xml` | `office`, `seniority` (remoto vem do texto) |
| Recruitee | `{empresa}.recruitee.com/api/offers/` | `remote`, `hybrid`, `country_code` |
| Teamtailor | `{carreiras}/jobs.rss` | `remoteStatus` |
| SmartRecruiters | `api.smartrecruiters.com/v1/companies/{id}/postings` | `country`, `city` |

**3.2 Fontes por país.**

| País | Fonte | Acesso |
|---|---|---|
| ES | InfoJobs API (`api.infojobs.net/api/9/offer`, filtro `teleworking`) | Registro grátis de desenvolvedor |
| ES | Tecnoempleo (RSS gerado a partir de uma busca no site; sem URL fixa) | Público |
| DE | Bundesagentur für Arbeit, Jobsuche **v6** (a v4 dá 403) | Chave pública fixa |
| DE / UE | Arbeitnow (`arbeitnow.com/api/job-board-api`) | Público |
| PT | ITJobs.pt (`api.itjobs.pt`, `workModel`, traz email da empresa) | Chave grátis |
| PT / UE | Landing.jobs (`landing.jobs/api/v1/jobs`) | Público (validado em 2026-10-12) |
| UE | Adzuna (es, nl, de, at, be, it, fr, pl; não cobre PT) | Chave grátis, 250 pedidos/dia |
| UE remoto | Himalayas (`?country=ES`), Remotive | Público, com atribuição |

**3.3 Descoberta de empresas.**

- Listas iniciais: `remote-es/remotes` (empresas com contrato espanhol), `python-spain/empresas`
  e `remoteintech/remote-jobs`. A essas se soma uma curadoria manual do Jefferson.
- Cada empresa nova tem o seu ATS detectado: pelos links da página `/careers` ou testando o
  slug em cada API pública (devolve 404 se não existir). O slug detectado fica salvo para as
  varreduras seguintes.
- Os agregadores (Arbeitnow, BA, Adzuna) também revelam empresas novas.

### 4. Exclusão de agências e intermediários

Aplicada em camadas, da mais barata para a mais cara:

1. **Lista de bloqueio de domínios e nomes**, mantida manualmente.
2. **Palavras-chave** como "on behalf of our client", "para importante cliente", "staffing",
   "headhunter", "recruitment agency", "Personaldienstleister", "Arbeitnehmerüberlassung",
   "ETT", "uitzendbureau" e "detachering".
3. **Regra estrutural:** vaga no ATS do próprio domínio da empresa conta como contratação
   direta, com alta probabilidade.
4. **Classificação por LLM:** "empresa contratante" ou "intermediário", com saída estruturada
   e só para os casos que sobram.
5. Verificação pontual opcional pelo código de atividade NACE 78 ("atividades de emprego"),
   por exemplo na KvK holandesa. Não é automática.

### 5. Contato direto da empresa

Ordem de busca:

1. Email que a própria fonte já traz: Recruitee `mailbox_email` (caixa de candidaturas da
   empresa, presente em todas as vagas testadas), ITJobs `company.email`, JOIN `contactEmail`.
2. Páginas públicas da empresa: `/careers`, `/jobs`, `/contact`, `/impressum` (obrigatório
   na Alemanha) e `/aviso-legal` (obrigatório na Espanha, LSSI art. 10).
3. Padrões genéricos, confirmados por registro MX: `careers@`, `jobs@`, `talent@`, `hr@`,
   `rrhh@`, `empleo@`, `bewerbung@`, `karriere@`, `vacatures@`, `werkenbij@`, `recrutamento@`.
4. Opcional: Hunter.io, com 50 pesquisas grátis por mês.

**Preferência por emails genéricos de função.** Emails nominais de pessoas só pontualmente
(ver [RGPD](#9-rgpd-e-eprivacy)). Não há verificação SMTP por RCPT TO, porque é pouco
confiável e a porta 25 costuma estar bloqueada em runners de cloud.

### 6. Pontuação e geração do email

- **Filtros determinísticos primeiro** (país, regime, idioma, senioridade, agência). O LLM só
  recebe as vagas que passam.
- **Pontuação de compatibilidade** de 1 a 5 contra `config/perfil.yaml`, com saída
  estruturada. A referência de método é o `career-ops`, que pontua cada vaga contra o CV
  com LLM, e o `Resume-Matcher`.
- **LLM:** **API da Claude**, com um modelo por tarefa (decisão do Jefferson, opção "b1",
  teto de US$ 15 por mês):
  - **Claude Haiku 5.5** (`claude-haiku-5-5`): classificar agência e pontuar as vagas, no
    GitHub Actions. É o maior volume, por isso fica com o modelo mais barato.
  - **Claude Sonnet 5.5** (`claude-sonnet-5-5`): escrever os emails de candidatura, no
    GitHub Actions.
  - **Claude Opus 5.5** (`claude-opus-5-5`): o assistente de resposta no site (ADR-0002).
    O volume é baixo e cada resposta pesa mais.
- **Email de candidatura:**
  - **Não existe texto fixo.** Cada email é escrito do zero pela API da Claude para aquela
    vaga, cruzando a descrição da vaga com `config/perfil.yaml`.
  - **Proibido usar "—" e "–".** Um validador pós-geração rejeita o texto se aparecer algum.
  - O Jefferson aparece sempre **como candidato**, nunca como freelancer ou empresa.
  - O idioma do email segue o da vaga: espanhol, inglês ou português.

### 7. Assistente de resposta

- O Jefferson cola o email recebido. O assistente devolve o rascunho da resposta, usando o
  perfil, o histórico da candidatura e a disponibilidade dele como contexto.
- **Interface:** decidida no [ADR-0002](ADR-0002-interface-web-vercel.md). É um site em
  Next.js no Vercel, usado pelo celular.
- **Segurança:** o email colado é **dado, nunca instrução** (OWASP LLM01, injeção de prompt
  indireta). O assistente não tem ferramentas de envio. O resultado é só texto para o
  Jefferson revisar.

### 8. Execução, relatório e armazenamento

| Tema | Decisão |
|---|---|
| Linguagem | Python 3.12 (proposta; confirmar no plano de implementação) |
| Agendamento | **GitHub Actions** `schedule`, uma vez por dia, em **repositório privado** |
| Relatório | **Email**, enviado por uma **conta Gmail dedicada** para ela mesma; o Jefferson ativa as notificações dessa conta. O email pessoal fica fora. |
| Envio do relatório | SMTP do Gmail com **App Password** da conta dedicada, guardada em GitHub Secrets |
| Estado entre execuções | **Substituído pelo [ADR-0002](ADR-0002-interface-web-vercel.md):** banco Supabase na região UE, compartilhado com a interface web. Sem commits automáticos. |
| Segredos | GitHub Secrets (App Password da conta dedicada e chave da API da Claude). Nada em arquivo versionado (ver `.gitignore`). |

**Por que App Password e não OAuth:** um projeto OAuth do Google em modo "Testing" tem
refresh tokens que expiram em 7 dias, o que quebraria a varredura diária. A App Password dá
acesso total à conta, o que seria arriscado numa conta pessoal. Numa conta dedicada, sem
nada sensível, esse risco fica contido.

**Por que GitHub Actions:** é grátis em repositório privado (2.000 minutos por mês) e não
depende de o computador estar ligado. A desativação após 60 dias sem atividade só vale
para repositórios públicos. Atrasos de alguns minutos no horário foram aceitos pelo
Jefferson.

### 9. RGPD e ePrivacy

- **Exceção doméstica (RGPD art. 2(2)(c)):** é defensável para um indivíduo que gerencia a
  própria busca de emprego numa base privada e não publicada, mas não é garantida (TJUE
  Ryneš, C-212/13). Se não se aplicar, existe a base do interesse legítimo, art. 6(1)(f).
- **Regras de desenho:**
  - repositório privado;
  - a base de contatos **nunca é publicada** (TJUE Lindqvist, C-101/01);
  - **contatos apagados após 6 a 12 meses**;
  - preferência por emails genéricos;
  - pedidos de oposição são atendidos.
- **Candidatura espontânea:** a AEPD trata o CV espontâneo como prática normal. Quem trata os
  dados do candidato é a empresa.
- **ePrivacy art. 13** se aplica a marketing direto. Uma candidatura de emprego não é
  comunicação comercial, desde que o Jefferson escreva como candidato.
- **Não usar Apollo nem bases derivadas do LinkedIn.** A CNIL multou a KASPR em 240 mil euros
  (SAN-2024-020) por recolher contatos do LinkedIn.
- Este enquadramento é técnico, com fontes. Não é parecer jurídico.

### 10. Segurança

- Conteúdo externo (descrições de vagas, páginas de empresas, emails colados) é tratado como
  **não confiável**. Esse conteúdo vai para o LLM separado das instruções, e o LLM não tem
  ferramentas com efeito externo (OWASP LLM01 e LLM06).
- A saída do LLM é validada contra um esquema antes de ser usada (OWASP LLM05).
- Slugs e URLs de empresas são validados antes de qualquer pedido HTTP, para evitar SSRF.
- Respeito aos ToS e aos limites de cada fonte (Remotive no máximo 4 pedidos por dia, Adzuna
  250 por dia), com atribuição onde for exigida.
- Morada, telefone e o PDF do CV não entram no git.
- **Regra 14 do toolkit:** cada uso de IA (classificação de agência, pontuação, geração de
  email) entra com um teste que falha antes e passa depois, por exemplo um email com
  travessão que precisa ser rejeitado.

---

## Alternativas consideradas e descartadas

| Alternativa | Por que foi descartada |
|---|---|
| LinkedIn por API oficial | Não existe API de vagas para indivíduos. Job Posting e Apply Connect são só para empresas parceiras e não aceitam novos parceiros. |
| LinkedIn por scraping ou bots (JobSpy, MCPs de LinkedIn, robôs de Easy Apply) | O User Agreement 8.2 proíbe, com risco de banir a conta. Além disso, o Jefferson não quer o LinkedIn pelas agências. |
| Alertas de vaga do LinkedIn lidos pelo Gmail | Legítimo, mas fora do escopo: o LinkedIn foi excluído por decisão de produto. |
| Candidatura automática em ATS (Gupy, Greenhouse e outros) | O objetivo é contato direto. Formulários exigem login e intervenção humana. |
| Resposta automática a convites | Risco de injeção de prompt e de falsos positivos. A reputação profissional não é reversível. |
| Notificação por Telegram | O Jefferson não usa as notificações do Telegram. |
| WhatsApp Cloud API | Pago por mensagem e com configuração pesada para uso pessoal. |
| Gmail API com OAuth para o relatório | O token expira a cada 7 dias em modo Testing. A App Password da conta dedicada resolve com menos peças. |
| Cron local ou Agendador do Windows | Depende de o computador estar ligado. |
| Cloudflare Workers Cron | O plano grátis só dá 10 ms de CPU por execução. |
| Fontes brasileiras (Gupy, backend-br, frontendbr) | O Brasil está fora do escopo. |
| Manfred (ES) | É agência. |
| EURES, Werk.nl | Sem API pública. |
| Jooble | Só 500 pedidos no total por chave. |
| Apollo, Snov.io | Risco RGPD (Apollo); Snov não tem API no trial. |

---

## Consequências

**Positivas**

- Só contato direto com quem contrata, que é o objetivo do produto.
- Fontes legais e grátis, sem risco para contas pessoais.
- O Jefferson tem controle total do que sai em nome dele.
- Custo de infraestrutura zero (GitHub Actions privado, Gmail dedicado e, pelo ADR-0002, planos grátis do Vercel e do Supabase).

**Negativas e trade-offs**

- Nem toda empresa publica um email de contato. Parte das vagas vai aparecer no relatório
  sem email, e aí o Jefferson decide caso a caso.
- Os ATS só são consultados empresa por empresa. A cobertura depende da lista de empresas,
  que cresce com o tempo.
- O regime remoto ou híbrido vem como texto livre em alguns ATS (Greenhouse, Personio), e a
  classificação pode errar.
- Endpoints não documentados (Landing.jobs, alguns ATS) podem mudar sem aviso.
- As regras do toolkit foram **copiadas** para este repositório. Alterações futuras no
  toolkit precisam ser trazidas à mão.

---

## Ressalva do ponto focal técnico (custos)

As decisões abaixo são financeiras e ficam com o Jefferson.

| Item | Opções |
|---|---|
| Modelos Claude | **Decidido (opção b1), teto de US$ 15 por mês:** Haiku 5.5 para pontuar (US$ 0,10/0,50 por milhão de tokens), Sonnet 5.5 para os emails (US$ 2/10) e Opus 5.5 para o assistente (US$ 4/20), pela tabela oficial de 2026-10-06. Estimativa: ~US$ 4 + ~US$ 6 + ~US$ 3 = **~US$ 13 por mês**, com ~300 vagas pontuadas e ~15 emails por dia. No Opus 5.5 o raciocínio é sempre cobrado como saída, por isso o esforço fica baixo e o perfil vai em cache. O teto é garantido por um limite de gasto no console da Anthropic, definido pelo Jefferson. A Batch API (50% de desconto) pode ser usada na pontuação. |
| Busca de emails | (a) só sites das empresas, grátis; (b) Hunter.io grátis, 50 por mês; (c) Hunter.io pago |
| Fontes pagas (JSearch, SerpApi) | Não incluídas. Só entram se as grátis não bastarem. |

---

## Em aberto

Validação ao vivo das fontes: concluída em 2026-10-12, ver
[`docs/planos/2026-10-12-validacao-fontes.md`](../planos/2026-10-12-validacao-fontes.md).

1. **Achado, não está no backlog:** o CV em PDF está desatualizado em relação ao portfólio.
   Faltam o contrato atual (Bob Burnquist Holdings), Next.js, Supabase, a stack AWS completa,
   OCI e a formação em agentes.

---

## Anexos

### A. Repositórios do GitHub avaliados (2026-10-12)

| Repositório | Licença | Uso neste projeto |
|---|---|---|
| [career-ops-hq/career-ops](https://github.com/career-ops-hq/career-ops) | MIT | **Referência principal**: pontuação 1 a 5 com LLM, varredura de ATS (Greenhouse, Ashby, Lever), automação diária, roda no Claude Code. Não envia emails. |
| [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher) | Apache-2.0 | Referência para a compatibilidade entre CV e vaga |
| [remote-es/remotes](https://github.com/remote-es/remotes) | ver repositório | Lista inicial de empresas para a Espanha |
| [remoteintech/remote-jobs](https://github.com/remoteintech/remote-jobs) | ver repositório | Lista inicial de empresas remote-friendly |
| [dgtlmoon/changedetection.io](https://github.com/dgtlmoon/changedetection.io) | Apache-2.0 | Opcional: monitorar páginas de carreira sem ATS |
| [bundesAPI/jobsuche-api](https://github.com/bundesAPI/jobsuche-api) | ver repositório | Documentação da API da Bundesagentur für Arbeit |
| [speedyapply/JobSpy](https://github.com/speedyapply/JobSpy) | MIT | **Não usado:** o foco no LinkedIn e no Indeed não serve ao contato direto |
| GodsScion/Auto_job_applier_linkedIn, wodsuz/EasyApplyJobsBot, NathanDuma/LinkedIn-Easy-Apply-Bot | variadas | **Evitar:** robôs de Easy Apply no LinkedIn |
| stickerdaniel/linkedin-mcp-server | Apache-2.0 | **Evitar:** automatiza a sessão real do LinkedIn |
| feder-cr/Auto_Jobs_Applier_AIHawk | MIT | **Evitar:** hoje redireciona para um projeto focado em evitar a detecção anti-bot |

### B. Fontes de vagas: referência rápida

| Fonte | País | Custo e limites | Remoto/híbrido | Observação |
|---|---|---|---|---|
| Ashby, Lever, Greenhouse | todos | Grátis | Ashby e Lever: campo; Greenhouse: texto | [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api) · [Lever](https://github.com/lever/postings-api) · [Greenhouse](https://docs.greenhouse.io/job-board.html) |
| Personio XML | DE, ES | Grátis | Texto | [docs](https://developer.personio.de/docs/retrieving-open-job-positions) |
| Recruitee | NL, DE | Grátis | Campo | Validado; traz `mailbox_email` da empresa em cada vaga |
| Teamtailor RSS | NL, DE | Grátis, até 100 itens | Campo | [guia](https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide) |
| SmartRecruiters | todos | Grátis | País no servidor | [docs](https://developers.smartrecruiters.com/docs/customer-overview) |
| InfoJobs | ES | Registro grátis | `teleworking` | [developer.infojobs.net](https://developer.infojobs.net); ler os ToS |
| Tecnoempleo | ES | Grátis | Busca `teletrabajo` | RSS gerado no site; filtrar agências |
| Bundesagentur für Arbeit | DE | Grátis | Filtro de home office a descobrir na v6 | Filtrar Personaldienstleister |
| Arbeitnow | DE, UE | Grátis | `remote` | [blog](https://www.arbeitnow.com/blog/job-board-api) |
| ITJobs.pt | PT | Chave grátis | `workModel` | [docs](https://www.itjobs.pt/api/docs/job); traz email |
| Landing.jobs | PT, UE | Grátis | `remote` | Validado em 2026-10-12 |
| Adzuna | UE exceto PT | 250 pedidos/dia, 2.500/mês | Palavra-chave | [ToS](https://developer.adzuna.com/docs/terms_of_service); muitas agências |
| Himalayas | UE | Grátis | Remoto | [docs](https://himalayas.app/docs/remote-jobs-api) |
| Remotive | remoto | No máximo 4 pedidos/dia | `candidate_required_location` | [repo](https://github.com/remotive-com/remote-jobs-api); sem redistribuição |

### C. Referências

- LinkedIn User Agreement, secção 8.2: https://www.linkedin.com/legal/user-agreement
- LinkedIn Job Posting API (não aceita novos parceiros): https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview
- OWASP Top 10 for LLM Applications 2025: https://owasp.github.io/www-project-top-10-for-large-language-model-applications/
- Google OAuth 2.0, expiração de refresh tokens: https://developers.google.com/identity/protocols/oauth2
- Gmail App Passwords: https://support.google.com/mail/answer/185833
- GitHub Actions, evento `schedule`: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- TJUE Ryneš C-212/13: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62013CJ0212
- CNIL, sanção KASPR: https://www.cnil.fr/en/data-scraping-kaspr-fined-eu240000
- ICO, marketing B2B: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/
