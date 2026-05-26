## Plano Final — Pedidos, Pagamentos múltiplos, Produtos UN/FD/CX, Fix Supabase env & Movimentações

Agrupa Parte 1 + Parte 2. Sem implementação até aprovação.

---

### 1. Pagamentos múltiplos (modelo "lista de pagamentos")

Hoje cada pedido tem **1 forma** (`pagamento` text). Vamos suportar **N formas** somando até o total.

**Banco** — nova tabela `pedido_pagamentos`:
- `id`, `pedido_id` (FK), `tenant_id`
- `forma` (pix, dinheiro, debito, credito, nota_promissoria, cheque, fiado, outro)
- `condicao` (à vista / 7/14/30 dias / parcelado) — texto livre
- `vencimento` (date, opcional)
- `valor` (numeric)
- `created_at`
- GRANTs + RLS por tenant (mesmo padrão das outras tabelas)
- Trigger que recalcula `pedido.total_pago` e `pedido.restante`
- Manter coluna legada `pagamento` para compatibilidade (preenchida com a 1ª forma)
- Renomear label "Fiado" → **"Nota promissória"** já feito no `pagamento.ts`; manter ambos os ids para retrocompat

**Componente novo** `PaymentSplitter` (`src/components/payment-splitter.tsx`):
- Layout igual ao print: linha "Forma · Condição · Vencimento · Valor · Adicionar"
- Tabela das formas já adicionadas (com botão remover)
- Rodapé: **Total da Venda · Total Pago · Restante · Créditos**
- Bloqueia salvar se `restante !== 0` (ou permite com aviso se "fiado/nota promissória")
- 100% responsivo (cards no mobile, tabela no desktop)

**Onde plugar:**
- **Novo Pedido** (`pedido-builder.tsx`): substituir o grid atual de 5 botões por `PaymentSplitter` embutido
- **Detalhes do pedido** (`pedidos.$id.tsx`): menu de 3 pontinhos → item **"Pagamentos"** → abre `Sheet` lateral com `PaymentSplitter` (adicionar / editar / remover formas a qualquer momento)

---

### 2. Kanban de Pedidos — Encerrar + Faturar

**Encerrar pedido:**
- Novo status `encerrado` (enum/check) — adicionar na migration
- Botão "Encerrar" no card do Kanban e no detalhe
- Filtro do Kanban: ocultar `encerrado`
- Lista de pedidos: nova aba/filtro **"Encerrados"**

**Faturamento (NFC-e consumidor final):**
- Aba "Faturamento" no detalhe do pedido
- Por ora: **gerar DANFE-simulado em PDF/HTML imprimível** (cabeçalho da empresa, dados do cliente "Consumidor Final" quando sem cliente, itens, totais, formas de pagamento, QR code placeholder)
- Tabela `pedido_faturas`: `id`, `pedido_id`, `numero`, `serie`, `chave_acesso` (placeholder), `emitida_em`, `pdf_url?`, `status` (rascunho/emitida/cancelada)
- **Integração SEFAZ real fica para fase 2** — aguardar exemplo de NF que o usuário vai enviar para mapear campos. Estrutura já fica preparada.

---

### 3. Novo Pedido — Novo Cliente sem dialog antigo

- Em `pedido-builder.tsx`, botão "+ Novo cliente" hoje abre dialog
- Trocar por navegação com `useNavigate` para `/clientes/novo?returnTo=/pedidos/novo&select=1`
- `clientes/novo` lê `returnTo` e, ao salvar, volta. `pedidos/novo` recupera o cliente recém-criado via search param ou via cache (`useClientes` + último criado) e já seleciona

---

### 4. Produtos — UN / FD / CX (multi-embalagem)

**Banco** (migration):
- Adicionar em `produtos`:
  - `unidade_base` (default "UN")
  - `embalagens` jsonb (default `[]`) — formato:
    ```
    [
      { "tipo": "FD", "qtd_un": 12, "preco_venda": 60.00, "codigo_barras": "789..." },
      { "tipo": "CX", "qtd_un": 24, "preco_venda": 115.00 }
    ]
    ```
- Em `pedido_itens`:
  - `embalagem_tipo` ("UN"|"FD"|"CX", default "UN")
  - `qtd_un_por_embalagem` (int, default 1)
  - `qtd_embalagens` (numeric) — `qtd` continua sendo qtd em UN (qtd_embalagens × qtd_un_por_embalagem) para manter cálculo de estoque

**Form de Produto** (`product-form-panel.tsx`):
- Nova seção "Embalagens de venda" com lista editável (tipo, UN por embalagem, preço, código de barras opcional)

**Adicionar item no Pedido** (`pedido-builder.tsx`):
- Ao clicar em um produto, abrir **modal "Dados do Produto"** (estilo do print enviado anteriormente):
  - Referência, Produto (readonly)
  - **Seletor UN/FD/CX** (apenas as cadastradas)
  - Quantidade, Valor Unitário (preenchido pela embalagem), Total Bruto
  - % Desconto, Valor de Desconto
  - % Acréscimo, Valor de Acréscimo
  - Total Líquido
- HID scanner: ao ler código que bate com `embalagens[].codigo_barras`, já abre modal com aquela embalagem pré-selecionada

---

### 5. Fix CRÍTICO — "Missing Supabase environment variable(s)" fora do preview

**Causa raiz:** `src/integrations/supabase/client.ts` lê `import.meta.env.VITE_SUPABASE_URL` que é substituído **em build-time pelo Vite**. No deploy Cloudflare Worker (`wrangler.jsonc`/`vercel.json`) as envs `VITE_*` precisam estar presentes **no momento do build**, mas estão sendo lidas só em runtime → o bundle do worker fica com `undefined`.

**Solução estratégica (em camadas):**

1. **Tornar o client lazy + tolerante**: já é Proxy lazy ✅. Adicionar fallback: ler também de `globalThis.__SUPABASE_ENV__` injetado pelo SSR a partir de `process.env.SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (que **existem** no `.env` do worker).
2. **Injetar envs no HTML via root SSR**: em `src/routes/__root.tsx` (`head()` ou shell), emitir um `<script>` com:
   ```
   window.__SUPABASE_ENV__ = { url: "...", key: "..." }
   ```
   lido de `process.env.SUPABASE_URL` no servidor (createServerFn `getPublicEnv` chamado no loader do root, com cache).
3. **Atualizar `client.ts`** (o arquivo é auto-gerado, então criar um **wrapper** `src/integrations/supabase/runtime-env.ts` e ajustar apenas a leitura via Proxy se possível; se não der, documentar que o arquivo precisa de regeneração). Ordem de leitura:
   `import.meta.env.VITE_*` → `globalThis.__SUPABASE_ENV__` → `process.env.SUPABASE_*` → erro amigável.
4. **Garantir build Vercel/Worker**: no `scripts/prepare-vercel-output.mjs` e/ou `vite.vercel.config.ts`, **forçar** `define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL), ... }` na config de build, assim mesmo sem `VITE_*` exportadas no ambiente de deploy o bundle leva o valor correto.
5. **Mensagem de erro** continua existindo só como último recurso, mas com link de "Reconectar Lovable Cloud".

Resultado: aplicação publicada nunca mais quebra com esse erro, independente de onde o usuário hospede.

---

### 6. Fix — botão "Movimentações" sem ação

Investigar `src/routes/_authenticated/estoque.tsx` e o menu/sidebar. Causa típica: `<Link to="/estoque/movimentacoes">` com path que **não** bate com `createFileRoute("/_authenticated/estoque/movimentacoes")` (filename usa ponto: `estoque.movimentacoes.tsx` → rota `/estoque/movimentacoes`). Plano:
- Verificar `routeTree.gen.ts` para confirmar id real da rota
- Substituir `<button onClick>` por `<Link to="/estoque/movimentacoes">` tipado
- Garantir que `estoque.tsx` (layout pai) renderiza `<Outlet />` se for layout, ou que `movimentacoes` é rota irmã independente
- Testar navegação no preview antes de finalizar

---

### Arquivos impactados

**Migrations** (uma única):
- `pedido_pagamentos` (tabela + RLS + GRANTs + trigger soma)
- `pedido_faturas` (tabela + RLS + GRANTs)
- `produtos.embalagens jsonb`, `produtos.unidade_base`
- `pedido_itens.embalagem_tipo`, `qtd_un_por_embalagem`, `qtd_embalagens`
- `pedidos.status` aceitar `encerrado`; colunas `total_pago`, `restante` (numeric)

**Código novo:**
- `src/components/payment-splitter.tsx`
- `src/components/produto-add-dialog.tsx` (modal estilo print UN/FD/CX)
- `src/components/fatura-print.tsx` (DANFE simulada)
- `src/integrations/supabase/runtime-env.ts` (fallback envs)
- `src/lib/queries.ts` — `useAddPedidoPagamento`, `useRemovePedidoPagamento`, `useEncerrarPedido`, `useFaturarPedido`

**Código editado:**
- `src/components/pedido-builder.tsx` (PaymentSplitter + novo cliente via rota + dialog UN/FD/CX)
- `src/components/pedido-form.tsx`
- `src/components/product-form-panel.tsx` (embalagens)
- `src/routes/_authenticated/pedidos.$id.tsx` (menu 3 pontos → Pagamentos / Encerrar / Faturar; aba Faturamento)
- `src/routes/_authenticated/pedidos.index.tsx` (filtro Encerrados, ação Encerrar no Kanban)
- `src/routes/_authenticated/estoque.tsx` (corrigir link Movimentações)
- `src/routes/__root.tsx` (injetar envs Supabase no SSR)
- `src/integrations/supabase/client.ts` (se possível; ou wrapper)
- `vite.vercel.config.ts` / `scripts/prepare-vercel-output.mjs` (define envs no build)
- `src/lib/pagamento.ts` (já tem nota_promissoria; reordenar)

**Aceite:**
- Pagamentos múltiplos funcionam em Novo Pedido **e** no menu 3 pontos do detalhe; soma trava em "Restante 0,00"
- Encerrar pedido tira do Kanban e aparece em "Encerrados" na lista
- Faturar gera PDF imprimível (estrutura pronta para NFC-e real depois)
- Novo Cliente abre a tela cheia e volta selecionado
- Produto pode ser cadastrado com UN+FD+CX; dialog de adicionar item permite escolher embalagem
- App publicado **não** mostra mais erro "Missing Supabase environment variable(s)"
- Clicar em "Movimentações" navega para `/estoque/movimentacoes` e renderiza a tela

Aguardando aprovação para implementar.