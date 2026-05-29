# Correção precisa: tenant via backend (service_role) + isolamento de vendedores

## Problema raiz

Hoje o app faz CRUD direto do navegador no banco do tenant usando a `anon_key`. Como o usuário (ex: João) **não está autenticado no banco do tenant** (só no banco central), `auth.uid()` é `NULL` lá, e as policies do tipo `is_staff(auth.uid())` recusam a operação → erro **"new row violates row-level security policy"**.

Também: ao criar pedido, a lista "Vendedor responsável" mostra todos os vendedores do banco central (inclusive os do `admin@loja`), em vez de apenas os criados pela conta logada.

---

## Solução em duas frentes

### 1) Tenant acessado SEMPRE pelo backend, com `service_role`

**Arquitetura:**

```text
Browser (João)
  │  chama server function: tenantQuery({ table, op, payload })
  ▼
Backend (TanStack server fn)
  │  1. requireSupabaseAuth → valida João no banco central
  │  2. busca tenant do user no banco central (já existe getMyTenant)
  │  3. cria client com tenant.supabase_url + service_role (memoizado)
  │  4. executa operação (select/insert/update/delete/rpc)
  ▼
Banco do tenant (loja do João)
```

A `service_role_key` **nunca** sai do backend. O frontend só envia descrições da query.

**Mudanças concretas:**

1. **DB central — migration**:
   - Adicionar coluna `supabase_service_role_key text` na tabela `tenants`.
   - Adicionar coluna `created_by_admin uuid` em `profiles` (quem criou aquele usuário/vendedor).
   - Backfill: `created_by_admin = admin@loja.com user_id` para os existentes.

2. **`src/lib/tenants.functions.ts`**:
   - `createTenant` aceita `supabase_service_role_key` (obrigatório agora).
   - `updateTenant` para conseguir setar/atualizar a service_role em tenants existentes.
   - `getMyTenant` continua retornando só url/anon/slug ao browser (nunca service_role).

3. **Novo: `src/lib/tenant-db.server.ts`** (server-only, extensão `.server.ts`):
   - `getTenantAdminClient(userId)` — busca tenant do user no banco central e devolve um `SupabaseClient` com `service_role` (cache por slug com TTL curto).
   - Se o user não tem tenant conectado → retorna o `supabaseAdmin` central (compatibilidade com `admin@loja`).

4. **Novo: `src/lib/tenant-db.functions.ts`** — server function única:
   ```ts
   tenantQuery({
     table: string,
     op: "select" | "insert" | "update" | "delete" | "upsert",
     select?: string,
     match?: Record<string, any>,
     in?: { col: string, values: any[] },
     order?: { col: string, ascending: boolean },
     limit?: number,
     values?: any | any[],
     returning?: boolean,
   })
   ```
   Whitelist de tabelas permitidas (clientes, produtos, categorias, fornecedores, pedidos, pedido_itens, pedido_pagamentos, estoque_movimentos, caixa_sessoes, caixa_movimentos, contas, despesas, app_settings, patrimonio, product_images, notificacoes). Valida com Zod. Roda via `getTenantAdminClient(context.userId)`.

5. **`src/integrations/supabase/active-client.ts`** vira um proxy que, quando há tenant ativo, encaminha `.from(table).select/insert/...` para `tenantQuery` em vez de bater no banco do tenant com anon. Quando não há tenant, segue usando o client central normalmente.
   - Implementação: builder chainable que coleta a operação e chama `tenantQuery` no terminal (`.then`, `await`, `.maybeSingle()`, `.single()`).
   - Cobre a API usada hoje no app: `select`, `eq`, `in`, `order`, `limit`, `maybeSingle`, `single`, `insert`, `update`, `delete`, `upsert`.

6. **RLS do banco do tenant**: as policies criadas pelo `setup.sql` (com `is_staff(auth.uid())`) continuam protegendo contra acesso direto com anon. O `service_role` bypassa RLS — é o caminho correto e seguro porque a autorização agora é feita no backend do app (validação de João no banco central + escolha do tenant correto).

### 2) Vendedor responsável: filtrar por dono

1. **`src/lib/admin-users.functions.ts`**: `listVendedores()` retorna apenas perfis com `created_by_admin = context.userId` (ou todos, se o caller for `SUPER_ADMIN_EMAIL`).
2. **Criação de usuário no admin** (já existente): seta `created_by_admin = context.userId` no profile.
3. **Combobox no `pedido-form.tsx` / `pedido-builder.tsx`**: passa a usar essa lista filtrada.

---

## "Link mágico" pedido

Não existe link único no Supabase que faça isso automaticamente — multi-tenant com isolamento de service_role exige a arquitetura acima. Mas o resultado para o usuário é equivalente:

1. `admin@loja` conecta o Supabase do João (cola url + anon + **service_role**).
2. Copia o SQL gerado, roda uma vez no SQL Editor do João.
3. Pronto — João loga e tudo (produtos, clientes, pedidos, estoque, caixa…) já grava no banco dele, com segurança total.

---

## Arquivos a tocar

- **DB migration** (nova): coluna `service_role_key` em `tenants`, `created_by_admin` em `profiles`.
- `src/lib/tenants.functions.ts` — aceitar/atualizar service_role.
- `src/lib/tenant-db.server.ts` — **novo**, client admin do tenant.
- `src/lib/tenant-db.functions.ts` — **novo**, server fn `tenantQuery`.
- `src/integrations/supabase/active-client.ts` — proxy chainable para `tenantQuery`.
- `src/lib/admin-users.functions.ts` — filtrar vendedores por `created_by_admin`.
- `src/routes/_authenticated/supabase.tsx` — campo "Service role key" no form de conectar.
- `src/components/pedido-form.tsx` (e/ou `pedido-builder.tsx`) — usar lista filtrada.
- `scripts/build-setup-sql.mjs` / `public/setup.sql` — sem mudanças (RLS continua).

## Pontos de risco que vou cuidar

- **Compatibilidade do builder**: o `activeSupabase` é usado em ~40 lugares. O proxy precisa cobrir exatamente a API consumida (vou inventariar antes de escrever) para não quebrar telas.
- **Realtime**: o app usa realtime central para notificações; isso continua no banco central, sem mudança.
- **Tenants sem service_role** (já existentes): UI mostra aviso "atualize a chave de serviço" e bloqueia escrita até o admin colar.

Posso seguir com a implementação?
