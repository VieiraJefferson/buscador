# ADR-0006: Envio pelo Gmail, caixinha "Enviada" e lista "Não contatar"

**Status:** Aceito
**Data:** 2026-11-02
**Decisor:** Jefferson Vieira
**Relaciona:** [ADR-0003](ADR-0003-site-como-painel-de-controle.md) (assistente de resposta) e
[ADR-0005](ADR-0005-apollo-contatos.md) (oposição RGPD com um clique)

---

## Resumo não-técnico

- **O problema:**
  - No PC e no celular, muitas candidaturas não abriam no Gmail. O botão só copiava o texto.
  - Marcar uma candidatura como enviada ficava escondido num seletor.
  - Não havia um lugar para ver só as candidaturas que esperam resposta.
  - Quando uma empresa pedia para não receber mais emails, o Assistente não reconhecia o
    pedido.
- **Agora:**
  - **PC:** "Abrir no Gmail" abre o Gmail numa aba nova, já com o destinatário, o assunto e o
    texto preenchidos.
  - **Celular:** o botão abre o app de email padrão (o Gmail).
  - Nos dois casos, o texto também é copiado, como reserva.
  - Cada vaga tem uma caixinha **"Enviada"**, na lista e no detalhe.
  - Abas no topo de Vagas: **A enviar · Aguardando resposta · Em andamento · Encerradas**.
  - Ao colar no Assistente um email que pede para não receber mais mensagens, a resposta é
    reconhecida como **"Não quer mais emails"**. Um toque encerra a candidatura e move a
    empresa para **"Não contatar"**: ela não volta nas buscas e os contatos dela são apagados.
  - A tela **Não contatar** lista as empresas bloqueadas e permite desbloquear, com confirmação.

## Contexto técnico

- O botão montava um `mailto:` e, acima de 1800 caracteres (`LIMITE_MAILTO`), só copiava o
  texto. O `encodeURIComponent` multiplica o tamanho de acentos e quebras de linha, e a linha
  de saída RGPD (ADR-0005) deixou quase todo email acima do limite.
- No Windows, o `mailto:` abre o app padrão do sistema (Outlook ou Mail), não o Gmail web, e o
  sistema tem limite curto para links de protocolo.
- Os estados de candidatura já existiam no banco (`0001_esquema_inicial.sql`). Não é preciso
  migração.
- O bloqueio de empresa já cumpria a oposição RGPD (ADR-0005), mas não tinha tela.

## Decisão

1. **Links de email** em `web/lib/email-link.ts`:
   - `linkGmail`: `https://mail.google.com/mail/?view=cm&fs=1&to=…&su=…&body=…`, aberto com
     `window.open` de forma síncrona dentro do clique, para o bloqueador de pop-ups não barrar.
   - `linkMailto` sem limite de tamanho, usado quando `ehCelular(userAgent)`.
   - A cópia para a área de transferência começa antes de abrir, enquanto a página tem o foco.
2. **Caixinha "Enviada"** (`web/components/app/vaga/caixa-enviada.tsx`), reutilizada na lista e
   no detalhe:
   - alterna entre `a_enviar` e `enviada`;
   - fica travada marcada depois de `respondida`, `entrevista`, `recusada` ou `sem_resposta`,
     porque desmarcar apagaria o estado;
   - na lista, a marcação é otimista e é desfeita se o servidor falhar.
3. **Fases** (`FASES` e `estadoBateComFiltro` em `web/lib/vaga.ts`):

   | Fase | Estados |
   |------|---------|
   | `a_enviar` | `a_enviar` ou sem candidatura |
   | `aguardando` | `enviada` |
   | `andamento` | `respondida`, `entrevista` |
   | `encerradas` | `recusada`, `sem_resposta` |

   Usam o parâmetro `estado` que já existia na URL. As abas ficam em
   `web/app/(app)/vagas/abas-fase.tsx` e mantêm os outros filtros.
4. **Classificação `nao_contatar`:**
   - o esquema saiu de `lib/ia.ts` (server-only) para `web/lib/classificacao.ts`, para poder ser
     testado;
   - o prompt do Haiku descreve o novo tipo;
   - a resposta sugerida confirma, em uma ou duas frases, que não haverá novo contato;
   - "Aplicar" reutiliza `aplicarRecusa`: candidatura `recusada` e empresa bloqueada, com os
     contatos apagados.
5. **Tela `/nao-contatar`:** lista `empresas.bloqueada = true` com "Desbloquear" em dois toques.
   Desbloquear não devolve os contatos apagados. No PC, a tela fica no menu lateral. No
   celular, o menu inferior continua com 5 itens e o acesso é pela aba "Não contatar" em Vagas.

## Fonte externa (regra 14)

- A saída estruturada com enum segue a documentação da Anthropic que o projeto já usa
  (`messages.parse` com `zodOutputFormat`, Anthropic SDK).
- O teste `web/lib/classificacao.test.ts` falhou antes, porque o esquema sem `nao_contatar` não
  existia como módulo testável, e passa depois.

## Consequências

- **Positivas:**
  - o envio abre direto no Gmail;
  - as candidaturas à espera de resposta aparecem numa aba;
  - os pedidos de saída RGPD ficam registrados e visíveis.
- **Negativas:**
  - o link do PC assume o Gmail web no navegador;
  - o bloqueio é por empresa, não por endereço isolado. Um remetente cuja empresa não está no
    banco não é bloqueado;
  - textos extremamente longos podem esbarrar no limite de URL do Gmail. A cópia automática
    cobre esse caso.
- **Testes:**
  - `web/lib/email-link.test.ts`;
  - `web/lib/vaga.test.ts`;
  - `web/lib/classificacao.test.ts`.
