
# Plano de implementação

Tudo será feito sem alterar o design atual (mesmos tokens, mesmo layout das telas). Cada bloco abaixo é independente e seguro.

---

## 0. Controle de "Super Admin" (admin@loja)

Hoje qualquer `admin` enxerga tudo e edita permissões/Supabase. Vou introduzir o conceito de **super-admin** = e‑mail `admin@loja.com` (único que pode gerenciar permissões, tenants Supabase e promover outros).

- `src/lib/auth.tsx`: adicionar `isSuperAdmin` no `SessionUser` (verdadeiro só se `email === 'admin@loja.com'`; tornar configurável via constante `SUPER_ADMIN_EMAIL`).
- `src/lib/permissions.ts → useMyPermissions`:
  - Super-admin: tudo liberado, sempre.
  - Admin comum: passa a respeitar `user_permissions` (default = **negado** para `/supabase` e `/usuarios`; default permitido para o resto).
- `src/components/app-sidebar.tsx`: já filtra por menu; somente garantir que `/supabase` e `/usuarios` ficam ocultos quando `allowed` for false.
- `src/routes/_authenticated/supabase.tsx` e `usuarios.tsx`: `beforeLoad` redireciona para `/` se `!isSuperAdmin && !allowed(menu)`.
- `usuarios.tsx → PermissionsDialog`: botão de permissões só aparece para super-admin.

---

## 1. CRM › Fornecedores (nova aba)

- Migration: tabela `public.fornecedores` (razao_social, cpf_cnpj, ie, cidade, estado, telefone opcional, email opcional). RLS: leitura autenticada, escrita `is_staff`.
- Rota nova: `src/routes/_authenticated/fornecedores.tsx` (lista + form drawer no mesmo padrão visual de `clientes.tsx`).
- Sidebar: novo item "Fornecedores" no grupo CRM, com chave `/fornecedores` em `MENU_KEYS`.

## 2. Produtos

- **Lista (produtos.tsx)**: coluna "Estoque" agora calcula em UN (`estoque * (qtd_un_base ?? 1)`), exibindo sempre `XX UN` independente da unidade interna.
- **Cadastro de produto (product-form-panel.tsx)**: novo campo obrigatório `fornecedor_id` (select dos fornecedores).
- Migration: `ALTER TABLE produtos ADD COLUMN fornecedor_id uuid REFERENCES fornecedores(id)`, `tem_nota_fiscal boolean default false` (flag fiscal do estoque atual).
- **Nova Entrada de Estoque**: rota `src/routes/_authenticated/produtos.entrada.tsx` (botão "Nova Entrada" em `produtos.tsx`).
  - Form: produto (autocomplete), quantidade, fator (UN/CX/FD), custo opcional, fornecedor, **switch "Tem nota fiscal?"**.
  - Ao salvar: inserir em `estoque_movimentos` (tipo `entrada`), incrementar `produtos.estoque`, marcar `tem_nota_fiscal = true` no produto se a entrada for fiscal.

## 3. Financeiro

- Remover "Fiado" de `PAYMENT_LABELS` em `configuracoes.tsx`, do enum efetivo em `src/lib/pagamento.ts` e da UI do `payment-splitter.tsx`. Manter "Nota promissória".
- **Faturamento real** (KPI principal):
  - Novo card no Dashboard + relatório dedicado, somando apenas `pedidos.status = 'faturado'`.
  - Filtros: dia / mês / ano com agregação.
- **Patrimônio**: migration `public.patrimonio` (nome, categoria, valor, data_aquisicao, observacoes). Rota `financeiro.tsx` ganha aba "Patrimônio".
- **Contas a pagar / boletos**: já existe `contas` (tipo `pagar/receber`). Adicionar UI explícita "Nova conta a pagar" com vencimento + anexo opcional (`anexo_url`). Migration: `ALTER TABLE contas ADD COLUMN anexo_url text, categoria text`.

## 4. Pedidos › Faturamento (Kanban)

- No popup do pedido (`pedidos.$id.tsx`), na coluna/aba Faturamento adicionar dois botões:
  1. **Faturar pedido** → marca `status=faturado` + cria `faturamento` simples (já existe).
  2. **Faturar pedido como NF‑e** → gera NF‑e modelo 55 (somente layout/DANFE, sem transmissão SEFAZ por enquanto, conforme escopo do app).
- Reescrever `src/components/nf-print.tsx` como **DANFE Modelo 55** (cabeçalho emitente, destinatário, produtos com CFOP/NCM placeholder, totais, chave 44 dígitos mock, código de barras Code128, observações fiscais). Visual profissional, A4, imprime via `window.open` (já corrigido).
- Migration: `ALTER TABLE pedidos ADD COLUMN nfe_numero text, nfe_chave text, nfe_emitida_em timestamptz`.

## 5. Pedidos › Novo Pedido

- **Bug do autocomplete de cliente**: em `pedido-form.tsx`, dropdown fica preso/duplicado. Substituir por `Command` + `Popover` controlado (mesmo componente já usado em outros pontos), resetando estado on-select.
- **Popup ao adicionar produto**: ao clicar no produto da busca, abrir `Dialog` com campos: quantidade, fator (UN/CX/FD a partir de `produtos.embalagens`), preço unitário (preenchido com `preco_venda`, editável). Confirmar adiciona ao pedido.

## 6. Pedidos Kanban (cards)

- Em `pedidos.index.tsx`, simplificar o card: **nome fantasia do cliente** (cliente.nome_fantasia ?? cliente.nome), vendedor, cidade (de `cliente.endereco.cidade`), total formatado, número do pedido, status badge. Remover demais textos.

## 7. Entradas NF‑e

- `nfe.tsx`: ao listar itens com `produto_id IS NULL`, exibir botão "Cadastrar produto" que abre um `Sheet` com `product-form-panel` pré-preenchido (`nome = descricao_xml`, `sku = codigo_xml`, `codigo_barras = ean_xml`, `preco_custo = valor_unit`). Ao salvar, faz `UPDATE nfe_itens SET produto_id` automaticamente.

## 8. Estoque automático em vendas

- Hoje, criar pedido **não baixa estoque**. Criar trigger SQL:
  - `AFTER INSERT ON pedido_itens` → `UPDATE produtos SET estoque = estoque - NEW.qtd * NEW.qtd_un_por_embalagem WHERE id = NEW.produto_id` + insert em `estoque_movimentos`.
  - `AFTER DELETE` reverte.
  - Em cancelamento (`pedidos.status = 'cancelado'`): trigger devolve estoque.

## 9. Relatórios

Refatorar `relatorios.tsx`:
- **Filtros globais**: período (de/até), vendedor (select), fornecedor (select). Aplicados a todos os relatórios.
- Novos relatórios adicionados em `relatorio-catalog.tsx`:
  - Vendas por vendedor (já existe — manter)
  - Vendas por fornecedor (novo: join via produto)
  - Vendas por período
  - Estoque detalhado (por produto + fornecedor + fiscal/não)
  - Estoque por fornecedor
  - Estoque fiscal (apenas `tem_nota_fiscal = true`)
  - Lucro por categoria (`SUM((preco_venda - preco_custo) * qtd)` agrupado por categoria)
  - Lucro por produto
  - Vendas encerradas por período (status `encerrado`)
  - Despesas da empresa
  - Itens do patrimônio
  - Faturamento por período (somente status=faturado)
- Pesquisa de produto em coluna do Kanban: campo de busca no header do Kanban que filtra cards cujo `pedido_itens.produto.nome ILIKE`.

## 10. Configurações › Empresa

- Tornar campos `razao`, `cnpj`, `ie`, `endereco`, `telefone`, `email` **obrigatórios**.
- Adicionar campo **IE** (`empresa_ie`) na tabela `app_settings` + form.
- Bloqueio global: criar `useEmpresaCompleta()` em `src/lib/queries.ts`. Em rotas críticas (`pedidos.novo`, `pdv`, faturamento NF‑e) mostrar banner travante "Preencha dados da empresa em Configurações > Empresa".

---

## Detalhes técnicos / arquivos a tocar

```text
Migrations (uma única):
  - create table public.fornecedores (+ GRANT + RLS)
  - alter table produtos add fornecedor_id, tem_nota_fiscal
  - create table public.patrimonio (+ GRANT + RLS)
  - alter table contas add anexo_url, categoria
  - alter table app_settings add empresa_ie text
  - alter table pedidos add nfe_numero/nfe_chave/nfe_emitida_em
  - trigger pedido_itens → baixa/estorno estoque + log movimento

Código:
  - src/lib/auth.tsx                (isSuperAdmin)
  - src/lib/permissions.ts          (default negar /supabase /usuarios p/ admin comum)
  - src/components/app-sidebar.tsx  (item Fornecedores; gating)
  - src/routes/_authenticated/{supabase,usuarios}.tsx (beforeLoad gate)
  - src/routes/_authenticated/fornecedores.tsx        (novo)
  - src/routes/_authenticated/produtos.tsx            (coluna UN, botão Nova Entrada)
  - src/routes/_authenticated/produtos.entrada.tsx    (novo)
  - src/components/product-form-panel.tsx             (fornecedor_id)
  - src/lib/pagamento.ts + payment-splitter + configuracoes (sem Fiado)
  - src/routes/_authenticated/financeiro.tsx          (abas Faturamento/Patrimônio/Contas)
  - src/routes/_authenticated/pedidos.$id.tsx         (botões Faturar / Faturar NF-e)
  - src/components/nf-print.tsx                       (DANFE modelo 55 profissional)
  - src/components/pedido-form.tsx                    (autocomplete cliente + popup produto)
  - src/routes/_authenticated/pedidos.index.tsx       (cards minimalistas + busca produto)
  - src/routes/_authenticated/nfe.tsx                 (cadastrar produto inline)
  - src/components/relatorio-catalog.tsx              (novos relatórios + filtros)
  - src/routes/_authenticated/relatorios.tsx          (filtros globais)
  - src/routes/_authenticated/configuracoes.tsx      (IE + obrigatoriedade)
  - src/lib/queries.ts                                (useEmpresaCompleta, useFornecedores, usePatrimonio, novas mutations)
```

## Ordem de execução

1. Migrations (única) + regenerar types.
2. Super-admin gating (curto, alto impacto de segurança).
3. Fornecedores (base usada por Produtos / Relatórios).
4. Produtos (UN, fornecedor, Nova Entrada) + trigger estoque.
5. Financeiro (remover Fiado, Patrimônio, Contas, KPI Faturamento).
6. Pedidos: fix bug autocomplete, popup produto, cards kanban, faturar NF‑e + DANFE.
7. Entradas NF‑e: cadastro inline.
8. Relatórios novos + filtros.
9. Configurações: IE + bloqueios.
10. Smoke test em cada tela tocada.

## Decisão pendente

O e‑mail super-admin será fixado como `admin@loja.com`. Se você usa outro endereço, me diga o exato antes que eu comece — fora isso, sigo direto.
