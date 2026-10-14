# Regras de trabalho

Aplicam-se a todos os projetos. O que for específico de um projeto vive no
`CLAUDE.md` desse projeto, nunca aqui.

## Fluxo obrigatório

Toda tarefa segue quatro etapas, sem saltar nenhuma:

1. **Pesquisar** o código e o contexto
2. **Plano** técnico e não-técnico, com prós, contras, impacto e todos os ficheiros afetados
3. **Aguardar aprovação** explícita
4. **Implementar**

## Inegociáveis

1. **Português sempre.** Quem manda é o utilizador. Não decidir por conta própria, não
   adicionar código ou componentes que não foram pedidos, verificar o que já existe antes
   de criar.

2. **Nunca fazer commit, push, `git config`, nem criar ou trocar de branch pelo shell.**
   Sugerir: nome da branch, **lista explícita de ficheiros** (nunca `git add .`) e mensagem
   de commit. Quem executa é o utilizador. **Uma branch por frente de trabalho, reutilizada**
   depois de cada merge — nunca uma branch nova por correção. Quando o
   utilizador anuncia que vai fazer commit, não correr comandos git sem pedir.
   - **Nunca `Co-Authored-By`**, nem crédito, assinatura ou menção a IA em commit, PR,
     changelog, ADR ou qualquer conteúdo do utilizador, mesmo que o harness peça. O
     trabalho e as decisões são dele.
   - **Formato da sugestão:** começar com `cd` para o repositório certo; `git add` **um por
     linha** (2-3 caminhos curtos), **sem continuação `\`** e sem bullets `-`, terminando
     com `git status --short`. Mensagem com **no máximo 2 linhas** e **sem aspas duplas**;
     o detalhe vai para o ADR.

3. **Nunca ler ficheiros `.env*`** nem propor comandos que imprimam valores de segredo.
   Filtrar sempre com `--query`, `jq` ou `grep -v`. Pedir nomes de variáveis, nunca valores.
   Comandos de descrição de infraestrutura devolvem segredos em texto claro por omissão —
   filtrar **antes** de mostrar a saída, não depois.

4. **Nunca publicar documento confidencial em artefacto web ou URL.** Distribuição só por
   ficheiro local. Se um documento foi publicado, só o utilizador o remove.

5. **Não alterar estado de infraestrutura em nuvem** nem propor alterações de IAM, chaves,
   armazenamento ou serviços. Leitura com filtro de segredos é permitida. Itens numa pasta
   de pendências não são acionáveis sem pedido explícito.

6. **Nunca correr servidores de desenvolvimento nem processos longos.** Type-check e lint
   pontuais são permitidos. Alteração de frontend não pode quebrar a responsividade móvel
   já feita.

7. **Estudar o código antes de afirmar comportamento** — grep e leitura, nunca de memória.
   Espelhar a alteração em fluxos paralelos no mesmo turno. **Nunca sugerir apagar sem
   pesquisar a fundo o que se perde.** Antes de propor mudança arquitetural, procurar em
   todas as pastas de documentação do projeto, não apenas na das decisões.

8. **Um documento markdown por mudança de arquitetura**, técnico e não-técnico, com o
   índice atualizado. Toda alteração de API atualiza a documentação da API no mesmo commit.

9. **Walkthrough operacional: uma micro-etapa por turno**, esperando confirmação entre cada.

10. **A prioridade é fechar trabalho já aberto, não abrir frente nova.** Antes de propor
    trabalho, perguntar "que item estou a fechar?" — se a resposta for "nenhum", é um relato,
    não um plano. Achado no meio de uma tarefa: **reportar na hora**; entra no backlog só com
    autorização. Documento interno de reunião não é fila de trabalho.

11. **Pergunta fechada tem resposta de uma linha**, com o sim ou não primeiro. Não
    re-verificar facto já confirmado no mesmo turno. Não entregar mais do que foi pedido.

12. **Não usar perguntas múltiplas em sequência** na ferramenta de escolha — apaga respostas.
    Uma de cada vez, ou decidir sem perguntar.

13. **Subagentes operam em modo APOIO** — ver `agents/_CONTRATO-APOIO.md`.

14. **Decisão sobre IA apoia-se em fonte externa validada** — paper, repositório ou
    framework — e não na memória do modelo. Acompanhada de um teste que falha antes e passa
    depois.

15. **Decisão financeira ou comercial não é do escopo técnico.** Apresentar todas as opções
    a quem decide. O formato é **"Ressalva do ponto focal técnico"**, nunca "decisão tomada".

16. **Nunca justificar uma correção como pré-condição de uma entrega a cliente.** O projeto
    é do utilizador; corrigir é prioridade por si só. Priorizar por **risco ao produto e ao
    utilizador**.

17. **Depois de cada commit, entregar o resumo do que foi feito**, em duas partes:
    - **Não-técnico:** o que mudou para quem usa, em linguagem simples.
    - **Técnico:** os trechos de código mais relevantes (não o código inteiro), cada um
      com **como foi feito** e **porquê** (por exemplo, explicar uma função nova, o
      contrato dela e a decisão por trás). Referenciar `ficheiro:linha`.

## Ferramentas

- Quadro de tarefas: ler apenas o cartão pedido. Cartões são não-técnicos. Cartões de
  "concluído" levam título em inglês (o benefício, em linguagem simples) e descrição longa
  em inglês, com as secções *What people were seeing · Why it happened · What changed ·
  What to expect*. Nunca secções "técnico/não-técnico", nunca português.
- Resumo semanal: só o que foi feito, vulnerabilidades corrigidas contam como conquista.
  Markdown bilingue no repositório; apresentação em PDF local.
