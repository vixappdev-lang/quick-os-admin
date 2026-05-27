## Escopo desta rodada

Tudo neste plano vai ser feito em sequência, sem mexer em design. O foco é fechar os pendentes do plano original + montar a integração **NF-e via nfe.io** com configuração, validação real, webhooks e logs filtráveis.

---

### 1. Configurações → nova aba **NF-e (nfe.io)**

Campos para o cliente preencher (padrão da API nfe.io — Produto / NFe Modelo 55):
- `NFEIO_API_KEY` (token secret)
- `NFEIO_COMPANY_ID` (id da empresa cadastrada na nfe.io)
- `NFEIO_ENVIRONMENT` (`Development` / `Production`)
- `NFEIO_WEBHOOK_URL` (preenchido automaticamente: `https://project--<id>.lovable.app/api/public/nfeio-webhook`)
- `NFEIO_WEBHOOK_SECRET` (gerado automaticamente para assinar/validar)
- Seleção dos eventos do webhook (checkboxes — print que você compartilha):
  - `issued`, `issueFailed`, `cancelled`, `cancelFailed`, `inutilized`, `inutilizeFailed`, `disabled`, `pdfGenerated`, `pdfGenerateFailed`, `xmlGenerated`, `xmlGenerateFailed`
- Botão **Salvar e validar**: chama `GET https://api.nfe.io/v1/companies/{companyId}` com o API key. Só salva se retornar 200. Erro → mostra mensagem real da API.

Server function `validateNfeio` e `saveNfeioConfig` em `src/lib/nfeio.functions.ts` usando `requireSupabaseAuth` + `is_staff`.

### 2. Webhook NF-e

Rota pública `src/routes/api/public/nfeio-webhook.ts`:
- Valida assinatura HMAC com `NFEIO_WEBHOOK_SECRET`.
- Grava cada evento em `nfe_webhook_events` (tipo, payload, pedido_id deduzido, recebido_em).
- Atualiza `pedidos.nfe_*` quando evento é `issued` / `cancelled` / `pdfGenerated`.

### 3. Faturar pedido como NF-e

No popup do pedido (`pedidos.$id.tsx`), duas ações na coluna **Faturamento**:
- **Faturar pedido** → muda status para `faturado` (entra em faturamento mensal).
- **Faturar pedido como NF-e** → monta payload Modelo 55 a partir do pedido + dados da empresa + cliente + itens (NCM/CFOP/CST default configurável depois) → `POST https://api.nfe.io/v1/companies/{companyId}/productinvoices` → salva número/chave retornados em `pedidos`.

### 4. Logs com filtros

Nova aba **Logs** em Configurações:
- Tabela `app_logs` (categoria: `login` / `produto` / `erro` / `webhook` / `pedido`, mensagem, payload jsonb, user_id, created_at).
- Helper `logEvent()` chamado em: login (auth.tsx), criação/edição/remoção de produto, falhas server-fn (try/catch), e webhook nfe.io.
- UI com filtro por categoria + busca. Quando filtro = **webhook**, abre canal Supabase Realtime na tabela `nfe_webhook_events` mostrando eventos chegando ao vivo.

### 5. Pendências do plano original — verificar e completar

- **CRM → Fornecedores**: aba já criada ✓ (verificar link na sidebar).
- **Produtos**:
  - Lista exibe estoque em UN (já feito, validar).
  - Botão **Nova Entrada** abrindo dialog: produto + qtd + checkbox "tem nota fiscal" + fornecedor obrigatório → grava em `estoque_movimentos` com motivo "Entrada manual".
  - Form de produto: campo `fornecedor_id` obrigatório (select buscável).
- **Financeiro**: remover "Fiado" das opções de pagamento; KPI faturamento (dia/mês/ano) só de pedidos com status `faturado`; já existe Patrimônio/Contas/Despesas — confirmar.
- **Pedidos novo**:
  - Popup ao adicionar produto (qtd, fator CX/UN/FD, preço) — corrigir no `pedido-builder.tsx`.
  - Bug da busca de cliente em `pedido-form.tsx` — corrigir reset de input.
- **Entradas NF-e**: ao confirmar item sem produto cadastrado, abrir `ProductFormPanel` pré-preenchido com descrição/EAN do XML.
- **Estoque**: trigger `apply_estoque_from_item` já existe — validar que dispara em `INSERT` em `pedido_itens` (ok no schema).
- **Kanban**: card só com nome fantasia / vendedor / cidade / preço / nº / status (já feito, revalidar).
- **Configurações Empresa**: IE + bloqueio quando incompleto (já feito).
- **Relatórios**: filtros globais (período / vendedor / fornecedor) + novos relatórios: Vendas por vendedor, Vendas por fornecedor, Vendas por período, Estoque detalhado, Estoque por fornecedor, Estoque fiscal, Lucro por categoria, Lucro por produto, Vendas encerradas, Despesas, Patrimônio.

### 6. Permissões

Confirmar gate atual: só `admin@loja` (email exato) pode abrir Supabase/Usuários/Configurações > NF-e e marcar permissões; outros admins criados precisam de toggle explícito em `user_permissions`.

---

### Detalhes técnicos

**Migrations novas**
```sql
-- app_settings: adicionar colunas nfe.io
alter table app_settings add column if not exists nfeio_api_key text;
alter table app_settings add column if not exists nfeio_company_id text;
alter table app_settings add column if not exists nfeio_environment text default 'Development';
alter table app_settings add column if not exists nfeio_webhook_secret text;
alter table app_settings add column if not exists nfeio_webhook_events jsonb default '{}'::jsonb;

-- nova tabela: eventos do webhook
create table nfe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  payload jsonb not null,
  pedido_id uuid,
  recebido_em timestamptz not null default now()
);
grant select on nfe_webhook_events to authenticated;
grant all on nfe_webhook_events to service_role;
alter table nfe_webhook_events enable row level security;
create policy nfew_select_staff on nfe_webhook_events for select to authenticated
  using (is_staff(auth.uid()));
alter publication supabase_realtime add table nfe_webhook_events;

-- nova tabela: logs do app
create table app_logs (
  id uuid primary key default gen_random_uuid(),
  categoria text not null, -- login | produto | erro | webhook | pedido
  mensagem text not null,
  payload jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert on app_logs to authenticated;
grant all on app_logs to service_role;
alter table app_logs enable row level security;
create policy logs_select_staff on app_logs for select to authenticated using (is_staff(auth.uid()));
create policy logs_insert_auth on app_logs for insert to authenticated with check (true);
```

**API nfe.io (referência)**
- Base: `https://api.nfe.io`
- Header: `Authorization: <API_KEY>`
- Validate company: `GET /v1/companies/{companyId}`
- Emit Modelo 55: `POST /v1/companies/{companyId}/productinvoices`
- Webhook: configurado no painel nfe.io apontando para a URL pública; corpo JSON com `event`, `data` (id, status, number, accessKey, pdfUrl, xmlUrl).

**Validação real ao salvar**
- Não usa fetch direto no client (CORS) — server function `validateNfeio` faz `fetch` server-side e retorna `{ ok, company?, error? }`.

---

### Ordem de execução nesta rodada

1. Migrations (app_settings + nfe_webhook_events + app_logs).
2. `src/lib/nfeio.functions.ts` (validate, saveConfig, emitNfe).
3. Rota webhook `src/routes/api/public/nfeio-webhook.ts`.
4. Configurações → aba **NF-e** com formulário + validar + eventos.
5. Configurações → aba **Logs** com filtros + Realtime no canal webhook.
6. Pedido popup: aba "Faturar como NF-e".
7. Produtos: Nova Entrada + fornecedor_id obrigatório.
8. Financeiro: remover Fiado da lista.
9. Pedido novo: popup quantidade/fator/preço + fix busca cliente.
10. Entradas NF-e: cadastro inline de produto.
11. Relatórios: filtros globais + novos relatórios.
12. Verificação final + permissões.