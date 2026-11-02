# ADR-0004: Frontend em componentes reutilizáveis, sem latência por clique

**Status:** Aceito
**Data:** 2026-10-14
**Decisor:** Jefferson Vieira
**Altera:** [ADR-0002](ADR-0002-interface-web-vercel.md) (visual do portfólio) e
[ADR-0003](ADR-0003-site-como-painel-de-controle.md) (verificação de sessão)

---

## Resumo não-técnico

- **O problema:** cada toque no site levava 1 segundo ou mais, sem nenhuma resposta na tela.
  O site também não tinha a cara do portfólio além das cores. Faltavam as animações, a
  textura e os componentes próprios.
- **Agora:**
  - **O toque responde na hora.** A tela seguinte aparece em formato de "esqueleto"
    enquanto os dados chegam, e voltar a uma aba já visitada é instantâneo.
  - **O login só vai à rede uma vez.** A conferência de quem você é passa a ser local, em
    menos de 1 milissegundo, e o token da sessão fica num cookie que o JavaScript da
    página não consegue ler.
  - **Visual do portfólio:** transição entre páginas, blocos que aparecem ao rolar, botões
    "magnéticos", textura de filme e a mesma rolagem suave.
  - **Componentes reutilizáveis:** cada tipo de bloco, como cartão, seção, campo, linha de
    vaga ou lista, existe uma vez só e é usado em todas as telas.

## Contexto

Os pontos abaixo foram medidos no código em 2026-10-14:

1. `proxy.ts` chamava `getUser()`, uma ida ao servidor de autenticação do Supabase, em todo
   pedido, e a página chamava `getUser()` de novo em `exigirUsuario`.
2. As 7 telas eram `force-dynamic` e não tinham `loading.tsx`: a tela ficava parada até o
   servidor terminar.
3. O Início trazia até 2000 vagas só para contar.
4. O pacote `motion` estava instalado sem uso. Só existiam 5 componentes próprios, e o
   resto do layout estava escrito direto em cada página.

## Decisão

### 1. Sessão: `getClaims()` e cookie `httpOnly`

- **`getClaims()`** no `proxy.ts` e em `lib/auth.ts`, dentro do `cache()` do React, para
  rodar uma vez por pedido. O projeto usa uma chave assimétrica ECC (P-256). A assinatura é
  conferida localmente, com a chave pública guardada em memória por 10 minutos
  (`GLOBAL_JWKS` do `auth-js`).
  - Fonte: guia "Server-Side Auth for Next.js" do Supabase, que recomenda `getClaims()` no
    proxy e para proteger páginas, e diz para nunca usar `getSession()` no servidor.
- **O email permitido** é comparado com o email de dentro do token, sem custo.
- **Cookie da sessão** com `httpOnly`, `secure` e `sameSite=lax`
  (`lib/supabase/cookies.ts`). O site não tem cliente Supabase no navegador, então nada do
  lado do navegador precisa ler o token.
- **Descartado: sessão própria assinada pelo site.** Exigiria a chave `service_role` para
  consultar o banco, o que ignora o RLS, e não seria mais rápido que `getClaims()`.

### 2. Navegação

- `loading.tsx` em cada rota, com esqueletos no formato da tela (`components/app/esqueletos.tsx`).
- `experimental.staleTimes` com `dynamic: 30` e `static: 180`. As ações que mudam dados já
  chamam `revalidatePath`, que limpa esse cache.
- `typedRoutes: true`: um link para uma rota inexistente não compila, o que foi testado.
- Mapa único de rotas em `lib/rotas.ts`. Menu, bento, atalhos e filtros usam só esse mapa.
- `useLinkStatus` em `IndicadorLink`: o item do menu pulsa no instante do toque.
- O `<Link>` do Next já é a navegação do React, sem recarregar a página, igual ao
  `<Link to>` do react-router do portfólio. Os `<a href>` restantes são só para destinos
  fora do app: anúncio, `.ics`, link da chamada e GitHub.

### 3. Contagens do Início no banco

- A função `public.resumo_inicio()` (migration 0005) devolve tudo num JSON, numa chamada só.
- Ela é `security invoker`, então o RLS continua valendo, e filtra por `auth.uid()`.
- Usa os mesmos critérios da lista: ativa, não descartada, nota de 3 ou mais e empresa não
  bloqueada.

### 4. Componentes

| Componente | Uso |
|---|---|
| `Secao` | todo bloco com título, descrição e ação |
| `CartaoBento`, `Estatistica` | o bento do Início |
| `Campo`, `CampoSelect` | todo campo de formulário e todo select |
| `ItemLista`, `ListaItens` | horários, bloqueios, entrevistas, execuções e histórico |
| `EstadoVazio` | listas sem itens |
| `BarraAcoes` | seleção em lote e salvar perfil |
| `LinhaVaga`, `BadgesVaga`, `BadgeNota` | vaga na lista e no detalhe |
| `lib/datas.ts`, `lib/vaga.ts` | formatação única de datas, local e prioridade |

### 5. Fidelidade ao portfólio

| Portfólio | Buscador |
|---|---|
| `pageVariants` no `App.jsx` (framer-motion) | `TransicaoPagina`, no `app/(app)/template.tsx` |
| `useScrollReveal` (`data-reveal`) | `Revelar` (`whileInView`) |
| `Magnetic.jsx` | `Magnetico` (só com mouse; no toque fica parado) |
| `Grain.jsx` e `.grain` | `Grao` e `.grao` |
| `SmoothScroll.jsx` (Lenis, volta ao topo na troca de rota) | `RolagemSuave`, com os mesmos parâmetros |

- `MotionConfig reducedMotion="user"` respeita a opção "reduzir movimento" do sistema.
- O three.js do portfólio ficou de fora, para não pesar no celular.

## Consequências

**Positivas**

- Cada toque tem resposta visual imediata, e as voltas a abas já visitadas são instantâneas.
- O token deixa de ser legível pelo JavaScript da página.
- Uma mudança de visual num bloco vale para todas as telas.

**Negativas e trade-offs**

- Com `staleTimes`, uma aba revisitada em menos de 30 s pode mostrar dados de até 30 s
  atrás, se algo mudou fora do site, como a varredura. As ações do próprio site limpam o
  cache.
- A migration 0005 precisa ser aplicada antes do merge, porque o Início chama a função.
- `typedRoutes` exige o build, que gera os tipos, para checar as rotas.
