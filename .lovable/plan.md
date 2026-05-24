## Diagnóstico (verificado ao vivo)

- **Novo pedido funciona** — testei agora: cliquei em "Brahma 600ml", finalizei, pedido `P01000` foi criado no banco e apareceu na lista (toast verde). O builder em `src/components/pedido-builder.tsx` já está 100% conectado ao Supabase.
- **"Login do vendedor"** do print é o painel `/vendedor` (logado como Daniel). O conteúdo está colado à esquerda com metade direita vazia — é um problema de container, não de auth.
- **Mocked restantes confirmados:**
  - `src/routes/_authenticated/estoque.movimentacoes.tsx` → importa `movimentacoes` de `@/data/mock`.
  - `src/routes/_authenticated/produtos.$id.tsx` → importa `produtos` de `@/data/mock`, campos sem `value`, botões sem ação, "muito espaço sobrando" porque o painel direito tem só 3 linhas.

---

## Mudanças

### 1. Painel do vendedor — proporção desktop (`src/routes/vendedor.index.tsx` + `src/routes/vendedor.novo.tsx`)

Hoje o `<main>` usa `px-10` mas sem `max-width` + `mx-auto`, então em telas 1280+ tudo fica encostado à esquerda. KPIs ficam travados em `lg:max-w-3xl` (esquerda) enquanto busca/lista esticam — visual desbalanceado.

Correções:
- Envolver `<main>` e o header interno em `mx-auto max-w-7xl` para centralizar e respeitar o layout em todos os breakpoints.
- Remover `lg:max-w-3xl` dos KPIs e deixar `grid-cols-3` ocupando a faixa centralizada (cards maiores no PC, mantém 3 colunas no mobile).
- Lista de pedidos: trocar `lg:grid-cols-2 xl:grid-cols-3` por `md:grid-cols-2 xl:grid-cols-3` e dar `min-h` na faixa central para não parecer "ilha" quando há poucos pedidos.
- Empty state ocupa `col-span-full` para ficar centralizado, não preso à esquerda.
- Mesmo tratamento de container no `/vendedor/novo` (já tinha `lg:max-w-6xl` mas sem `mx-auto`).

### 2. Movimentações de estoque — conectar ao banco (`src/routes/_authenticated/estoque.movimentacoes.tsx`)

- Trocar import de `@/data/mock` por `useEstoqueMovimentos()` (já existe em `src/lib/queries.ts`, retorna `estoque_movimentos` com join em `produtos`).
- Mapear colunas para os campos reais: `created_at`, `tipo`, `produto.nome`, `qtd`, `motivo`, `user_id`.
- Loading state e empty state.

### 3. Detalhe do produto — funcional e sem espaço vazio (`src/routes/_authenticated/produtos.$id.tsx`)

Reescrita usando:
- `useProduto(id)` para carregar, `useCategorias()` para o select, `useUpsertProduto()` para salvar, `useDeleteProduto()` para excluir.
- Estado controlado por `useState` populado no primeiro `data` recebido (via `useEffect`).
- Layout `[1fr_360px]` espelhando o de "Novo produto", preenchendo o painel direito com: **imagem** (preview + botão "Gerar imagem com IA" reaproveitando `generateProductImage`), **status** (ativo) e **resumo** (margem, lucro, valor em estoque). Acabou o espaço vazio.
- Botões: "Salvar alterações" (chama `upsert`), "Excluir" (confirm + delete + navega para `/produtos`), "Duplicar" (cria cópia com SKU sufixado `-COPIA`).
- Toasts via `sonner`, navegação via `useNavigate`.

### 4. Limpeza

- Não removo `src/data/mock.ts` agora (ainda usado por outras telas residuais) — apenas zero os imports nas telas tocadas.

## Detalhes técnicos

- Tipo do `Produto` em `queries.ts`: `Tables<"produtos">`. Campos com `numeric` vêm como `number | string` — converto com `Number(...)` antes de operar.
- `useUpsertProduto` aceita `{ id, ...rest }` e faz update; sem `id` faz insert. Vou passar `id` no update e omitir no duplicar.
- `generateProductImage` é serverFn já registrado em `src/lib/product-image.functions.ts` — uso com `useServerFn`.
- Manter classes/tokens existentes (`bg-card`, `border`, `text-muted-foreground`, etc.) para não quebrar tema claro/escuro.
- Sem mudanças em rotas, types, RLS, schema do banco ou auth.

## Fora do escopo

- Não mexo em `/login` (não é o problema mostrado no print).
- Não mexo em `pedidos.novo`, `vendedor.novo` PedidoBuilder (funcionando).
- Não toco em outras telas com mock residual nesta rodada.
