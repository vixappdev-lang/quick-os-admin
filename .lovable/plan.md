
# Quick OS — Refatoração Enterprise (Fase 2)

Plano completo para transformar o Quick OS de um protótipo com mocks em um sistema operacional **real, conectado, responsivo e otimizado**, com foco em **lojas de conveniência**.

---

## 1. Backend real — Lovable Cloud (Supabase)

Ativar Lovable Cloud e migrar 100% dos dados em memória (`src/data/mock.ts`) para tabelas reais.

### Tabelas

```text
profiles            id, nome, email, telefone, avatar_url
user_roles          user_id, role (admin | gerente | operador | vendedor)
categorias          id, nome, cor, icone
produtos            id, sku, nome, categoria_id, preco_venda, preco_custo,
                    estoque, estoque_minimo, unidade, codigo_barras, imagem_url, ativo
clientes            id, nome, telefone, email, documento, endereco (jsonb),
                    limite_credito, observacoes
pedidos             id, numero, cliente_id, vendedor_id, operador_id,
                    origem (balcao|pdv|vendedor|delivery), status
                    (rascunho|pendente|autorizado|separacao|conferencia|
                    faturamento|concluido|cancelado), pagamento, subtotal,
                    desconto, total, observacoes, created_at, updated_at
pedido_itens        id, pedido_id, produto_id, qtd, preco_unit, desconto, total
caixa_sessoes       id, operador_id, abertura, fechamento, valor_inicial,
                    valor_final, status
caixa_movimentos    id, sessao_id, tipo (sangria|suprimento|venda|despesa),
                    valor, descricao
despesas            id, descricao, valor, categoria, vencimento, pago, pago_em
contas              id, tipo (pagar|receber), descricao, valor, vencimento, status
nfe_entradas        id, numero, fornecedor, valor_total, xml_url, status
                    (importado|conferindo|confirmado), created_at
nfe_itens           id, nfe_id, codigo_xml, descricao_xml, qtd, valor_unit,
                    produto_id (FK opcional p/ vínculo), divergencia
estoque_movimentos  id, produto_id, tipo (entrada|saida|ajuste|perda),
                    qtd, motivo, referencia_id, created_at
fidelidade_pontos   cliente_id, pontos, atualizado_em
audit_logs          id, user_id, acao, entidade, entidade_id, payload, created_at
```

RLS em todas: admin/gerente full, operador escreve operacional, **vendedor só vê os próprios pedidos**. Roles via tabela `user_roles` + função `has_role` (security definer).

### Storage buckets
- `produtos` (imagens), `nfe-xmls` (XMLs importados), `avatares`.

### Server functions (`src/lib/*.functions.ts`)
- `pedidos.create / update / changeStatus / cancel / print`
- `pdv.checkout` (transação: pedido + itens + movimento de estoque + caixa)
- `nfe.parseXml` (upload XML → parse server-side → cria `nfe_entradas` + `nfe_itens` com sugestão de vínculo por SKU/EAN)
- `nfe.confirmar` (gera entradas de estoque)
- `caixa.abrir / fechar / sangria / suprimento`
- `estoque.ajuste`

### Auth
- Email/senha + Google.
- Trigger `handle_new_user` cria `profiles`.
- Seed: 1 admin + 1 vendedor de teste com credenciais visíveis no /login.

---

## 2. Reestruturação do menu

**Remover do menu lateral:** Delivery, Fiado, Comandas, Backup, Integrações.

**Realocar:**
- `Backup` e `Integrações` → tabs internas em **Configurações**.
- `Fidelidade` e `Fiado` → tabs internas em **Clientes**.
- `Categorias` → tab interna em **Produtos**.
- `Movimentações` e `NF-e` → tabs internas em **Estoque**.
- `Despesas`, `Contas`, `Fluxo` → tabs internas em **Financeiro**.
- `Permissões` e `Logs` → tabs internas em **Usuários**.

**Menu final (enxuto, 9 itens):**

```text
Operacional   → Dashboard, PDV, Pedidos (Kanban)
Catálogo      → Produtos (tabs: Lista, Categorias)
Estoque       → Estoque (tabs: Posição, Movimentações, NF-e)
Financeiro    → Financeiro (tabs: Caixa, Fluxo, Despesas, Contas)
CRM           → Clientes (tabs: Lista, Fidelidade, Fiado)
Relatórios
Administração → Usuários (tabs: Equipe, Permissões, Auditoria)
Configurações → (tabs: Empresa, PDV, Impressão, Integrações, Backup, Tema)
```

Vendedor vê apenas: **Meus Pedidos**, **Novo Pedido**, **Catálogo (somente leitura)**.

---

## 3. Pedidos — Kanban funcional

Substituir a tabela atual por um **Kanban drag-and-drop** estilo Trello, próprio do Quick (sem copiar a imagem de referência).

### Colunas (status)
`Pendente · Autorizado · Separação · Conferência · Faturamento · Concluído`

### Card do pedido
- Header: `#numero` + tempo decorrido + badge de origem.
- Cliente + cidade.
- Chips: status de pagamento, crédito disponível, vendedor.
- Footer: total em destaque + ícone de itens.
- Menu **⋯** (popover): **Ver detalhes**, **Editar**, **Imprimir**, **Encerrar**, **Cancelar**.

### Interações
- Drag-and-drop com `@dnd-kit/core` (suaviza, suporta touch → mobile).
- Ao soltar em outra coluna → server fn `pedidos.changeStatus` + invalidate React Query + animação otimista.
- Filtros sticky no topo: período, vendedor, origem, busca.
- Toggle **Kanban / Lista** preservado para usuários que preferem tabela.

### Novo pedido (rota dedicada `/pedidos/novo`)
Layout inspirado na ref, mas no padrão Quick:
- **Dados principais** (grid responsivo 1/2/4 cols): Orçamento, Pedido (auto), Data, Empresa, Tipo, Operação, Cliente (combobox com busca server-side a partir de 2 caracteres).
- **Produtos**: input com busca instantânea + scanner mock; tabela editável (Ref, Produto, Qtd, UN, Vlr Unit, Desconto, Total) com totalizadores ao vivo.
- **Resumo lateral sticky** (desktop) / **bottom-sheet** (mobile): subtotal, desconto, frete, total, método pagamento, botão salvar.
- Validação Zod, toast de feedback, redireciona para o Kanban com card já posicionado.

---

## 4. PDV — refino

PDV continua como **tela cheia separada** (faz sentido — operação rápida em caixa), mas:
- Conecta ao backend real (`pdv.checkout`).
- Atalhos F2/F8/F4 funcionais.
- Sessão de caixa obrigatória (bloqueia venda se caixa fechado, com CTA "Abrir caixa").
- Layout responsivo: tablet horizontal 60/40, mobile vira fluxo em 2 etapas (produtos → carrinho).

---

## 5. NF-e — fluxo real funcional

1. Dropzone aceita `.xml` (single ou múltiplos).
2. Upload para bucket `nfe-xmls`.
3. Server fn `nfe.parseXml` lê XML (parser `fast-xml-parser`), extrai itens NFe, cria registros.
4. Tela de **conferência**: tabela lado-a-lado (XML × cadastro), destaque de divergências, autocomplete para vincular item sem cadastro a um `produto` existente ou criar novo inline.
5. Botão **Confirmar entrada** → gera `estoque_movimentos` em transação, atualiza `produtos.estoque`, marca NF-e como `confirmado`.

---

## 6. Painel do vendedor

Novo layout dedicado em `/_vendedor/*` (guard de role = `vendedor`).

- Shell minimalista mobile-first: bottom-nav com 3 itens (Pedidos / Novo / Catálogo).
- **Pedidos**: lista cronológica dos pedidos do vendedor (filtrada por `vendedor_id = auth.uid()`), status em badge colorido, pull-to-refresh.
- **Novo pedido**: mesma server fn do admin, formulário enxuto mobile (steps: Cliente → Itens → Revisão).
- **Catálogo**: grid de produtos com busca, somente leitura.
- Login do vendedor cai direto em `/_vendedor/pedidos` (admin cai em `/`).
- 100% conectado ao mesmo backend → pedido criado pelo vendedor aparece **em tempo real** no Kanban do admin via Supabase Realtime (channel em `pedidos`).

---

## 7. Refino visual (modo claro)

Ajustes em `src/styles.css`:
- `--border` de `oklch(0.93 0.01 250)` → `oklch(0.88 0.012 250)` (mais nítida).
- Nova `--border-strong` para divisores de seção.
- Sombra de card: `0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)` (estava muito sutil).
- Pontilhados (`border-dashed`): trocar por `border-2 border-dashed` com `--border-strong`.
- Hover de linha em tabela com cor um pouco mais visível.
- Headers de tabela com bg `oklch(0.975 0.005 250)`.

Sem neon. Paleta atual mantida.

---

## 8. Performance — clique entre abas lento

Causas atuais e correções:
- **Sem code-splitting agressivo** → habilitar `lazy` no router (TanStack faz por rota, mas garantir que componentes pesados — Recharts, dnd-kit — sejam `lazy()` dentro das rotas).
- **Recharts pesado** → importar só os módulos usados, memoizar dados.
- **React Query como camada padrão** com `defaultPreloadStaleTime: 30_000` e `staleTime: 60_000` por rota para evitar refetch a cada clique.
- **Preload no hover** dos links da sidebar (`preload="intent"` já é padrão, validar).
- **Sidebar fixa** (sem re-render por rota) — mover `useLocation` para componente filho.
- Remover animações de mount caras em rotas (`framer-motion` apenas em hero/transições intencionais).
- Tabelas grandes → virtualização com `@tanstack/react-virtual` em listas > 100 itens.

---

## 9. Responsividade total (mobile-first)

Auditoria por tela com breakpoints `sm 640 / md 768 / lg 1024`.

- **Sidebar** vira `Sheet` (drawer) em `< lg`. Header ganha botão hambúrguer.
- **Header**: busca colapsa em ícone, breadcrumb mostra só último nível em mobile.
- **KPI cards**: grid `1 / 2 / 3 / 6` cols.
- **DataTable**: em mobile vira lista de cards (componente `<ResponsiveTable>` que detecta breakpoint).
- **Kanban**: em mobile colunas viram tabs horizontais swipeable; em tablet scroll horizontal com snap.
- **Formulários** (novo pedido, produto): grid colapsa para 1 col, resumo lateral vira `Drawer` bottom-sheet com botão fixo "Ver resumo".
- **PDV mobile**: fluxo em duas telas (produto → carrinho) com FAB para alternar.
- Toques mínimos 44px, font-size mínimo 14px, inputs `h-11` em mobile.

---

## 10. Botões sem ação — passar a limpa

Auditoria varrendo todos os arquivos em `src/routes/_authenticated/**`:
- Cada `<button>` recebe `onClick` real (server fn, navegação, ou modal).
- Modais reais (shadcn `Dialog`) para: editar produto rápido, abrir caixa, sangria, ajuste estoque, vincular produto NF-e, confirmar exclusão.
- Toasts (`sonner`) em todas as ações.
- Loading states (`isPending` do React Query) em todos os submits.

---

## 11. Remoções

Deletar rotas e arquivos:
- `src/routes/_authenticated/delivery.tsx`
- `src/routes/_authenticated/comandas.tsx`
- `src/routes/_authenticated/fiado.tsx` (vira tab em clientes)
- `src/routes/_authenticated/fidelidade.tsx` (vira tab em clientes)
- `src/routes/_authenticated/backup.tsx` (vira tab em config)
- `src/routes/_authenticated/integracoes.tsx` (vira tab em config)
- `src/routes/_authenticated/movimentacoes.tsx` (vira tab em estoque)
- `src/routes/_authenticated/estoque.movimentacoes.tsx` (consolidar)
- `src/routes/_authenticated/nfe.tsx` (vira tab em estoque)
- `src/routes/_authenticated/categorias.tsx` (vira tab em produtos)
- `src/routes/_authenticated/despesas.tsx`, `contas.tsx`, `financeiro.tsx` → consolidar em `financeiro.tsx` com tabs
- `src/routes/_authenticated/permissoes.tsx`, `logs.tsx` → consolidar em `usuarios.tsx` com tabs
- `src/data/mock.ts` (após migração)

---

## Detalhes técnicos

**Stack adicional:** `@dnd-kit/core` + `@dnd-kit/sortable` (Kanban), `fast-xml-parser` (NF-e), `@tanstack/react-virtual` (listas grandes), `react-hook-form` + `zod` (forms grandes).

**Realtime:** canal `pedidos` em Supabase para sincronizar Kanban admin ↔ vendedor.

**Ordem de execução (1 build longo, mas faseada internamente):**
1. Lovable Cloud + schema + RLS + seed + auth real
2. Server functions (pedidos, pdv, nfe, caixa, estoque)
3. Refator menu + tabs consolidadas + remoções
4. Kanban + Novo pedido refeito
5. NF-e funcional (upload + parse + conferência)
6. PDV conectado + caixa
7. Painel vendedor + realtime
8. Refino visual + performance (lazy, memo, virtual)
9. Pass de responsividade mobile em todas as telas
10. Auditoria de botões sem ação

**Fora de escopo desta fase:** Delivery, comandas, integrações fiscais reais (SEFAZ), WhatsApp real, app nativo.

---

Confirmando este plano, sigo para implementação completa.
