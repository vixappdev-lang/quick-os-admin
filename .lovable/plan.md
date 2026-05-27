
Plano dividido em 7 blocos independentes. Sem mudança de design — só novos campos/telas seguindo o visual existente. Tudo testado antes de finalizar.

---

## 1) Kanban de Pedidos — pagamentos e encerramento

**Pagamentos editáveis** (em `pedidos.$id.tsx`, na aba/seção "Pagamentos"):
- Lista atual de pagamentos passa a ter botão **Editar** e **Remover** por linha.
- Botão **Adicionar pagamento** abre o `PaymentSplitter` já existente, mas em modo "adicionar parcial" (permite uma forma só OU várias).
- Ao editar: muda valor e forma, recalcula `total_pago` e `restante` via trigger já existente (`recalc_pedido_pagamentos`).
- "Fiado" vira **"Nota promissória"** em toda a UI (`src/lib/pagamento.ts` já tem `nota_promissoria`; vou trocar todos os usos remanescentes de `fiado` por `nota_promissoria` na exibição, mantendo o valor `fiado` no banco como alias compatível — não quebra dados antigos).

**Encerrar pedido** (botão no detalhe do pedido):
- Adicionar status `encerrado` ao enum `pedido_status` (migration).
- Botão "Encerrar pedido" no topo do `pedidos.$id.tsx`, com confirmação.
- No Kanban (`pedidos.index.tsx` view Kanban): filtrar `status != 'encerrado'`.
- Na Lista: aparece com badge **"Encerrado"** (cinza), e novo filtro "Encerrados" no topo.

**Faturamento → Nota Fiscal profissional (PDF)**:
- Novo componente `nf-print.tsx` (modelo NFC-e visual, igual comércio: cabeçalho com razão social/CNPJ/endereço da empresa de `app_settings`, dados do consumidor, tabela de itens com qtd/un/preço/total, totais, forma de pagamento, número sequencial de `faturamentos.numero`, data, rodapé com "Documento auxiliar — não é documento fiscal oficial").
- Botão **"Gerar Nota Fiscal"** na aba Faturamento abre janela de impressão (segue padrão dos prints existentes: `romaneio-print`, `separacao-print`).
- Deixa hook preparado para futura integração NFC-e oficial (campo `nfe_chave` no faturamento, vazio por enquanto).

---

## 2) Novo Pedido → Novo Cliente: usar página atual

Em `pedido-form.tsx` o botão "Novo cliente" hoje abre um dialog antigo. Trocar para:
- Navegar para `/clientes/novo?return=/pedidos/novo&prefill=<nome>` (rota já existe).
- Em `clientes.novo.tsx`: ler `return` na query; após criar, navegar de volta com `?cliente=<id>`.
- Em `pedidos.novo.tsx`: ler `?cliente=<id>` no mount e pré-selecionar o cliente.

Sem dialog. Usa a tela de cadastro de cliente atual sem mudar design.

---

## 3) Produto Manual → UN/FD/CX + peso

Em `product-form-panel.tsx` (modo manual):
- Campo **Unidade base** (`unidade`): UN/KG/L (já existe).
- Nova seção **Embalagens** (preenche o campo `embalagens` jsonb que já existe):
  - Tabela com linhas: tipo (UN / FD / CX), qtd de UN por embalagem, preço de venda da embalagem (opcional, default = preço_unit × qtd).
  - Pelo menos UN com qtd=1 sempre presente.
- Novo campo **Peso (kg) por unidade** (`peso_kg`, numeric, default 0) — coluna nova via migration.
- Listagem de produtos continua exibindo estoque em **UN** (já é assim). Sem mudança visual.
- No PDV e no `pedido-form`, o seletor de embalagem usa as embalagens cadastradas; venda por FD/CX multiplica a baixa de estoque pela qtd_un_por_embalagem (lógica já parcialmente presente em `pedido_itens.qtd_un_por_embalagem`).

---

## 4) SQL completo para SQL Editor (idempotente, sem erros)

Vou gerar **um único arquivo `docs/setup.sql`** (também incluído no modal do bloco 6) com:

1. Extensions (`pgcrypto`).
2. Enums: `app_role`, `pedido_status` (+ `encerrado`), `pedido_origem`, `caixa_status`, `conta_status`, `nfe_status`, etc. (todos com `IF NOT EXISTS` via DO blocks).
3. Tabelas atuais idênticas ao banco (todas as 22): `profiles`, `user_roles`, `clientes`, `produtos` (com `peso_kg`), `categorias`, `pedidos`, `pedido_itens`, `pedido_pagamentos`, `app_settings`, `caixa_sessoes`, `caixa_movimentos`, `contas`, `despesas`, `estoque_movimentos`, `faturamentos`, `faturamento_pedidos`, `fidelidade_pontos`, `nfe_entradas`, `nfe_itens`, `gtin_global`, `product_images`, `api_keys`, **+ `tenants`** (bloco 6).
4. Sequences (`pedidos_numero_seq`, `faturamentos_numero_seq`).
5. Functions: `has_role`, `is_staff`, `handle_new_user`, `touch_updated_at`, `recalc_pedido_pagamentos`, `recalc_pedido_restante` (todas com `CREATE OR REPLACE`).
6. Triggers (drop+create).
7. GRANTs para `anon`, `authenticated`, `service_role` (conforme política atual).
8. RLS policies idênticas (drop+create).
9. Storage bucket `pdv-assets` (public) + `product-images`.
10. **Seed do admin**: insere em `auth.users` via função `auth.admin_create_user` substituta (uso de `crypt` do pgcrypto para hash bcrypt) — `admin@loja.com` / `admin12`, depois insere `profiles` e `user_roles` (role=admin). Idempotente (ON CONFLICT).
11. Seed dos demais usuários atuais (vou listar via `read_query` antes de gerar o SQL final, mantendo emails e role; senha padrão para os que não conhecemos: `mudar123`, instrução pro usuário trocar).
12. Seed das imagens em `product_images` e `produtos.imagem_url` (copio as URLs públicas atuais do bucket `pdv-assets` — listo via `read_query` antes).

O arquivo abre com cabeçalho explicando: "rode tudo de uma vez no SQL Editor; é idempotente, pode rodar várias vezes".

---

## 5) Nota Fiscal — modelo

Sem exemplo seu ainda, vou usar layout NFC-e padrão (consumidor final): cabeçalho da empresa, "DANFE NFC-e (modelo visual)", dados consumidor, itens, totais, forma pgto, QR Code placeholder, rodapé. Se você mandar o exemplo depois, refino — mas já fica profissional.

---

## 6) Nova aba "Supabase" — multi-tenant por slug

**Modelo escolhido:** subdomínio/rota por slug curto (`/t/{slug}` ou subdomínio). Cada tenant = um banco Supabase próprio.

**Schema novo (no banco principal):**
```
tenants(
  id uuid pk,
  slug text unique not null check (length(slug) between 4 and 8),
  nome text,
  supabase_url text not null,
  supabase_anon_key text not null,
  user_id uuid not null,        -- a qual usuário do painel pertence
  created_by uuid,
  created_at timestamptz
)
```
RLS: só admin escreve; usuário dono lê o próprio.

**Coluna nova em `profiles`:** `tenant_slug text` (opcional). Quando um user tem `tenant_slug` setado, o app sabe que ele tem banco próprio.

**Tela `/supabase` (sidebar, só pra quem tem permissão):**
- Lista tenants cadastrados (slug, nome, dono, criado em).
- Botão "Conectar novo banco":
  1. Seleciona um usuário existente (dropdown puxando `useUsuarios`).
  2. Define slug curto (auto-sugere 5 chars aleatórios `[a-z0-9]`).
  3. Cola **Supabase URL** + **anon key** do novo projeto.
  4. (Opcional) **service_role key** — só pra rodar seed automaticamente; se vazio, mostra SQL no modal pra rodar manual.
  5. Define **email + senha** que o usuário usará nesse banco novo (preenche com os do user atual).
- Ao salvar: insere em `tenants`, seta `profiles.tenant_slug` daquele user, abre **modal de sucesso** com:
  - "Banco conectado ✅"
  - Caixa de código com o SQL completo (bloco 4) + `INSERT` do usuário daquele banco com email/senha definidos.
  - Botão **Copiar**.
  - Instrução: "Cole no SQL Editor do novo Supabase e execute".

**Roteamento por slug:**
- Rota nova `_authenticated.tsx` (ou no `__root.tsx`): detecta `window.location.pathname` começando com `/t/{slug}` OU subdomínio `{slug}.<host>`.
- Se houver slug: cria um **cliente Supabase secundário** em runtime com URL/anon do tenant (busca via server fn `getTenantBySlug` no banco principal — só URL e anon, nunca service_role).
- Substitui o `supabase` exportado por um Proxy que delega ao client do tenant ativo (padrão singleton com `setActiveTenant(slug)`).
- Login: o user faz login normalmente em `/t/{slug}/login`. As credenciais batem no Supabase do tenant, não no principal.
- Sem slug na URL = banco principal (admin@loja.com etc.).

**Detalhes técnicos chave:**
- Server fn `getTenantBySlug` retorna só `{ url, anon_key, nome }` — service_role NUNCA vai pro client.
- O cliente principal continua existindo só pra resolver tenant; depois disso o app inteiro usa o cliente do tenant.
- Estudei o docs Supabase: multi-instância de `createClient` é suportado oficialmente; cada um tem seu próprio storage key (`storageKey: 'sb-{slug}'`) pra não colidir.

---

## 7) Usuários — ações e permissões

Em `usuarios.tsx`:
- Coluna nova **Ações** já tem "remover"; adicionar:
  - **Permissões** (botão): abre dialog com switches por menu (Pedidos, Produtos, Clientes, Estoque, Caixa, Financeiro, Relatórios, NF-e, Configurações, **Supabase**, Usuários).
- Tabela nova `user_permissions(user_id uuid, menu text, allowed bool, pk(user_id, menu))` — default: tudo true para admin, configurável para outros.
- Dialog "Novo usuário" (`NewUserDialog`): adicionar checkbox **"Acesso à aba Supabase"** (e no SQL gerado pra esse user, se desmarcado, NÃO inclui linha em `user_permissions` pra `supabase`, ou inclui com `allowed=false`).
- Sidebar (`app-sidebar.tsx`): carrega permissões do user atual via `useUserPermissions` e filtra itens. Sem permissão Supabase = item não aparece.

---

## Ordem de execução (build mode)

1. Migration: enum `encerrado`, coluna `peso_kg`, tabela `tenants`, tabela `user_permissions`, coluna `profiles.tenant_slug`. (Inclui GRANTs + RLS.)
2. Atualizar `pagamento.ts` (label) + `payment-splitter` (edit/add/remove parciais).
3. `pedidos.$id.tsx`: botão Encerrar + aba Faturamento + NF print.
4. `pedidos.index.tsx`: filtro Kanban (sem encerrados) + filtro Lista (com encerrados).
5. `pedido-form.tsx`: trocar dialog de novo cliente por navegação.
6. `clientes.novo.tsx`: suportar `return` + prefill.
7. `product-form-panel.tsx`: embalagens UN/FD/CX + peso_kg.
8. Aba Supabase: tela `/supabase`, server fn `getTenantBySlug`, cliente multi-tenant em runtime, modal com SQL.
9. Permissões: dialog, hook `useUserPermissions`, filtro do sidebar, checkbox no novo user.
10. Gerar `docs/setup.sql` final (com seeds dos usuários e imagens atuais).
11. QA: criar pedido, encerrar, gerar NF, criar produto FD, criar tenant, logar no slug, validar permissões.

---

## Pontos para você confirmar

- **Senha padrão** para os usuários existentes (fora `admin@loja.com`) no SQL seed: uso `mudar123` ou prefere outra?
- **Subdomínio vs `/t/{slug}`**: `/t/{slug}` funciona out-of-the-box no Lovable; subdomínio real (`abc12.seudominio.com`) exige DNS wildcard e domínio custom configurado. Posso implementar `/t/{slug}` agora e deixar suporte a subdomínio pronto (mesma lógica de detecção). OK?
- **NF**: posso seguir com layout NFC-e profissional padrão agora e ajustar quando você mandar o exemplo?

Se aprovar, parto direto pra execução na ordem acima.
