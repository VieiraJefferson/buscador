# Filtros de busca orientados: como o buscador decide o que é vaga para você

**Data:** 2026-10-14
**Código:**
- `coletor/coletor/filtros.py`, `texto.py`, `dedupe.py`, `empresas.py`;
- `coletor/coletor/ia.py`, `banco.py`, `fontes/theirstack.py`;
- `config/perfil.yaml` e `coletor/coletor/dados/agencias.yaml`.

**Decisões:** [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md) e
[plano do filtro de stack](../planos/2026-10-14-filtro-stack-e-descarte.md).

Este guia junta num lugar só como o filtro foi pensado, o que cada camada faz, os números
reais e o que deu errado no caminho. Ele serve também de referência para aplicar o mesmo
desenho noutro projeto, como o `rmult-website`.

---

## Resumo não-técnico

O buscador funciona como um **funil com três camadas**, da mais barata para a mais cara:

1. **Na fonte:** só pergunta a quem interessa. Lê vagas direto das empresas, nos sistemas de
   candidatura delas, e pede às fontes que já tirem agências, júnior e presencial quando
   elas sabem fazer isso.
2. **Regras fixas, grátis e instantâneas:** jogam fora o que é obviamente errado: agência,
   cargo que não é de desenvolvimento, nível errado, país fora, presencial, idioma exigido.
   Em 2026-10-14, das ~342 mil vagas lidas, **sobraram 8.763 (2,5%)**.
3. **IA, paga e só no que sobrou:** lê a vaga como uma pessoa leria. Decide se a empresa
   contrata direto, se a **linguagem principal** bate com o seu perfil, o regime, o idioma,
   e dá uma nota de 1 a 5. O código põe limites no que a IA decide: uma vaga de outra stack
   nunca passa de nota 2.

No fim, você só vê as vagas com nota 3 ou mais, ordenadas por país (Espanha primeiro) e com
empregadores diretos antes de consultorias. Só as de nota 4 ou 5 ganham email pronto.

**A ideia central:** regra fixa para o que é óbvio e barato, IA para o que exige
julgamento, e **código garantindo os limites do que a IA decide**. Nada depende de uma lista
manual de tecnologias: a IA compara a vaga com as competências do Perfil, e se você mudar o
Perfil, o filtro acompanha.

---

## Técnico

### 0. Visão geral do funil

```
Fonte (ATS das empresas, agregadores, TheirStack)
  │  filtros na própria fonte: sem ETT/agência, mid/senior, remoto/híbrido
  ▼
Normalização (texto.py): HTML → texto, país, regime, "Europa genérica"
  ▼
Filtro determinístico (filtros.py, Filtro.avaliar), nesta ordem:
  agência → relevância do título → senioridade → país/prioridade → regime → idioma
  → marca consultoria (não exclui, rebaixa)
  ▼
Dedupe (dedupe.py): mesma vaga de duas fontes = uma linha
  ▼
Banco: vagas.ativa = "a fonte ainda mostra"; vagas.descartada = "tirada da lista"
  ▼
IA (ia.py, Haiku 5.5): tipo de empresa, stack, regime, idioma, nota 1 a 5
  + teto no código (stack incompatível → nota ≤ 2) + descarte (recrutadora, presencial,
  idioma)
  ▼
Lista e relatório: nota ≥ 3, ordem país → direto antes de consultoria → nota
  ▼
Email (Sonnet 5.5): só nota ≥ 4, até 50 por execução, validador sem travessões
```

### 1. Na fonte: perguntar só a quem interessa

**"Empresa primeiro"** (`empresas.py`). Em vez de varrer portais cheios de intermediários, o
buscador monta uma lista de **empresas** e lê as vagas no ATS de cada uma: Ashby, Lever,
Greenhouse, Recruitee, Teamtailor, SmartRecruiters, Workable e Personio.

- **Sementes:** listas abertas `kalil0321/ats-scrapers`, `veresk06/open-ats-feed` e
  `remote-es/remotes`, mais o TheirStack.
- **Validação semanal (`descobrir`):** a empresa só fica se tiver pelo menos uma vaga na UE
  (`Resultado.manter`). Em 2026-10-13, de **29.192 sementes ficaram 6.494 empresas**.
- **Por que funciona:** o anúncio no ATS da empresa é, por definição, de quem contrata. A
  agência publica no portal, não no ATS do cliente.

**Filtros que a própria fonte já aplica:**

| Fonte | Filtro na origem |
|---|---|
| Bundesagentur | `zeitarbeit=false&pav=false` (sem ETT nem agência privada); o regime vem do campo `homeofficemoeglich` |
| TheirStack | `company_type: "direct_employer"`, `job_seniority_or: ["mid_level", "senior"]`, `workplace_types_or: ["remote", "hybrid"]`, e a lista de agências como exclusão |
| ATS (Ashby, Lever) | `workplaceType` estruturado, quando existe |

**Lição:** o filtro `direct_employer` do TheirStack deixou passar consultorias (InnoIT,
StatusNeo). O filtro da fonte ajuda, mas não substitui as camadas seguintes.

### 2. Normalização: o mesmo texto para todas as fontes (`texto.py`)

```python
def normalizar(texto):        # minúsculas, sem acentos, só [a-z0-9] separados por espaço
def contem_termo(texto, termo):  # palavra inteira: f" {alvo} " in f" {texto} "
```

- **Porquê:** "Desarrolladora", "desarrolladora" e "DESARROLLADORA" viram a mesma coisa,
  e "java" não casa dentro de "javascript". Todo o filtro de palavras usa só essas duas
  funções.
- **País:** `paises_de_texto` reconhece nomes em várias línguas ("Spanien", "España",
  "Espanha" → ES), e `europa_generica` reconhece "Remote, Europe" sem país.
- **Regime:** `regime_de_texto` lê "hybrid", "teletrabajo", "thuiswerken", "vor ort"…, e
  quando não há sinal devolve `desconhecido`, nunca um chute.

### 3. O filtro determinístico (`filtros.py`, `Filtro.avaliar`)

A ordem é deliberada: **o que é mais barato e elimina mais vem primeiro.** Cada rejeição
devolve um `motivo`, que vai para o log da execução, e cada motivo é contado.

| # | Etapa | Como | Rejeitou em 2026-10-14 |
|---|---|---|---|
| 1 | **Agência** | nome da empresa contra `agencias.yaml` (recrutadoras, ETT, plataformas, consultorias da lista negra) e palavras no texto | 12.990 |
| 2 | **Relevância do título** | o título tem de **nomear uma função de dev** (`_RELEVANTES`: developer, engineer, desarrollador, entwickler, ontwikkelaar…) e não pode ter função fora (`_IRRELEVANTES`: sales, business developer, mechanical engineer…) | **294.805** |
| 3 | **Senioridade** | `perfil.yaml → senioridade.excluir` + extras multilíngues (`werkstudent`, `becario`, `estagio`, `stagiair`…) | 9.562 |
| 4 | **País e prioridade** | `perfil.yaml → localidade.prioridades` (ES=1, NL/DE=2, PT=3, resto da UE=4); "Europa genérica" só conta se for remoto | 22.611 |
| 5 | **Regime** | presencial sempre fora; `desconhecido` passa, e a IA decide depois | 2.032 |
| 6 | **Idioma exigido** | regex de exigência ("fluent German", "Deutschkenntnisse", "vloeiend Nederlands"), anúncio escrito em alemão/holandês (contagem de palavras funcionais) e títulos em alemão (`Entwickler`) | 799 |
| ✓ | **Aceita** | marca `consultoria` sem excluir | **8.763** |

**Decisões que valem copiar:**

- **Tecnologia solta não basta no título.** "AI-Enabled Revenue Operations Specialist"
  passava com uma regra do tipo "tem AI no título". A regra é sobre a **função** (developer,
  engineer), não sobre a tecnologia.
- **Na dúvida, deixa passar para a IA.** Regime `desconhecido` e idioma não detectado
  passam. A camada fixa só elimina o que tem certeza; o caso ambíguo é para a camada que
  sabe julgar.
- **Consultoria rebaixa, não exclui** (decisão do Jefferson). `eh_consultoria` olha o nome
  ("consulting", "consultora") e uma **sigla de cliente entre traços** no título
  (`Front End – ADP – equipo`), ignorando siglas comuns (AI, QA, AWS…). Isso vira a coluna
  `vagas.consultoria`, usada na ordenação.
- **Compostos alemães:** "Softwareentwickler" não contém "entwickler" como palavra inteira.
  A lista inclui os compostos explicitamente.

### 4. Dedupe (`dedupe.py`)

```python
chave = f"{empresa_sem_sufixo}|{titulo_sem_marca_de_genero}"
# "Acme GmbH" e "Acme" → "acme"; "Developer (m/w/d)" e "Developer" → "developer"
```

A mesma vaga vinda de duas fontes, como o ATS da empresa e o TheirStack, vira uma linha só
(`on conflict (owner_id, chave_dedupe)`).

### 5. A camada de IA (`ia.py`)

**Modelo:** Haiku 5.5, com `effort: low` e saída estruturada por pydantic
(`messages.parse`). Custa cerca de US$ 0,0005 por vaga.

```python
class Avaliacao(BaseModel):
    tipo_empresa: Literal["direto", "consultoria", "recrutadora"]
    nota: int                      # 1 a 5
    justificativa: str             # 1 a 2 frases em PT-BR, citando a stack
    regime: Literal["remoto", "hibrido", "presencial", "desconhecido"]
    exige_idioma_excluido: bool
    idioma_vaga: Literal["en", "es", "pt", "de", "nl", "fr", "outro"]
    stack_principal: list[str]     # ex.: ["Java", "Spring"]
    stack_compativel: bool         # a linguagem principal está no perfil?
```

**Como a stack é decidida sem lista manual:**
- A instrução manda **identificar a linguagem principal exigida** e compará-la com as
  competências do perfil.
- O perfil vai no bloco de sistema com cache, então custa 10% nas chamadas seguintes.
- Equivalentes diretos contam (TypeScript para JavaScript).
- Uma vaga cujo núcleo é Java, .NET, PHP ou Go é incompatível, mesmo citando uma ferramenta
  conhecida de passagem.
- Os exemplos estão na instrução, mas ela manda **decidir pelo perfil**, e não pela lista.

**O código garante o teto, em vez de confiar no modelo:**

```python
def normalizada(self):
    teto = 5 if self.stack_compativel else NOTA_MAXIMA_STACK_INCOMPATIVEL  # 2
    return self.model_copy(update={"nota": min(teto, max(1, self.nota)), ...})
```

- Teste da regra 14: `test_stack_incompativel_limita_a_nota_a_2`, que falhou antes da
  mudança e passa depois.

**O que a IA decide e o efeito no banco** (`banco.py`, `gravar_avaliacao`):

| Resultado da IA | Efeito |
|---|---|
| `tipo_empresa = recrutadora` | `descartada = true` e a empresa vira agência (não volta) |
| `regime = presencial` ou `exige_idioma_excluido` | `descartada = true` |
| `tipo_empresa = consultoria` | `consultoria = true` (rebaixa) |
| `regime` quando a fonte não sabia | preenche o regime |
| `nota` | ordenação, lista padrão (≥ 3) e email (≥ 4) |

**Segurança:**
- O texto da vaga é **dado, nunca instrução** (OWASP LLM01).
- Ele vai entre marcas `<vaga>` no turno do usuário, sem ferramentas, e a saída é validada
  por esquema.
- O `</vaga>` dentro da descrição é removido, para a vaga não fechar a marca.

### 6. Estado que a varredura não pode desfazer

**Bug encontrado em 2026-10-14:** a varredura punha `ativa = true` em toda vaga vista de
novo. Com isso, os descartes, seus e da IA, voltavam no dia seguinte.

**Correção (migration 0004):** duas colunas com donos diferentes.

| Coluna | Quem muda | Significado |
|---|---|---|
| `ativa` | só a varredura | a fonte ainda mostra a vaga |
| `descartada` | só o site e a IA | tirada da lista; a varredura nunca toca |

Na atualização, o que a IA concluiu não é sobrescrito pela fonte:

```sql
regime = case when %s = 'desconhecido' then regime else %s end,
consultoria = consultoria or %s,          -- só liga, nunca desliga
```

**Lição para qualquer pipeline de ingestão:** separar o estado "existe na origem" do estado
"decisão humana ou da IA". Se a sincronização tiver poder de escrever na decisão, ela vai
desfazê-la.

### 7. Ranking e exibição

- **Ordem:** prioridade do país → empregador direto antes de consultoria → nota.
- **Padrão no site e no relatório:** `ativa`, não `descartada`, nota ≥ 3 e empresa não
  bloqueada.
- **Filtro "Nota mínima"** no site: 3 ou mais (padrão), 4 ou mais, 5, "Todas, inclusive sem
  nota" e "Ainda sem nota". Nada fica escondido de forma definitiva.

### 8. Custo e cadência

- A varredura roda na segunda e na quinta.
- Por execução: até 8.000 avaliações (10 em paralelo, gravadas a cada lote de 200) e até
  50 emails.
- Os detalhes estão no plano do filtro de stack, seção 5.

---

## Números reais (varredura de 2026-10-14)

| Etapa | Vagas |
|---|---|
| Lidas nas fontes | ~342 mil |
| Fora do perfil (título) | 294.805 |
| Fora da UE | 22.611 |
| Agência | 12.990 |
| Senioridade | 9.562 |
| Regime | 2.032 |
| Idioma | 799 |
| **Aceitas pelas regras** | **8.763** |
| Novas no banco | 7.003 |

**Leitura dos números:**
- A regra mais barata, a função no título, faz 86% do trabalho.
- A IA recebe só 2,5% do volume, e é isso que torna viável usar um modelo em cada vaga.

---

## Padrões reutilizáveis (para outro projeto)

1. **Funil do barato para o caro:** filtro na fonte → regras determinísticas → IA → humano.
2. **Cada rejeição tem motivo e contador.** Sem isso, não se sabe qual regra está errada.
3. **Normalização única** (`normalizar` + `contem_termo` com palavra inteira) antes de
   qualquer comparação de texto.
4. **Regra fixa só elimina o certo; o ambíguo passa** para a camada que sabe julgar.
5. **A IA decide pelo perfil, não por lista manual.** O critério vem dos dados do usuário,
   que já vão no prompt com cache.
6. **Saída da IA com esquema e limites garantidos no código** (teto de nota, enums), com
   um teste que falha sem o limite.
7. **Conteúdo externo é dado, nunca instrução:** entre marcas, sem ferramentas, saída
   validada.
8. **Estado da origem separado da decisão** (`ativa` ≠ `descartada`). A sincronização nunca
   escreve na decisão.
9. **A exibição tem padrão estrito, mas tudo continua acessível** por filtro. Nada se perde.
10. **Gravar em lotes o que é pago**, para um timeout não jogar fora o trabalho feito.
