# ADR-0003: O site como painel de controle

**Status:** Aceito
**Data:** 2026-10-14
**Decisor:** Jefferson Vieira
**Altera:** [ADR-0001](ADR-0001-arquitetura-buscador-vagas.md) (perfil em arquivo) e
[ADR-0002](ADR-0002-interface-web-vercel.md) (o site só lia o banco)

---

## Resumo não-técnico

O site deixa de ser só uma tela de leitura e passa a controlar o buscador inteiro pelo
celular:

- **Rodar a varredura ou a descoberta** com um botão, acompanhando o estado em tempo real.
- **Editar o seu perfil** (competências, níveis, países, idiomas, experiência). A próxima
  varredura já usa os dados novos.
- **Agenda interna:** os horários em que você aceita entrevistas, os bloqueios (férias) e as
  entrevistas marcadas.
- **Resposta da empresa:** você cola o email (ou, no Android, partilha a partir do Gmail).
  O buscador diz se é recusa, convite ou pedido de informação e sugere a ação, aplicada com
  um toque:
  - **recusa:** a candidatura fica "recusada" e a empresa é bloqueada;
  - **convite:** a resposta já sugere três horários livres da agenda.

Nada sai sozinho: todo email é enviado por você, e toda ação é confirmada por um toque.

---

## Decisão

### 1. Disparo do coletor pelo site

- O site chama a API do GitHub
  (`POST /repos/{repo}/actions/workflows/{arquivo}/dispatches`, `ref: main`) para
  `coletor-varrer.yml` ou `coletor-descobrir.yml`. O estado vem de
  `GET /repos/{repo}/actions/runs`.
- **Credencial:** um *fine-grained personal access token* do GitHub, criado pelo Jefferson:
  - com acesso **só ao repositório `buscador`**;
  - com **só a permissão "Actions: Read and write"**;
  - guardado como `GITHUB_TOKEN` nas variáveis do Vercel, **só no servidor**.
  - Se vazar, só permite disparar e ler execuções deste repositório.
- **Rota:** `web/app/api/coletor/route.ts`. Exige o usuário autenticado e o email permitido.
  Só aceita `varrer` ou `descobrir`.
- **Alternativas descartadas:**
  - **Coletor a correr no próprio Vercel:** limites de tempo das funções e o coletor Python
    não cabem lá.
  - **Webhook público:** exigiria outro segredo exposto à internet.

### 2. Perfil no banco

- **Tabela `perfis`** (migration `0003_perfil_e_agenda.sql`): um registro por usuário, com o
  conteúdo em JSON e RLS.
- **No site:** a tela `/perfil` edita os dados e salva com `upsert`. Na primeira vez, mostra
  o conteúdo de `config/perfil.yaml` (cópia em `web/lib/perfil-inicial.json`).
- **No coletor:** lê o perfil do banco (`Banco.perfil()`, com `select` só nessa tabela). Se
  não houver registro, usa o `config/perfil.yaml`, que fica como reserva.
- **Dados de contato** (telefone, morada) não fazem parte do perfil e nunca vão para os
  prompts.

### 3. Agenda e resposta da empresa

- **Tabelas `agenda_disponibilidade`, `agenda_bloqueios` e `entrevistas`**, com RLS. O coletor
  não tem acesso a elas.
- **Horários livres** (`web/lib/agenda.ts`):
  - disponibilidade semanal em hora de Lisboa, com conversão de fuso pelo `Intl` (inclui o
    horário de verão);
  - descontados os bloqueios e as entrevistas, com 30 min de margem;
  - 24 h de antecedência mínima e um horário por dia.
  - Testes em `web/lib/agenda.test.ts`.
- **Resposta da empresa** (`web/app/api/resposta-empresa/route.ts`):
  - o **Claude Haiku 5.5** classifica (`recusa`, `convite_entrevista`, `pedido_informacao`,
    `outro`) com saída estruturada (zod);
  - o **Claude Opus 5.5** escreve a resposta com `fallbacks: "default"`;
  - no convite, recebe os horários já calculados, no fuso e idioma da empresa;
  - limite de 6 pedidos por minuto.
- **O email colado não é guardado.**
- **Partilhar no Android:** o manifesto do app (PWA) tem `share_target` por **POST** para
  `/api/partilhar`. Essa rota redireciona com o texto no fragmento (`#`), que o navegador nunca
  envia ao servidor, por isso o email não fica em logs nem no histórico.
- **Agenda no calendário:** cada entrevista exporta um `.ics` (`/api/entrevistas/{id}/ics`).

### 4. Segurança (OWASP Top 10 for LLM Applications 2025)

- **Email da empresa:** é dado não confiável. Vai entre `<email>` e `</email>`, e um
  `</email>` dentro do texto é removido. Os modelos não têm ferramentas, e a saída é só texto
  para o Jefferson revisar.
- **Ações:** só com confirmação (botões "Aplicar", "Confirmar", "Guardar").
- **Acesso:** toda página, ação e rota chama `supabase.auth.getUser()` e confere o
  `EMAIL_PERMITIDO`. Todas as consultas levam `owner_id` explícito, além do RLS.
- **Cabeçalhos:** CSP, `X-Frame-Options: DENY`, `nosniff` e `Referrer-Policy`.

---

## Consequências

**Positivas**

- Tudo é feito pelo celular: rodar, ajustar o perfil, responder e agendar.
- As decisões manuais têm um toque cada uma, e o histórico fica no banco.

**Negativas e trade-offs**

- **Um segredo novo** (o token do GitHub), embora com o menor escopo possível. O token
  fine-grained tem prazo de validade: renovar quando expirar.
- **O perfil passa a ter duas fontes** (o banco e o arquivo de reserva). O banco manda.
- **O limite do assistente é por instância** do Vercel, não global. O teto de custo real fica
  no console da Anthropic (US$ 15 por mês).
