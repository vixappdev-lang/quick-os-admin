## Escopo

Três frentes principais, sem mexer no que já funciona: (1) transformar o botão "Relatório" numa rota/aba própria com layout estilo o print que o usuário enviou, (2) novo fluxo de cadastro de produto via modal de escolha + scanner que reconhece pelo código de barras e cria o produto sozinho (com imagem), e (3) revisão do scanner + responsividade mobile no painel inteiro.

---

### 1. Aba "Relatório" como tela própria (não modal)

**Hoje:** `relatorios.tsx` é uma única tela com KPIs/abas Vendas/Cadastros/Financeiro/Estoque, e o botão "Relatório" abre o `RelatorioCatalog` em `Dialog`.

**Mudança:**

- Criar nova rota **`src/routes/_authenticated/relatorios.catalogo.tsx`** (`/relatorios/catalogo`) com layout fiel ao print:
  - Header com título "Catálogo de Relatórios" + busca por nº/nome + botão "Voltar para Dashboard".
  - Layout em 2 colunas (desktop): **sidebar esquerda** com a árvore de categorias (Cadastros, Financeiro, Vendas, Estoque) numeradas; **painel direito** exibe o relatório selecionado (tabela + tooltip de descrição + botões "Imprimir" e "Exportar CSV").
  - Mobile: vira accordion (sidebar empilha em cima, painel embaixo).
  - Itens numerados conforme o catálogo já definido em `relatorio-catalog.tsx` (1, 2, 3 / 100-105 / 200-204 / 300-303).
  - Cada item ao clicar atualiza um query param `?r=<num>` (estado URL-driven, permite link/back).
- **Refatorar `relatorio-catalog.tsx`** em um hook utilitário `useRelatorios(data)` que devolve `grupos` e `buildReport(num)`, reaproveitando toda a lógica de montagem de tabelas já existente. O modal antigo é removido.
- Em `relatorios.tsx`, substituir o `onClick` do botão "Relatório" por `<Link to="/relatorios/catalogo">`. A tela de KPIs/abas atual permanece intacta.
- Botão "Imprimir" abre `window.open` com HTML estilizado (mesma função já existente no catálogo). "Exportar CSV" idem.

**Arquivos:**
- novo: `src/routes/_authenticated/relatorios.catalogo.tsx`
- editado: `src/routes/_authenticated/relatorios.tsx` (troca `Dialog` por link)
- editado: `src/components/relatorio-catalog.tsx` → exporta `useRelatoriosCatalog()` hook + helpers `printReport()` / `exportCsv()`; o componente `<RelatorioCatalog>` antigo é removido depois que a nova rota usa o hook.

---

### 2. Cadastro de produto: modal de escolha + scanner com IA

**Hoje:** "Novo produto" abre direto `ProductFormPanel` (Sheet) com formulário manual.

**Mudança no fluxo (`produtos.tsx`):**

1. Clique em "Novo produto" abre **`NovoProdutoChooserDialog`** (Dialog centralizado, max-w-md):
   - Título: "Como deseja cadastrar?"
   - Descrição curta.
   - 2 cards grandes lado a lado (mobile: empilhados):
     - **Manual** (ícone `Pencil`) → fecha o chooser e abre o `ProductFormPanel` em modo `create` (comportamento atual).
     - **Scanner** (ícone `ScanBarcode`) → abre `BarcodeScanner` + após detecção, dispara IA para identificar/cadastrar.

2. **Fluxo do scanner para cadastro:**
   - Reusa `BarcodeScanner` (já existe) com `onDetected(code)`.
   - Ao ler o EAN, fecha o scanner e abre um Dialog de progresso "Identificando produto..." com loader.
   - Chama nova server fn **`identifyAndCreateProduct({ ean })`**:
     - Primeiro tenta `produtos.select().eq(codigo_barras, ean)` — se já existe, retorna `{ already: true, produto }`.
     - Senão chama Lovable AI (`google/gemini-2.5-flash` em modo JSON) com prompt: "EAN brasileiro {ean} — devolva JSON com `{nome, marca, categoria_sugerida, unidade, descricao_curta}` baseado no que você sabe; se incerto, devolva `{unknown:true}`."
     - Se `unknown`, fallback: cria produto com `nome = "Produto " + ean`, `sku = ean` e abre form manual para o usuário completar.
     - Se identificou, chama internamente `generateProductImage({nome})` (já existe) para gerar imagem.
     - Faz `insert` em `produtos` com: nome, sku = ean, codigo_barras = ean, unidade, preco_venda = 0, preco_custo = 0, estoque = 0, estoque_minimo = 0, ativo = true, imagem_url.
     - Retorna `{produto}` para o cliente.
   - React Query invalida `["produtos"]` automaticamente (já há mutation; aqui chamamos `queryClient.invalidateQueries({queryKey:["produtos"]})` após sucesso) — atualiza Produtos, PDV, Estoque, NFe que consomem `useProdutos()`.

3. **Tela de sucesso `ProdutoCadastradoDialog`:**
   - Após criar (manual via scanner ou via IA), substitui o dialog de progresso por um success card:
     - Thumb da `imagem_url` (ou placeholder).
     - Linha "Cadastrado: **{nome}**" + chip do EAN.
     - Aviso se preço/estoque ainda estão zerados ("Defina preço e estoque na lista" + botão "Editar agora").
     - Botão primário **"Novo"** → reabre o chooser para escanear outro.
     - Botão secundário **"Concluir"** → fecha.
   - Se foi `already=true`, mostra "Já cadastrado: **{nome}**" e oferece botões "Adicionar estoque" (abre painel de edição) e "Novo".

**Arquivos:**
- novo: `src/components/novo-produto-chooser.tsx` (Dialog chooser + dialogs de progresso/sucesso/duplicado)
- novo: `src/lib/produto-scan.functions.ts` → `identifyAndCreateProduct` server fn (usa `requireSupabaseAuth`, chama AI gateway e `generateProductImage`)
- editado: `src/routes/_authenticated/produtos.tsx` → `openCreate` agora abre o chooser
- editado: `src/lib/queries.ts` → adicionar `useIdentifyAndCreateProduct()` que envolve a server fn + invalidations

**Segurança / DB:** sem migration nova. RLS de `produtos` já permite insert para staff. A server fn roda autenticada e usa o supabase client com header do usuário.

---

### 3. Scanner — revisão funcional + responsividade

`barcode-scanner.tsx` já existe e funciona, mas precisa de polish mobile:

- **Layout responsivo:** `DialogContent` ganha `sm:max-w-lg` (já tem) + no mobile vira full-screen (`max-sm:!w-screen max-sm:!max-w-none max-sm:!h-[100dvh] max-sm:!rounded-none`).
- **Vídeo:** trocar `aspect-[4/3]` por `flex-1 min-h-[60vh] sm:aspect-[4/3] sm:min-h-0` para ocupar a tela toda no celular.
- **Câmera traseira por padrão:** já está com `facingMode: environment`; garantir que `enumerateDevices()` só rode após `getUserMedia` (no iOS Safari, labels só vêm depois da permissão — sem isso a troca de câmera fica vazia).
- **Botão "Trocar câmera"** com área de toque ≥ 40px e contraste melhor.
- **Cleanup garantido:** parar tracks no `unmount` E no `onClose` (revisar para não deixar a câmera ligada se o usuário fechar com ESC).
- **Erros amigáveis:** distinguir `NotAllowedError` (pedir permissão) de `NotFoundError` (sem câmera) — toast com ação "Inserir manual".
- **Beep:** já existe; adicionar fallback para iOS (requer interação prévia — primeiro frame de vídeo já satisfaz).
- **Foco do input manual:** só `autoFocus` em desktop; em mobile o teclado virtual prejudica a leitura — controlar com `useIsMobile()`.

---

### 4. Responsividade do painel inteiro (pass)

Revisão de telas para celular (≤640px). Apenas classes Tailwind, sem mexer em lógica:

- `app-sidebar.tsx`: garantir que vira sheet/drawer no mobile (verificar — provavelmente já usa o sidebar shadcn que tem comportamento mobile nativo). Se faltar, adicionar o trigger no `app-header`.
- `app-header.tsx`: empilhar título e ações em mobile; menu hambúrguer visível só `<md`.
- **`pedidos.index.tsx` (Kanban):** em mobile o grid já vira 1 coluna; garantir swipe-horizontal opcional via `overflow-x-auto snap-x` com `min-w-[80vw]` por coluna (mantém 6 colunas roláveis).
- **`pdv.tsx`:** grid de produtos `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`; carrinho vira `Sheet` lateral em `<lg`; teclado numérico de pagamento full-width.
- **`pedido-form.tsx`:** tabela de itens com `overflow-x-auto`; grid de pagamentos `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`.
- **`caixa.tsx`, `financeiro.tsx`, `estoque.tsx`, `nfe.tsx`, `usuarios.tsx`, `configuracoes.tsx`, `relatorios.tsx`:** todas as tabelas em `overflow-x-auto` com `min-w-[640px]`; KPIs em `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- **`clientes.tsx`, `clientes.$id.tsx`, `produtos.tsx`, `produtos.$id.tsx`:** revisar paddings (`px-3 sm:px-5`), botões de ação com label oculto no mobile (`hidden sm:inline`) e ícone visível.
- **`vendedor.index.tsx` / `vendedor.novo.tsx`:** já mobile-friendly; pequeno ajuste no header.
- **`login.tsx`:** centralizar card com `min-h-[100dvh]` (safe-area iOS).
- **Componentes:** `page-header.tsx` empilha `actions` abaixo do título em mobile; `data-table.tsx` recebe wrapper scrollável.

---

## Detalhes técnicos

- Sem migrations novas.
- Server fn `identifyAndCreateProduct` retorna o produto criado; React Query usa `queryClient.invalidateQueries(["produtos"])` para refletir em PDV/Estoque/NFe automaticamente.
- A IA usa `google/gemini-2.5-flash` (texto, baixa latência). Geração de imagem reusa `generateProductImage` (`gemini-2.5-flash-image`).
- Scanner: nenhuma dependência nova; `@zxing/browser` já instalado.
- A nova rota `/relatorios/catalogo` herda o layout `_authenticated`.

## Arquivos afetados

- **Novos**
  - `src/routes/_authenticated/relatorios.catalogo.tsx`
  - `src/components/novo-produto-chooser.tsx`
  - `src/lib/produto-scan.functions.ts`
- **Editados**
  - `src/routes/_authenticated/relatorios.tsx`
  - `src/routes/_authenticated/produtos.tsx`
  - `src/components/relatorio-catalog.tsx` (vira hook utilitário)
  - `src/components/barcode-scanner.tsx` (responsividade + cleanup)
  - `src/lib/queries.ts` (`useIdentifyAndCreateProduct`)
  - `src/components/app-header.tsx`, `src/components/page-header.tsx` (mobile)
  - `src/routes/_authenticated/pdv.tsx`, `pedidos.index.tsx`, `pedidos.$id.tsx`, `caixa.tsx`, `financeiro.tsx`, `estoque.tsx`, `nfe.tsx`, `usuarios.tsx`, `configuracoes.tsx`, `clientes.tsx`, `produtos.tsx` (classes responsivas)

## O que NÃO muda

- Estrutura de dados, RLS, autenticação, rotas existentes.
- Lógica de Kanban / faturamento / PDV / pedidos.
- Aba `/relatorios` original (KPIs + sub-abas) continua acessível; o catálogo numerado vira tela separada.
- Tokens de design, sidebar, cores.
