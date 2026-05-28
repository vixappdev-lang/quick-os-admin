## Plano sênior — Pedidos, Estoque, Faturamento, Produtos, Relatórios, Fornecedores, Financeiro, Caixa

Escopo: ajustes precisos sem mexer no design global. Tudo respeita o tenant ativo (activeSupabase) e a base central onde já está. Cada bloco abaixo é independente e pode ser entregue em ondas — proponho 5 ondas.

---

### Onda 1 — Banco de dados (1 migração única, sem quebrar nada)

Alterações em `produtos`:
- `unidade_embalagem text not null default 'UN'` (UN/CX/FD/PCT/Outro)
- `fator_unidade numeric not null default 1` (qtas UN cabem em 1 embalagem)
- `tem_nota_fiscal boolean default false` já existe — manter
- `estoque_fiscal numeric not null default 0` (qtde com NF vinculada)

Alterações em `pedido_itens`:
- já tem `embalagem_tipo` e `qtd_un_por_embalagem` — vamos passar a usar de verdade no UI.

Alterações em `pedidos`:
- `tipo_operacao text not null default 'saida'` ('saida' | 'entrada')
- `fornecedor_id uuid` (somente quando tipo=entrada)
- `faturado boolean not null default false`
- `faturado_em` já existe

Triggers (substituem `apply_estoque_from_item`):
- `apply_estoque_from_item`: ler `tipo_operacao` do pedido pai.
  - saida: estoque -= qtd*fator (como hoje)
  - entrada: estoque += qtd*fator, e se `produto.tem_nota_fiscal` ou item marcado, `estoque_fiscal += qtd*fator`
  - DELETE: estorna espelhado.
- `handle_pedido_cancelamento`: idem, considerando tipo_operacao.
- Novo: ao `UPDATE pedidos SET faturado=true` → seta `status='faturado'` (enum já tem? se não, usar text auxiliar) e bloqueia voltar (trigger `BEFORE UPDATE` impede `faturado=true → false` exceto por admin).

Remoções no schema de `fornecedores` (campos pedidos pelo usuário):
- DROP COLUMN `prazo_pagamento, banco, agencia, conta, pix` (corrige o erro "agencia column not found in cache" — porque a coluna existe no banco mas o `types.ts` do central não foi regerado para o tenant; melhor remover de vez já que o usuário pediu).

GRANTs revistos para todas as tabelas novas/alteradas (mantendo o padrão existente).

---

### Onda 2 — Produtos > Novo/Editar (`product-form-panel.tsx`)

- Adicionar bloco "Unidade":
  - Select `Unidade`: UN / CX / FD / PCT / Outro (campo livre se Outro).
  - Input `Fator` (numérico) — qtas UN equivalem a 1 unidade da embalagem. UN trava em 1.
- Adicionar toggle "Possui Nota Fiscal?" (já existe campo no banco — só faltava o UI).
- Remover seção de imagem (gallery + upload). Manter `imagem_url` no banco por compatibilidade mas escondido no form.
- Validação: fator ≥ 1, inteiro quando unidade ≠ UN.

Listagem de produtos / Estoque:
- Exibir colunas: `Estoque (UN total = estoque*fator)`, `Estoque Fiscal`, badge `c/ NF`.
- Em "Estoque", nova coluna **Estoque Fiscal**.

---

### Onda 3 — Pedidos > Novo Pedido (`pedido-form.tsx`)

Tipo Entrada/Saída funcional:
- Substituir o select `Entrada/Saída` (hoje só visual) por estado real `tipoOperacao`.
- Quando `entrada`:
  - Esconder bloco "Cliente"; mostrar bloco "Fornecedor" com mesma busca/dropdown.
  - Pagamento opcional (entrada não exige forma de pagamento; renomeia para "Condição").
  - Ao salvar, gravar `tipo_operacao='entrada'` e `fornecedor_id`.
- Quando `saida` (padrão): comportamento atual.

Itens do pedido — embalagem:
- Em cada linha mostrar: `Qtd | Unidade(select UN/CX/FD/Outro) | Fator (auto do produto, editável)`.
- `qtd_un_por_embalagem` enviado ao backend = fator escolhido na linha. Total da linha = `qtd * preco`.
- Tooltip mostrando "= X UN".

Fix dropdown escondido (cliente e produto):
- O `<div className="absolute z-30 ...">` está dentro de um pai com `overflow-hidden`/`max-h` em alguns containers e em SectionCard com clipping em mobile. Solução: portalizar dropdowns com Radix `Popover` (já instalado) ou usar `position: fixed` calculado, e elevar `z-index` para `z-50`. Aplicar também ao select de fornecedor.

Faturamento:
- Botão "Faturar pedido" na tela `/pedidos/$id`. Ao clicar → atualiza `faturado=true, faturado_em=now(), status='faturado'`. Botão "Emitir NF-e" só habilita quando `faturado=true`.
- Status "Faturado" passa a ser terminal: trigger impede reverter; coluna Kanban não muda automaticamente.

---

### Onda 4 — Relatórios, Fornecedores, Financeiro, Caixa

**Relatórios** (`relatorios.tsx`):
- Corrigir filtros globais (período, vendedor, categoria) — eles existem mas não estão sendo passados nas queries; centralizar em um `useRelatorioFilters()` e injetar em todas as consultas.
- Novo: **Margem por Produto** — Produto, Custo, Venda, Margem (R$), Margem (%). Ordenar por % desc.
- Novo: **Faturamento** — filtro por período. KPIs: total vendas, total pedidos, bruto, líquido (bruto − descontos − despesas do período).
- Remover coluna "Saldo Fiado" do relatório "Relação de Clientes".

**Fornecedores** (`fornecedores.tsx`):
- Remover do form: prazo_pagamento, banco, agencia, conta, pix.
- Após DROP COLUMN na migração, o erro "agencia not found in schema cache" some sozinho.

**Financeiro** (`financeiro.tsx`):
- Nova KPI "Faturamento atual" (somatório de pedidos com `faturado=true` no período).
- Filtro de período aplica a essa KPI e ao chart (filtro 7/15/30/60/90 já existe — estender para todos os cards).

**Caixa** (`caixa.tsx` + histórico de sessões):
- Ao abrir uma sessão: drawer/modal listando pedidos da sessão (join `pedidos` por `created_at between abertura..fechamento` + operador). Mostrar itens, forma de pagamento, valor.
- Ações: "Remover venda da sessão" (cancela pedido + estorno automático via trigger existente), "Editar itens" (abre `pedido-form` em modo edição).
- Ao fechar caixa: além de salvar `caixa_sessoes.valor_final`, gravar registro em `faturamentos` (já existe tabela) consolidando o total da sessão. Isso aparece automaticamente no card "Faturamento atual" do Financeiro.

---

### Onda 5 — Verificação e polimento

- Atualizar `src/integrations/supabase/types.ts` é automático após a migração.
- Smoke-test fluxos:
  1. Criar produto CX fator 12 → estoque mostra 5 CX (= 60 UN).
  2. Pedido saída com 2 CX → estoque cai 24 UN.
  3. Pedido entrada com fornecedor → estoque sobe; sem cliente.
  4. Faturar pedido → status trava em Faturado, botão NF-e libera.
  5. Cancelar pedido → estoque retorna.
  6. Fechar caixa → aparece em Financeiro.
  7. Buscar cliente/fornecedor → dropdown visível.
- Garantir que nada do design (cores, espaçamento, sombras, tokens em `styles.css`) é alterado — apenas adições semânticas.

---

### Riscos & mitigação

- **Tenants externos**: migrações rodam só no banco central. Para tenants conectados (Supabase do cliente) entregamos o SQL em `public/setup.sql` atualizado para o usuário rodar no SQL Editor do tenant — mesmo padrão já estabelecido.
- **Trigger de faturamento terminal**: implementar exceção para `admin` para correções manuais.
- **Compatibilidade retroativa**: produtos existentes recebem `fator_unidade=1, unidade_embalagem='UN'` (default) — nenhum cálculo muda para itens legados.

---

## Sobre a tela /supabase e o deploy na Vercel (resposta, sem implementar)

Hoje cada tenant guarda `supabase_url` e `supabase_anon_key` na tabela `tenants` do banco central, e o `active-client.ts` cria o client em runtime no browser. Isso significa que **você NÃO precisa criar Environment Variables novas na Vercel toda vez que cadastrar um cliente** — as URLs/anon keys ficam no banco e são lidas dinamicamente pelo painel. A Vercel só precisa das vars do banco *central* (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

Como ficaria a operação ideal, com melhor suporte:

1. **Domínio único, multi-tenant por login**: o usuário faz login no domínio único → o painel lê `tenants` pelo `user_id` → instancia o client do Supabase daquele cliente → todas as queries vão pro banco dele. É o que já está implementado; só precisamos garantir que a tela /supabase mostre status (online/offline, latência, schema sincronizado) e um botão "Testar conexão" + "Reaplicar setup.sql".

2. **Setup do tenant em 3 cliques**: na tela /supabase, ao cadastrar um novo cliente, gerar um botão "Copiar SQL de setup" que copia o `public/setup.sql` atualizado pro clipboard e abre a URL `https://supabase.com/dashboard/project/<ref>/sql/new` em nova aba. Usuário cola e roda — tenant fica 100% pronto.

3. **Secrets do tenant (service role)**: se algum dia você quiser fazer operações privilegiadas no banco do cliente (ex.: backups server-side), aí sim precisaria de uma forma de guardar o `service_role` por tenant. Recomendação: nova coluna `supabase_service_key text` em `tenants` com RLS estrita (só super-admin lê) + um server function `withTenantAdmin(tenantId)` que monta o client server-side. Continua sem precisar mexer na Vercel.

4. **Quando faz sentido usar Environment da Vercel**: só se você quisesse um deploy *separado por cliente* (ex.: `cliente1.seudominio.com` apontando pro Supabase do cliente1 em build-time). Não recomendo — perde a vantagem do multi-tenant e dá trabalho operacional enorme. O modelo atual (1 deploy, N tenants no DB) é o padrão SaaS profissional (Linear, Notion, Vercel mesma fazem assim).

5. **Suporte/observabilidade**: adicionar na /supabase um log por tenant (latência média, último erro de query, último backup) usando `app_logs` + filtro por `tenant_slug`. Assim você suporta clientes sem precisar acessar o Supabase deles.

Resumo: **mantém um único projeto na Vercel**, as credenciais por cliente vivem na tabela `tenants`, e na /supabase só precisamos melhorar UX de cadastro e diagnóstico — nenhuma mudança de infraestrutura.