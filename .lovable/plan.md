## Escopo

Mudanças cirúrgicas em cima do que já existe. Nada será reescrito do zero — apenas adiciono colunas/abas/comportamentos faltantes.

---

### 1. Kanban (`pedidos.index.tsx`) — caber em uma linha

Hoje o grid usa `lg:grid-cols-5`, mas existem 6 colunas (`pendente, autorizado, separacao, conferencia, faturamento, concluido`) — a última quebra para a linha de baixo.

- Trocar para `lg:grid-cols-3 xl:grid-cols-6` (6 colunas a partir de `xl ≥1280px`, que é o viewport atual do usuário).
- Cards e header de coluna: reduzir paddings (`px-2 py-2`, gap 2) e fonte do label para `text-[10px]` para caberem confortavelmente em 6 colunas.
- Nenhuma lógica de drag/drop ou status muda.

### 2. Faturamento real

A coluna "Faturamento" já existe visualmente, mas falta o fluxo. No popover da coluna (`ChevronDown`):

- **"Faturar todos os pedidos"** → chama `useCriarFaturamento` (já existe em `queries.ts`) com os pedidos da coluna; cria registro em `faturamentos` + relaciona em `faturamento_pedidos`; mostra toast com nº do faturamento. Pedidos permanecem na coluna até serem encerrados.
- **"Encerrar todos os pedidos"** → move todos para `concluido` (sai do board). Já existe parcialmente, garantir que só apareça nessa coluna.

Pequeno ajuste em `useCriarFaturamento` para retornar `numero/id` para o toast.

### 3. Lista de pedidos com filtros (`view === "lista"`)

Hoje só busca por número/cliente. Adicionar barra de filtros acima da tabela:

- Toggle "Incluir encerrados" (default OFF — esconde `concluido` e `cancelado`).
- Select **Cliente** (combobox baseado em `useClientes`).
- Select **Vendedor** (combobox baseado em `useVendedores`).
- Input **Produto contido** (filtra pedidos cujos `itens[].produto.nome/sku` casem).
- Filtros são `useState` locais; nada novo no backend.

### 4. Formas de pagamento — Nota Promissória e Cheque

Em `pedido-form.tsx` e `pdv.tsx`, expandir `PAYMENT_OPTIONS` / `PAGAMENTOS`:

```
PIX, DINHEIRO, NOTA PROMISSÓRIA, CHEQUE, DÉBITO, CRÉDITO
```

Enum `pagamento` já foi expandido em migration anterior incluindo `nota_promissoria` e `cheque` — apenas adicionar entradas com ícones (`FileText`, `Banknote`) e atualizar `PAGAMENTO_LABEL` em `relatorios.tsx`. Sem nova migration.

### 5. Relatórios — novo botão "Relatório" abre catálogo numerado (estilo print)

A aba existente em sub-abas (Vendas/Cadastros/Financeiro/Estoque) permanece. Adicionar:

- Botão **Relatório** (já presente) abre `Dialog` em tela cheia com **catálogo de relatórios** estilo o print: accordion por categoria, itens numerados com info-tip:

  ```
  ─ Cadastros
       1 - Relação de Clientes
       2 - Relação de Produtos
       3 - Relação de Vendedores
  ─ Financeiro
       100 - Fluxo de Caixa
       101 - Demonstrativo Receitas/Despesas
       102 - Movimento de Caixa
       103 - Títulos a Pagar
       104 - Títulos a Receber
       105 - Histórico de Pagamentos
  ─ Vendas
       200 - Pedidos por período
       201 - Vendas por vendedor
       202 - Vendas por cliente
       203 - Vendas por forma de pagamento
       204 - Top produtos
  ─ Estoque
       300 - Posição de estoque
       301 - Produtos com estoque baixo
       302 - Movimentações de estoque
       303 - Valorização de estoque
  ```

- Clicar em um item abre **2º dialog** com a tabela/gráfico daquele relatório, usando os hooks já existentes (`usePedidos`, `useProdutos`, `useClientes`, `useDespesas`, `useContas`, `useUsuarios`, `useEstoqueMovs`) + botão "Imprimir" (`window.print`) e "Exportar CSV".
- Componente novo: `src/components/relatorio-catalog.tsx` — recebe dados já carregados, sem hits extras de rede.

### 6. PDV — scanner real

Substituir o botão "Scanner" inerte por integração real:

- **Modo 1 (preferido):** `window.BarcodeDetector` quando disponível (Chrome/Edge desktop e Android). Suporta EAN-13, EAN-8, UPC-A, Code-128, Code-39, QR. Tutorial: <https://web.dev/articles/shape-detection#barcodedetector>
- **Modo 2 (fallback):** lib `@zxing/browser` para Safari/iOS.

Implementação:

- `bun add @zxing/browser @zxing/library`
- Novo componente `src/components/barcode-scanner.tsx`:
  - Abre `Dialog`; pede `getUserMedia({ video: { facingMode: 'environment' } })`.
  - Detecta `BarcodeDetector`; se ausente, usa `BrowserMultiFormatReader` do ZXing apontando para o `<video>`.
  - Loop de leitura (`requestAnimationFrame`) → ao detectar, debounce 800ms, beep curto (`AudioContext`) e callback `onDetected(code)`.
  - Botão "Trocar câmera", "Inserir manual" (input texto + Enter).
- No `pdv.tsx`, ao detectar código:
  1. Procurar produto por `codigo_barras === code` (case-insensitive, trim).
  2. Se achar → `addProduto(p)` + toast "Adicionado: nome · preço · unid".
  3. Se não achar → toast erro "Código não cadastrado: {code}" + manter scanner aberto.
- Sem novas tabelas; usa `produtos.codigo_barras` já existente.

### 7. Vendedor — desktop e mobile 100%

`vendedor.index.tsx` e `vendedor.novo.tsx` já têm bom mobile. Ajustes:

- KPIs: `grid-cols-3` no mobile permanece; em `sm+` aumentar gap/padding.
- Lista de pedidos: garantir `truncate` em todos os textos, cards com altura uniforme.
- Header do "Novo pedido": no desktop centralizar com `max-w-7xl` (já está) e em mobile reduzir paddings.
- `PedidoForm` recebido pelo vendedor: aplicar wrapper com `overflow-x-auto` na tabela de itens (já presente) e revisar grid de pagamentos para `grid-cols-3` no mobile / `grid-cols-6` no desktop.
- Nenhum hook novo; apenas classes Tailwind.

---

## Arquivos afetados

- `src/routes/_authenticated/pedidos.index.tsx` — colunas + filtros lista + faturar.
- `src/routes/_authenticated/relatorios.tsx` — abrir dialog catálogo.
- `src/components/relatorio-catalog.tsx` *(novo)*.
- `src/components/pedido-form.tsx` — pagamentos +2.
- `src/routes/_authenticated/pdv.tsx` — integração scanner + pagamentos +2.
- `src/components/barcode-scanner.tsx` *(novo)*.
- `src/routes/vendedor.index.tsx`, `src/routes/vendedor.novo.tsx` — polish mobile/desktop.
- `src/lib/queries.ts` — pequeno tweak em `useCriarFaturamento` (retorno).
- `package.json` — `@zxing/browser`, `@zxing/library`.

## Detalhes técnicos

- Sem migrations novas (enum `pagamento` e tabelas `faturamentos`/`faturamento_pedidos` já existem).
- Scanner roda 100% no browser; sem API key.
- Filtros da lista de pedidos são client-side sobre `usePedidos()` (já vem com `itens` populado).
- O catálogo numérico de relatórios reutiliza dados já em cache do React Query — zero requests extras.

## O que NÃO muda

- Layout/visual geral, sidebar, header, cores, tokens.
- Lógica de criação de pedido, RLS, autenticação.
- Caixa, financeiro, produtos, estoque (apenas se mexido pelo escopo acima).
