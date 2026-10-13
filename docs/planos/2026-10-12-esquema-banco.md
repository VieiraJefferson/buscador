# Esquema do banco (etapa 2)

**Data:** 2026-10-12
**Migration:** [`supabase/migrations/20261012000000_esquema_inicial.sql`](../../supabase/migrations/20261012000000_esquema_inicial.sql)
**Decisões de origem:** [ADR-0001](../decisions/ADR-0001-arquitetura-buscador-vagas.md) e
[ADR-0002](../decisions/ADR-0002-interface-web-vercel.md)

## Resumo não-técnico

O banco guarda seis coisas:

- as **empresas** encontradas;
- os **contatos** de email delas;
- as **vagas**;
- os **emails gerados** para cada vaga;
- as **candidaturas** (o que o Jefferson enviou e em que pé está);
- o **registro de cada varredura diária**.

Quem acessa e o quê:

- **O Jefferson, no site:** vê e altera tudo o que é dele, e só depois do login.
- **O coletor, a varredura diária:** tem um usuário próprio que só grava empresas, contatos,
  vagas, emails e o registro das varreduras. Não vê as candidaturas e não tem acesso ao resto
  do banco. Se a senha dele vazar, o estrago fica limitado a essas tabelas.
- **Mais ninguém:** sem login, nada é visível.

O banco também se protege sozinho:

- recusa emails com travessão ("—" ou "–");
- recusa a mesma vaga duas vezes;
- marca cada contato para ser apagado 12 meses depois (RGPD).

## Tabelas

| Tabela | Para quê | Regras principais |
|---|---|---|
| `empresas` | Empresas que contratam diretamente | Única por domínio e por ATS + slug; `eh_agencia` e `bloqueada` para excluir intermediários |
| `contatos` | Emails das empresas | Único por email; `tipo` (`ats_mailbox`, `generico`, `nominal`); `apagar_apos` = criação + 12 meses |
| `vagas` | Vagas encontradas | Única por fonte + id na fonte **e** por `chave_dedupe` (empresa + título normalizado), para a mesma vaga vinda de duas fontes; `regime`, `prioridade_pais` (1 a 4) e `nota` (1 a 5) com `check` |
| `emails_gerados` | Email pronto para cada vaga | `check` recusa "—" e "–" no assunto e no corpo |
| `candidaturas` | Estado de cada candidatura | Uma por vaga; `estado` (`a_enviar`, `enviada`, `respondida`, `entrevista`, `recusada`, `sem_resposta`); `enviada_em` obrigatório depois de enviada; `resposta_sugerida` guarda só a resposta do assistente |
| `execucoes` | Registro de cada varredura | Fonte, vagas lidas e novas, erros; o site só lê |

**Minimização (RGPD):** o email que o Jefferson cola no assistente **não é guardado**. Morada
e telefone não entram no banco. O perfil continua em `config/perfil.yaml`.

**Migration 2 (2026-10-13):** `supabase/migrations/20261013000000_vagas_consultoria.sql`
acrescenta `vagas.consultoria` (padrão `false`) e refaz o índice da lista do dia com essa
coluna. Deve ser aplicada no SQL Editor, como a primeira.

## Acessos

| Papel | Quem | O que pode |
|---|---|---|
| `anon` | Qualquer visitante sem login | Nada (privilégios revogados) |
| `authenticated` | O Jefferson no site | Ler e alterar as próprias linhas em todas as tabelas; só ler `execucoes`. O RLS exige `owner_id = auth.uid()`. |
| `coletor` | Script do GitHub Actions | `select`, `insert` e `update` em `empresas`, `vagas`, `emails_gerados` e `execucoes`; também `delete` em `contatos`, para a retenção. Sem acesso a `candidaturas` nem ao esquema `auth`. Sem `bypassrls`. |

- O `coletor` envia sempre o `owner_id` explícito. As políticas dele recusam linhas sem dono.
- **A senha do `coletor` não está na migration nem no repositório.** Ela é definida à mão
  no SQL Editor e guardada só no `.env` local e nos GitHub Secrets. O nome da variável é
  lido num único arquivo de configuração do coletor.
- **A chave secreta (service role) do Supabase não é usada** pelo projeto.
- O RLS fica ligado em todas as tabelas desde a criação.

## Retenção

O coletor, em cada execução, apaga os contatos com `apagar_apos` vencido. A retenção não
depende de extensões de agendamento no banco.

## Como aplicar (feito pelo Jefferson, um passo de cada vez)

1. Criar o projeto no Supabase numa região da UE. **Feito em 2026-10-12: Irlanda
   (eu-west-1)**, aceita pelo Jefferson no lugar de Frankfurt (mesmo efeito para RGPD e
   latência).
2. Em Authentication, **desligar o cadastro público** e deixar o login por link mágico.
   **Feito em 2026-10-12** (provider Email com senha mínima de 12 caracteres e link válido
   por 15 minutos).
3. No SQL Editor, rodar a migration inteira. **Feito e verificado em 2026-10-12:** 6 tabelas,
   todas com RLS; `coletor` com login e sem `bypassrls`.
4. No SQL Editor, definir a senha do `coletor` com `alter role coletor with password '...';`.
   A senha é gerada por um gerenciador de senhas e nunca é colada no chat. **Feito em
   2026-10-12:** 40 caracteres alfanuméricos, guardada no gerenciador do Jefferson; a query foi
   apagada do SQL Editor.
5. Montar a string de conexão do `coletor`. O GitHub Actions não tem IPv6 e a conexão direta
   do Supabase é IPv6, por isso **usar a conexão pelo pooler** (Supavisor), em que o usuário
   tem o formato `coletor.<id-do-projeto>`. O formato exato é confirmado no painel na hora.
6. Guardar a string no `.env` local e, na etapa 5 do roteiro, nos GitHub Secrets.

## Validação feita

- Sintaxe do SQL validada com o parser oficial do Postgres (`pglast`): 45 comandos, sem erros.
- Execução real no Supabase em 2026-10-12, sem erros. As consultas de verificação confirmaram
  as 6 tabelas com RLS ligado e o role `coletor` (`rolcanlogin = true`, `rolbypassrls = false`).

## Segurança do repositório

- `.github/workflows/gitleaks.yml`: o Gitleaks v8.30.1 (imagem oficial, versão fixa) varre
  o histórico inteiro em cada push e pull request, e falha se encontrar um segredo.
- `.gitleaks.toml`: regras padrão, sem exceções.
- Executado em 2026-10-12 sobre o histórico (4 commits) e sobre os arquivos atuais: nenhum
  vazamento.
- Opcional, feito pelo Jefferson: hook de pre-commit local do Gitleaks.
