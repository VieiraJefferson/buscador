# Filtro de stack pela IA e descarte que não volta

**Data:** 2026-10-14
**Status:** aprovado pelo Jefferson e implementado
**Código:**
- `coletor/coletor/ia.py`, `coletor/coletor/banco.py` e `coletor/coletor/__main__.py`;
- `supabase/migrations/0004_vagas_descartada.sql`;
- `web/app/(app)/vagas/*` e `web/app/(app)/page.tsx`.

## Resumo não-técnico

- **Antes:**
  - apareciam vagas de outras stacks, como Java, porque o filtro olhava só o título ("Backend
    Developer" passava);
  - as vagas que você descartava voltavam no dia seguinte.
- **Agora:**
  - a IA identifica a linguagem principal de cada vaga e compara com as competências do
    perfil, sem nenhuma lista manual. Se a linguagem não bate, a nota fica em no máximo 2;
  - o site e o relatório mostram, por padrão, só vagas já avaliadas com nota 3 ou mais. As
    outras continuam acessíveis no filtro "Nota mínima";
  - descartar uma vaga, pelo site ou pela IA, é definitivo. A varredura não desfaz mais.

## Técnico

### 1. Stack decidida pela IA, teto garantido pelo código

- `Avaliacao` ganhou `stack_principal` (lista) e `stack_compativel` (booleano).
- **A instrução do Haiku:**
  - manda identificar a linguagem principal exigida e compará-la com as competências do
    perfil, que já vai no bloco com cache;
  - aceita equivalentes diretos, como TypeScript para JavaScript;
  - cita exemplos de linguagens incompatíveis, mas manda decidir pelo perfil.
- **No código:** `Avaliacao.normalizada()` aplica o teto `NOTA_MAXIMA_STACK_INCOMPATIVEL = 2`
  quando `stack_compativel` é falso. Mesmo que o modelo dê nota alta, a vaga não chega à lista
  padrão nem gera email, que exige nota 4.
- **Teste da regra 14:** `test_stack_incompativel_limita_a_nota_a_2`, que falhou antes da
  mudança e passa depois.
- **Fonte:** documentação de saídas estruturadas da Anthropic (`messages.parse` com esquema
  pydantic). O pedido explícito de cada campo segue o guia de prompts da Anthropic.

### 2. `ativa` e `descartada` separados (migration 0004)

| Coluna | Quem muda | Significado |
|---|---|---|
| `ativa` | só a varredura | a fonte ainda mostra a vaga |
| `descartada` | o site (botão Descartar) e a IA (recrutadora, presencial, idioma exigido) | tirada da lista; a varredura nunca toca |

- **Bug corrigido:** `gravar_vaga` punha `ativa = true` em toda vaga vista de novo, o que
  desfazia os descartes. A mesma atualização também sobrescrevia `consultoria` e `regime`, que
  a IA tinha preenchido.
- **Agora:**
  - `consultoria` só liga, nunca desliga;
  - `regime` só muda se a fonte informar um valor diferente de "desconhecido";
  - `descartada` não aparece no `update`.

### 3. Listas

- Toda consulta de lista passou a filtrar `not descartada`:
  - `vagas_sem_avaliacao`, `vagas_para_email` e `vagas_do_relatorio`;
  - no site, a lista de vagas e o Início.
- **Relatório e site:** `nota >= 3` por padrão. O relatório também deixa de fora empresas
  bloqueadas.
- **Filtro do site "Nota mínima":** 3 ou mais (padrão), 4 ou mais, 5, "Todas, inclusive sem
  nota" e "Ainda sem nota".

### 4. Varredura que falhava no fim

- A varredura de 2026-10-14 gravou 7.003 vagas novas e caiu no log de erros: um `IndexError`
  numa lista vazia do `defaultdict`, em `__main__.py`. A IA e o relatório nunca rodaram.
- Corrigido: o log só lê listas com conteúdo.

## 5. Frequência e limites (decisão do Jefferson, 2026-10-14)

A ideia é filtrar bem e trabalhar nas vagas que já existem, em vez de varrer todo dia.

| Item | Antes | Agora |
|---|---|---|
| Varredura | todo dia, 06:00 UTC | **segunda e quinta, 06:00 UTC** (na segunda, depois da descoberta das 05:00) |
| Avaliações por execução | 200 | **8.000**, o que limpa a fila de cerca de 7 mil vagas na primeira execução |
| Avaliações em paralelo | 4 | **10** (`COLETOR_CONCORRENCIA_IA`) |
| Emails por execução | 20 | **50**, cerca de 100 por semana |
| Tempo máximo do workflow | 60 min | **150 min** |

- **Gravação por lote:** as avaliações são gravadas a cada 200 (`LOTE_AVALIACOES`). Se o
  workflow passar do tempo, o que já foi avaliado, e pago, fica no banco.
- **Custo estimado**, pelo preço oficial: Haiku 5.5 a US$ 0,10 por milhão de tokens de
  entrada e US$ 0,50 por milhão de saída; Sonnet 5.5 a US$ 2 e US$ 10.
  - avaliação: cerca de US$ 0,0005; limpar a fila custa cerca de US$ 3,50, uma vez só;
  - email: cerca de US$ 0,02 a 0,03; 100 por semana dá cerca de US$ 9 a 13 por mês.
- **Ressalva do ponto focal técnico:** o total mensal fica perto do teto de US$ 15. A trava
  final é o limite no console da Anthropic.
