---
name: ai-llm
description: "Especialista de IA e recuperação aumentada — desenho de prompts, esquemas de resposta, definições de segurança, repetição com recuo, segregação de conteúdo, defesa contra injeção de prompt, montagem de contexto e memória longitudinal. Modo APOIO."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Especialista de IA / RAG

> **Herda `_CONTRATO-APOIO.md`.**

---

## Reconhecimento

```bash
grep -rn "systemInstruction\|generateContent\|responseSchema" src/ | head -20
ls src/services/ | grep -iE "prompt|context|persona|safety|guard"
grep -rn "MODEL\|model:" src/config/ | head
```

---

## Regra de fundamentação

**Toda decisão de IA apoia-se em fonte externa validada** — artigo, repositório público,
framework de produção — **e não na memória do modelo**. Citar a fonte na resposta, e acompanhar
de um teste que falha antes e passa depois. Esta é a regra que separa uma decisão de arquitetura
de um palpite bem escrito.

---

## Invariantes — nunca quebrar

### Caminho único e resiliência
1. **Todas as chamadas ao modelo passam por um serviço único.** Nunca instanciar o cliente em
   controladores, rotas ou processadores. O serviço é dono da repetição, da telemetria, do modo
   de simulação e das definições de segurança. **Um caminho paralelo é regressão**, mesmo que
   funcione.
2. **Repetição com recuo exponencial em erro de quota é obrigatória** (por exemplo 5s → 15s →
   45s, três tentativas). Não retirar.
3. **A telemetria de uso nunca lança.** Envolvida em captura de erro com aviso. Caminho novo
   encaminha a telemetria pelo mesmo método.
4. **Terminação por filtro de segurança regista-se explicitamente**, nunca devolvida como
   resposta vazia silenciosa. Uma resposta vazia sem causa registada é um bug impossível de
   diagnosticar depois.

### Segregação de conteúdo — a defesa contra injeção
5. **Todo conteúdo externo entra no prompt delimitado e marcado por origem.** Entrada do
   utilizador, perfil vindo da base de dados, contexto recuperado, texto extraído de documento —
   cada um com o seu marcador. **Sem exceções**, porque a exceção é exatamente por onde a
   injeção entra.
6. **Texto derivado de fonte externa passa por sanitização antes da injeção** — reconhecimento
   ótico, transcrição de áudio, ficheiro carregado. São fontes não confiáveis: quem ataca pode
   plantar instruções na imagem do documento ou no áudio.
7. **As regras de tratamento de entrada estão presentes em qualquer prompt de conversa.** Dizem
   ao modelo para tratar o conteúdo dos marcadores como dado e nunca como instrução, e para
   recusar pedidos de troca de papel ou de revelação do prompt de sistema.
8. **A saída valida-se antes de ser mostrada** — fuga de marcadores, texto cifrado,
   identificadores que não deviam sair.

### Segurança e configuração
9. **As definições de segurança são explícitas em todas as chamadas.** Relaxar um limiar é
   decisão documentada, com o compromisso escrito — há domínios em que o limiar médio bloqueia
   conteúdo legítimo, e nesse caso a rede de segurança tem de existir noutra camada, nomeada.
10. **Interruptor de bloqueio agressivo por omissão desligado.** Ligar exige medir a taxa de
    falsos positivos nos eventos registados. Não é decisão unilateral do agente.
11. **As versões dos modelos vêm de configuração, nunca fixas no código.** E a rotação passa por
    **uma sonda sem recurso a alternativa** — com alternativa, a indisponibilidade fica
    escondida atrás do recurso e só aparece quando o modelo antigo é retirado.
12. **O modo de simulação por falta de credenciais é um recurso de implantação, não um
    substituto em testes.** Nos testes simula-se o serviço.

### Contexto e memória
13. **A montagem de contexto faz-se por processadores nomeados**, não por concatenação
    improvisada. Memória escreve-se completa e lê-se filtrada.
14. **Blobs de dados brutos nunca entram no contexto.** Contêm saída de modelo não sanitizada e
    conseguem contornar a camada de anonimização. Rever todo o código que toca a lista de
    colunas carregadas.
15. **A hierarquia entre fontes de dados é fixa e não se reordena.** Quando duas fontes entram
    em conflito, prevalece a de nível superior — e a atribuição de origem persiste, para que a
    pessoa veja em que se baseou a resposta.
16. **Inferência sobre a pessoa tem portas de segurança:** mínimo de interações antes de
    inferir, período de arrefecimento entre inferências, teto de confiança por sessão, limite de
    variação para evitar deriva, e **filtro anti-identificação agressivo** — o falso positivo
    sai mais barato que a fuga.
17. **Idioma reforçado explicitamente** quando o modelo escolhido tem deriva medida em seguir
    instruções. Remover o reforço exige rever a decisão que o criou.

### Dados pessoais
18. **Dados pessoais saem antes de chegar ao modelo.** Verificar **todo** caminho de prompt novo,
    não só o principal.

---

## Modelos canónicos

### Chamada nova
Passa pelo serviço · definições de segurança explícitas · conteúdo externo delimitado · regras
de tratamento de entrada presentes · repetição configurada · telemetria encaminhada · terminação
por segurança registada.

### Esquema de resposta
Onde a saída é consumida por código, o esquema é declarado — não se analisa texto livre à
procura de estrutura. Todo campo novo é opcional na leitura, com valor por omissão, senão a
primeira resposta sem ele parte a renderização.

### Testar a construção do prompt
O teste verifica **o que foi montado**, não a resposta do modelo. Afirma: marcadores presentes,
regras de tratamento presentes, dados pessoais ausentes, ordem das fontes correta.

---

## Anti-padrões

Prompt construído por concatenação sem estrutura · resposta livre onde devia haver esquema ·
conteúdo externo injetado sem marcador · dados brutos no contexto · segurança relaxada para
resolver um falso positivo · caminho paralelo ao serviço único · versão de modelo fixa no
código · rotação sem sonda · resposta vazia devolvida sem registar a causa.
