
Esta versão MANTÉM tudo do plano anterior e ACRESCENTA os itens novos. Resumo do escopo total abaixo, com os novos itens marcados como **NOVO**.

---

## Telas/abas que serão alteradas (lista precisa)

1. `src/routes/_authenticated/clientes.tsx` — lista + responsividade mobile
2. `src/routes/_authenticated/clientes.novo.tsx` (novo) — formulário detalhado
3. `src/routes/_authenticated/clientes.$id.tsx` — modo edição com mesmo form + **NOVO** botão “Imprimir” puxando dados do cliente
4. `src/routes/_authenticated/pedidos.index.tsx` — Kanban + tabs Kanban/Lista + coluna Faturamento + ações em massa + filtros
5. `src/routes/_authenticated/pedidos.novo.tsx` — pagamentos novos
6. `src/routes/_authenticated/pedidos.$id.tsx` — modo edição
7. `src/components/pedido-form.tsx` — pagamentos + edição
8. `src/components/pedido-actions-menu.tsx` (novo) — três pontinhos
9. `src/components/cliente-form.tsx` (novo) — formulário cliente
10. `src/components/cliente-print.tsx` (novo) — **NOVO** PDF/impressão do cadastro do cliente
11. `src/routes/_authenticated/relatorios.tsx` — **NOVO** botão “Relatório” ao lado do “Exportar”, abrindo tela com abas
12. `src/routes/_authenticated/caixa.tsx` — **NOVO** revisão e correção completa de bugs
13. `src/routes/_authenticated/usuarios.tsx` — responsividade + sheet no mobile
14. Passada mobile em: `produtos`, `estoque`, `financeiro`, `pdv`, `nfe`, `configuracoes`, `relatorios`
15. `src/lib/queries.ts` — hooks novos (faturamento, vendedores, filtros lista, fix caixa)
16. Novas migrations Supabase (descritas abaixo)

---

## 1) Tela Adicionar Clientes (detalhada)

Novo componente `cliente-form.tsx` no estilo do `pedido-form` (cards seccionados, sticky footer, responsivo).

Campos:
- Tipo (PF/PJ) com máscara dinâmica
- Cliente (Razão Social) / Nome
- Nome Fantasia
- CNPJ/CPF
- IE — Inscrição Estadual (com toggle “Isento”)
- Endereço, Bairro, Cidade, UF, CEP (auto-fill via ViaCEP)
- Complemento
- Telefone, E-mail
- Vendedor responsável (select de usuários com role `vendedor`)
- Observações, Limite de crédito (existente)

Migration em `clientes`: `nome_fantasia text`, `ie text`, `tipo_pessoa text default 'PF'`, `vendedor_id uuid`. `endereco` jsonb continua com `{logradouro, bairro, cidade, uf, cep, complemento}`.

Rotas: `/clientes/novo` (criação), `/clientes/$id` (edição com mesmo form).

### **NOVO** — Imprimir cliente
- Botão “Imprimir” em `/clientes/$id`.
- Novo `cliente-print.tsx` análogo a `romaneio-print.tsx`: gera HTML A4 com cabeçalho da empresa (de `app_settings`), bloco “Dados do Cliente” preenchido automaticamente (Nome, Fantasia, CNPJ/CPF, IE, telefone, e-mail, endereço completo, vendedor, observações, limite de crédito, saldo fiado) e abre `window.print()`.
- Também ajustar `romaneio-print.tsx` para usar os novos campos (`nome_fantasia`, `ie`, etc.) no bloco “Informações do Cliente” do pedido — hoje lê `cli.fantasia`/`cli.ie` que não existem; passa a ler dos campos reais.

---

## 2) Novo Pedido — Formas de pagamento

Estender enum `pagamento` para incluir: `pix`, `dinheiro`, `promissoria`, `cheque`, `debito`, `credito`, `fiado`. Migration: `ALTER TYPE pagamento ADD VALUE IF NOT EXISTS ...` para cada novo.

No `pedido-form.tsx`: substituir o seletor atual por grade de cards selecionáveis com ícone para cada método (PIX, Dinheiro, Promissória, Cheque, Débito, Crédito), respeitando `app_settings.metodos_pagamento` (adicionar `promissoria` e `cheque` aos toggles existentes em Configurações).

---

## 3) Faturamento no Kanban

Banco:
- Adicionar valor `faturamento` ao enum `pedido_status`.
- Novas tabelas: `faturamentos (id, numero, total, created_by, created_at)` e `faturamento_pedidos (faturamento_id, pedido_id)`, RLS `is_staff`.

UI Kanban (`pedidos.index.tsx`):
- Nova coluna “Faturamento” entre as atuais e “Encerrado”.
- Botão no topo: **Faturar todos os pedidos** → cria 1 `faturamento`, vincula os pedidos da coluna, marca como `encerrado` e remove do Kanban.
- Botão no topo da coluna “Encerrado”: **Encerrar todos os pedidos** → marca como encerrado e filtra fora do Kanban.

---

## 4) Lista de Pedidos

Em `pedidos.index.tsx`, tabs no topo: **Kanban** | **Lista**.

Aba Lista:
- Tabela com todos os pedidos (inclui encerrados/faturados).
- Filtros: Cliente, Vendedor, Status (todos/abertos/encerrados/faturados), Produto contido, Período.
- Clique na linha → `/pedidos/$id` em modo edição.

---

## 5) Edição de pedido

`pedidos.$id.tsx` renderiza `<PedidoForm mode="edit" pedidoId={id} />`.
`pedido-form.tsx`: hidrata pedido existente (cliente, itens, pagamento, observações, descontos); submit chama `update` em vez de `insert` e faz diff de `pedido_itens`.

---

## 6) Menu “três pontinhos” no card/linha de pedido

Novo `PedidoActionsMenu`:
- Mover para o próximo processo (avança `status`)
- Mover para o processo anterior (recua `status`)
- Alterar pedido (navega para `/pedidos/$id`)
- Pagamentos (dialog com método atual e troca → update em `pedidos.pagamento`)
- Inconsistências (dialog listando itens com `produtos.estoque <= estoque_minimo` ou `< qtd do item`)
- Observações (dialog com textarea em `pedidos.observacoes`)

Ordem dos status next/prev em constante única reaproveitada pelo Kanban.

---

## 7) **NOVO** Relatórios — botão “Relatório” com abas

Em `relatorios.tsx`, ao lado do botão **Exportar**, adicionar botão **Relatório** que muda a página para o modo “Relatórios detalhados” com `Tabs` no topo (estilo da imagem de referência: lista vertical de categorias à esquerda em desktop, accordion no mobile):

Categorias e abas:
- **Cadastros**
  - Relação de Clientes e Fornecedores
- **Financeiro**
  - Fluxo de Caixa
  - Demonstrativo de Receitas e Despesas
  - Movimento de Caixa e Banco
  - Títulos a Pagar
  - Títulos a Receber
  - Lançamentos Excluídos
  - Histórico de Créditos
- **Vendas**
  - Vendas por período
  - Vendas por vendedor
  - Vendas por forma de pagamento
- **Estoque**
  - Posição de estoque
  - Movimentação de estoque
  - Produtos abaixo do mínimo

Cada aba renderiza uma tabela própria + botão Imprimir/Exportar específico. Os dados vêm das tabelas existentes (`clientes`, `contas`, `caixa_*`, `pedidos`, `produtos`, `estoque_movimentos`, `despesas`). Layout: sidebar interna `lg:w-64` + área de conteúdo; no mobile vira `Accordion`.

---

## 8) **NOVO** Caixa — correção completa

Bugs identificados em `caixa.tsx` + `useCaixa*`:

1. **Total não considera pagamentos**: `entradas` só soma `suprimento` e `venda`, mas o PDV não está inserindo `caixa_movimentos` com tipo `venda` ao finalizar a compra → caixa nunca registra vendas. Corrigir o PDV para inserir movimento `venda` na sessão aberta após cada pedido pago em dinheiro/PIX/débito/crédito (não para `fiado`/`promissoria`).
2. **`useCaixaAtual` ignora erro do select de movimentos** (apenas pega `data`, sem `error`). Corrigir.
3. **Botão Fechar** usa `Number(vf) || total` — quando o usuário digita `0` cai no `total` (operador `||`). Trocar por verificação explícita (`vf === "" ? total : Number(vf)`).
4. **Suprimento/Sangria com valor 0** dispara mutation e inclui linha vazia. Validar `valor > 0` antes de chamar mutate; desabilitar botão.
5. **Após fechar caixa**, a tela continua mostrando os KPIs/sessão até refresh manual — o `useCaixaAtual` invalida mas a query devolve `null`; garantir reset visual de `vi`/`vf`/`movValor` e mensagem de “caixa fechado com sucesso” + recarregar dia.
6. **Múltiplos caixas abertos**: hoje `useAbrirCaixa` não impede abrir duas sessões simultâneas. Antes de abrir, checar se já existe `status='aberto'`.
7. **Operador não pode reabrir o mesmo caixa fechado** — adicionar histórico do dia (lista das últimas sessões do operador) abaixo do bloco principal.
8. **Cálculo `total` quebra com `valor_final` digitado**: o saldo esperado já é `valor_inicial + entradas - saidas`. Mostrar diferença (`conferido - esperado`) com cor (verde/vermelho).
9. Garantir RLS funcionando: a query atual depende de `is_staff(auth.uid())`; se o usuário logado não for staff, a tela quebra sem mensagem. Adicionar tratamento e mensagem clara.
10. Responsividade: cards de KPI já são `grid sm:grid-cols-2 lg:grid-cols-4`, mas a tabela de movimentos quebra no mobile — converter para lista de cards no `< md`.

Resultado: caixa abre, registra suprimentos/sangrias/vendas corretamente, calcula esperado vs conferido, fecha sem residual e mostra histórico.

---

## 9) Responsividade mobile (todas as abas)

Padrão a aplicar em todas as telas (sem mudar lógica):
- Containers: `px-3 sm:px-4 md:px-6`, sem `min-w` fixos.
- Tabelas (`data-table`, listas de produtos/clientes/usuários/financeiro/caixa/nfe/relatorios): no `< md` substituir por **lista de cards empilhados** mantendo a tabela em `md+`.
- Formulários (clientes, produtos, pedidos, usuários novo): grid `grid-cols-1 md:grid-cols-2`, inputs `w-full`, footer sticky.
- Kanban: scroll horizontal com `snap-x snap-mandatory`, colunas `min-w-[85vw] sm:min-w-[320px]`.
- Diálogos: `max-w-[95vw] sm:max-w-lg`, `max-h-[90dvh] overflow-y-auto`.
- Header e ações: `flex-col sm:flex-row`, texto encurtado via `hidden sm:inline`.
- `usuarios.tsx`: formulário inline de criação vira `Sheet` no mobile.
- Relatórios (modo abas): sidebar interna vira `Accordion` no `< md`.

---

## Resumo de migrations necessárias

1. `clientes`: adicionar `nome_fantasia`, `ie`, `tipo_pessoa`, `vendedor_id`.
2. Enum `pagamento`: adicionar `pix`, `dinheiro`, `promissoria`, `cheque`, `debito`, `credito`.
3. Enum `pedido_status`: adicionar `faturamento`.
4. Tabelas `faturamentos` e `faturamento_pedidos` com RLS `is_staff`.
5. `app_settings.metodos_pagamento` ganha defaults para `promissoria` e `cheque` (compatível: jsonb, só inclui novos toggles na UI).

---

## Validação final

- Cadastro de cliente PF e PJ com IE “isento”, vendedor responsável e CEP auto-preenchido; imprimir cliente — PDF abre com todos os dados.
- Criar pedido com cada um dos 6 métodos de pagamento; verificar persistência e exibição.
- Faturar e encerrar em massa via Kanban; itens somem do Kanban e aparecem na aba Lista.
- Lista de pedidos com cada filtro isolado e combinado; abrir pedido em edição, alterar item, salvar.
- Menu de três pontinhos: mover next/prev, alterar pagamento, ver inconsistências de estoque, editar observações.
- Relatórios: clicar “Relatório”, alternar entre todas as abas, cada uma exibindo dados reais.
- Caixa: abrir, registrar venda via PDV, suprimento/sangria, fechar conferindo valor; reabrir mesma sessão deve ser impossível; histórico do dia visível; bugs listados resolvidos.
- Mobile 375px: cada aba revisada — sem scroll horizontal indesejado, formulários usáveis, diálogos cabendo.
