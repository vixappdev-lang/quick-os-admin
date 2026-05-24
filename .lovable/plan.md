## Escopo

Pente fino em Pedidos, NF-e, Produtos e UX geral, sem quebrar nada já funcional. Sem dados mock. Tudo plugado em Supabase via `src/lib/queries.ts` e RLS atual.

---

## 1. Novo Pedido — refazer no estilo "Dados Principais + Produtos"

Arquivo: novo componente `src/components/pedido-form.tsx` (substitui o uso de `PedidoBuilder` em `pedidos.novo.tsx` e `vendedor.novo.tsx`).

Layout em duas seções empilhadas (não copiar o print, usar a identidade Quick — bordas suaves, `SectionCard`, tipografia da casa):

**SectionCard "Dados Principais"** (grid 12 colunas):
- Orçamento (readonly, gerado), Pedido (próximo número, readonly preview), Nota (vazio), Data Pedido (`datetime-local`, default agora)
- Empresa (select, por enquanto fixo no nome da empresa de `configuracoes`), Tipo (Pedido/Orçamento), Entrada/Saída (Saída default), Operação (Venda/Devolução)
- Cliente/Fornecedor: combobox com busca min 3 chars (reuso `useClientes`), botão "+" abre dialog rápido (`useUpsertCliente`)
- Vendedor (auto = `user.id`, editável se admin)

**SectionCard "Produtos"**:
- Linha de busca de produto (autocomplete por nome/SKU/EAN, reuso `useProdutos`) + leitor de código de barras (input com submit por Enter)
- Tabela editável: Nº Item, Ref (SKU), Produto, Qtde (input), UN, Vlr. Unitário (input, default preço venda), Tabela de Preço, Vlr. Desc., Total Líquido, ações (remover)
- Totais ao final: Subtotal, Desconto geral, Total

**SectionCard "Pagamento e observações"**: forma de pagamento, observações.

Barra de ações sticky no topo (Cancelar / Salvar rascunho / Finalizar pedido). `Finalizar` chama `useCreatePedido` (já existe) e navega para `/pedidos/$id`.

A mesma tela é usada em `vendedor.novo.tsx` (mesmo componente, sem mudanças no fluxo de auth).

---

## 2. Card do Kanban — mais informação e tags sincronizadas

`src/routes/_authenticated/pedidos.tsx` (componente `KanbanCard`):
- Linha 1: número do pedido + `StatusPill` (mesmo mapa de cores usado em `vendedor.index.tsx`, incluindo `autorizado`, `separacao`, `conferencia`, `concluido`, `cancelado`)
- Linha 2: nome do cliente (ou "Balcão") + ícone
- Linha 3: até 2 produtos abreviados (`pedido.itens[0..1].produto.nome`) + "+N" se houver mais
- Linha 4: hora, qtde itens, total destacado
- Canto inferior direito: setinha (`ChevronDown`) que abre Popover com **ações em lote da coluna**:
  - Encerrar todos os pedidos (move todos da coluna → próximo status)
  - Faturar todos
  - Imprimir todos (abre romaneio em lote)
  - Mover para o próximo processo
  - Relação de entregas
  - Separação por produto

A setinha vive **no header da coluna** (não em cada card), aplicando a todos os pedidos da coluna. Cada ação chama `useUpdatePedidoStatus` em loop ou abre janela de impressão consolidada.

Ao mover por drag-and-drop (já existe) ou pelas ações, o `StatusPill` do card muda instantaneamente (já invalida `["pedidos"]`).

---

## 3. Detalhe do pedido — remover mock e ligar ao banco

`src/routes/_authenticated/pedidos.$id.tsx`: reescrever para usar `usePedido(id)`. Remover `import ... from "@/data/mock"`. Renderizar itens reais, cliente real, totais reais, timeline derivada de `created_at`/`updated_at`/`status`. Botão **Imprimir** abre o romaneio (item 7).

---

## 4. NF-e — alinhar coluna lateral com o card do XML

`src/routes/_authenticated/nfe.tsx`: a grid `lg:grid-cols-[1.5fr_1fr]` deixa a coluna lateral (3 cards de info) mais curta que o dropzone. Soluções:
- Trocar `space-y-2` por `flex flex-col gap-2 h-full` e adicionar `flex-1` no último item, ou
- Usar grid `grid-rows-3 h-full` para distribuir igualmente.

Sem mudar conteúdo dos cards nem temas.

---

## 5. Documentação da API — colapsar endpoints

`src/components/api-keys-panel.tsx`, função `Endpoint`: trocar por componente expansível usando `<details>` nativo ou Accordion do shadcn. Header sempre visível (método + path + descrição curta); o `<pre>` com exemplo curl só aparece ao clicar. Mantém o estilo atual.

---

## 6. Performance da troca de aba (flash de 1s)

Causa: cada rota faz `useQuery` que dispara fetch ao montar; o conteúdo aparece imediatamente (porque há `data: []` default) e "salta" quando chega resposta.

Correções não invasivas:
- Em `src/router.tsx`: manter `defaultPreloadStaleTime: 0` mas garantir `defaultPreload: "intent"` (já está). Aumentar `defaultStaleTime` do QueryClient para `30_000` e `gcTime` para `5*60_000`, para que voltar à aba use cache.
- Em `src/lib/queries.ts`: padronizar `staleTime` em queries de leitura (já tem em algumas, faltam `useNfes`, `useEstoqueMovimentos`, `useUsuarios`, `useDespesas`, `useContas` → adicionar 30s).
- Em `src/components/app-sidebar.tsx`: já usa `<Link>`; garantir `preload="intent"` (default ok).
- Não alterar componentes para não regredir layout.

Resultado: ao revisitar uma aba, mostra dados em cache instantâneo e só refaz fetch em background.

---

## 7. Romaneio para impressão (VENDA Nº X)

Novo arquivo `src/components/romaneio-print.tsx`: componente puro que recebe `pedido` (com cliente, itens, vendedor) e empresa de `configuracoes`. Reproduz fielmente o layout do print (Romaneio → trocar título para `VENDA: {numero}`):
- Cabeçalho com título grande + data/hora
- Bloco "Informações do Cliente" (Nome, Fantasia, Endereço, Bairro, Cidade/UF, Email, Fones, Vendedor, Comprador, CEP, CNPJ/CPF, IE/RG) preenchido com dados reais (campos vazios = "—")
- Tabela "Descrição dos Itens" (Ref, Produto, UN, Qtde, Vlr. Unit, Vlr. Total) com linhas reais + linha TOTAL
- Linha "Assinatura do Cliente"
- "Observações" (do pedido)
- "Pagamentos" (método + valor)
- Rodapé: Registros, data/hora geradas

Estilo: somente CSS print-friendly (preto/branco, fonte serifada nos títulos, tabela com bordas finas). Class `print:block hidden` para isolar do app.

Disparo:
- `pedidos.$id.tsx` → botão "Imprimir" abre nova janela com `RomaneioPrint` montado e dispara `window.print()`.
- Popup "Imprimir todos" do kanban: gera múltiplos romaneios em sequência (um page-break entre eles).

Adequado para impressora térmica 80mm via `@media print { @page { size: 80mm auto; } }` quando configurado em PDV; padrão A4.

---

## 8. Produtos — CRUD funcional + galeria de imagens IA

### 8a. Editar produto a partir da listagem
`src/routes/_authenticated/produtos.tsx`: no Sheet, o botão "Editar produto" já leva para `/produtos/$id`. Verificar que `produtos.$id.tsx` (já reescrito) salva via `useUpsertProduto` — está OK. Adicionar no Sheet também botões "Ajustar estoque" e "Duplicar" para ações rápidas sem navegar.

### 8b. Novo produto — garantir ação do botão Salvar
`produtos.novo.tsx` já tem `salvar()` plugado em `useUpsertProduto`. Verificar e adicionar feedback visual de loading no botão principal e no header. Sem mudanças estruturais.

### 8c. Galeria de imagens IA reutilizáveis
Migration: criar tabela `product_images` (`id`, `nome_chave` text indexado, `url` text, `created_at`, `created_by`). RLS: SELECT autenticado, INSERT staff.

Server fn `generateProductImage` (já existe): além de retornar a URL, **persistir** em `product_images` com `nome_chave = slug(nome)` para reuso.

Em `produtos.novo.tsx` e `produtos.$id.tsx`:
- Ao digitar o nome (debounce 600ms), consultar `product_images` por `nome_chave ilike '%slug%'`; se houver, mostrar "Sugestões" (grid de 4 thumbnails clicáveis que preenchem `imagem_url`).
- Botão "Gerar com IA" continua igual; após gerar, o resultado entra na galeria.
- Painel "Galeria do banco" no Sheet lateral (opcional, atrás de um disclosure) listando últimas 24 imagens com busca.

Sem dados mock.

---

## 9. Scroll transparente em todo o painel

`src/styles.css`: adicionar regra global de scrollbar fina e transparente (webkit + firefox):
```css
* { scrollbar-width: thin; scrollbar-color: transparent transparent; }
*:hover { scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: transparent; border-radius: 8px; }
*:hover::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.25); }
```
Aplica em admin e vendedor automaticamente. Sem mudar temas.

---

## 10. Revisão de backend e bugs

- `pedidos.$id.tsx`: remover dependência de `@/data/mock` (item 3).
- Garantir que `useCreatePedido` reduz estoque dos produtos (hoje não move estoque). Adicionar: após inserir itens, gerar `estoque_movimentos` tipo `saida` e `UPDATE produtos SET estoque = estoque - qtd` (em transação simulada por chamadas sequenciais com rollback de status em caso de erro). Cuidado: só fazer quando `status` passar para `autorizado` ou `concluido`, não na criação `pendente`. Disparar em `useUpdatePedidoStatus` quando `newStatus === 'autorizado' && oldStatus === 'pendente'`.
- `Caixa`, `Financeiro`, `NF-e`, `Usuários`, `Relatórios`: já estão plugados a queries reais (verificado). Sem alterações.

---

## Arquivos

**Criar**
- `src/components/pedido-form.tsx`
- `src/components/romaneio-print.tsx`
- Migration: tabela `product_images` + RLS

**Editar**
- `src/routes/_authenticated/pedidos.tsx` (cards enriquecidos + setinha de ações em lote por coluna)
- `src/routes/_authenticated/pedidos.novo.tsx` (usar `pedido-form`)
- `src/routes/_authenticated/pedidos.$id.tsx` (zero mock + botão imprimir → romaneio)
- `src/routes/vendedor.novo.tsx` (usar `pedido-form`)
- `src/routes/_authenticated/nfe.tsx` (alinhar coluna lateral)
- `src/components/api-keys-panel.tsx` (Endpoint colapsável)
- `src/routes/_authenticated/produtos.tsx` (Sheet com ações extras)
- `src/routes/_authenticated/produtos.novo.tsx` (galeria de imagens)
- `src/routes/_authenticated/produtos.$id.tsx` (galeria de imagens)
- `src/lib/queries.ts` (staleTime padronizado + dedução de estoque em mudança de status; hook `useProductImages`)
- `src/lib/product-image.functions.ts` (persistir em `product_images`)
- `src/router.tsx` (defaults de cache)
- `src/styles.css` (scrollbar transparente)

**Não tocar**: auth, RLS atual, `client.ts`, `types.ts`, temas, layout do `_authenticated.tsx`.

---

## Riscos e mitigações
- Mudança no Kanban (cards mais altos) pode aumentar scroll: limitar altura mín. e usar `line-clamp`.
- Dedução de estoque em mudança de status pode bloquear movimentações antigas se já existir histórico → gating por `pedido.updated_at` recente.
- Romaneio em janela nova: testar pop-up bloqueado e fallback para `print()` da página atual com `@media print` ocultando layout do app.
