## Escopo desta entrega

Vou trabalhar em 6 frentes, com cuidado para não bagunçar o design atual nem o que já funciona. Detalho abaixo o que muda em cada uma.

---

### 1. Configurações → Integrações (reorganização)

**Hoje:** a aba "Integrações" mostra um card largo de NF-e com os formulários já abertos inline.

**Novo layout:**
- Grid uniforme de cards (3 colunas no desktop, 1 no mobile), cada card com mesmo tamanho — `aspect-square`/altura fixa, ícone grande no topo, título, descrição curta, status (Conectado/Não conectado).
- Card **NF-e** (único hoje, com placeholders preparados para futuros — WhatsApp, E-mail, Pagamentos).
- Clique no card NF-e → abre **modal A: Escolher provedor** (nfe.io / Brasil NFe), reaproveitando o chooser já existente.
- Após escolha → abre **modal B: Configurar provedor** com os campos certos (mantém toda a lógica de validação já implementada de nfe.io e Brasil NFe).
- Mantém os dados salvos. Apenas refatora a apresentação.

---

### 2. Usuários → permissões por papel

- Ao escolher **vendedor** no formulário de novo usuário, esconder o painel de permissões de menus admin (Supabase, Usuários, Configurações, Financeiro etc).
- Vendedor recebe automaticamente um conjunto fixo: PDV, Pedidos (próprios), Clientes — sem opção de marcar mais.
- Permissões granulares de menu continuam aparecendo apenas para papel **operador** e **gerente**.
- Reforço no `useMyPermissions`: rota `/supabase` é **bloqueada em código** para qualquer papel ≠ admin/super-admin, independente do que esteja na tabela `user_permissions`.

---

### 3. Tela Supabase + segurança da conexão tenant

- **Bug do SQL travado/cortado:** o modal "Schema do banco" está com a área de prévia atrás do bloco de instruções. Vou:
  - Trocar o layout para `flex-col` com a prévia em `ScrollArea` com altura própria.
  - Adicionar botão "Copiar SQL completo" funcional com feedback (toast) e botão "Baixar setup.sql".
  - Mostrar contador de linhas e busca por texto dentro do SQL.
- **Banco do novo usuário começa vazio:** vou ajustar o `setup.sql` para conter apenas DDL (tipos, tabelas, RLS, funções, triggers, seeds mínimos como categorias padrão) — **sem** os dados de produtos/clientes/pedidos do banco atual.
- **Lista de tenants** redesenhada seguindo o padrão do painel (cards/tabela com mesma estética das outras telas, sem exageros).
- **Segurança da conexão tenant:**
  - Validação no momento de conectar: ping em `/auth/v1/health` e checagem de RLS habilitado nas tabelas críticas antes de salvar.
  - Armazenar `anon_key` cifrada com `pgcrypto` (server-side) e nunca expô-la em listagens — mostra só os 6 primeiros + 4 últimos.
  - Audit log automático em toda troca de tenant ativo (já existe `app_logs`, vou padronizar a categoria `tenant`).

---

### 4. Sistema de notificações

- Tabela `notificacoes` (id, user_id nullable=broadcast, tipo, severidade, titulo, mensagem, payload, lida_em, created_at) com RLS.
- Triggers no Postgres para gerar notificações automáticas:
  - **estoque_baixo**: quando `produtos.estoque <= estoque_minimo` após UPDATE.
  - **estoque_zerado**: quando `estoque <= 0`.
  - **pedido_novo**: INSERT em `pedidos`.
  - **pedido_cancelado**: status → cancelado.
  - **conta_vencendo**: cron diário (3 dias antes do vencimento).
  - **caixa_aberto_24h**: sessão aberta há > 24h.
  - **falha_nfe**: webhook nfe.io/Brasil NFe com erro.
  - **login_suspeito**: 3+ falhas seguidas para o mesmo e-mail.
- `notifications-bell` (componente já existe) passa a consumir essa tabela em realtime (`postgres_changes`) e mostra badge com contador, severidade colorida e marcar como lida.

---

### 5. Configurações → Backup

Nova aba **Backup** com:
- **Exportar agora**: gera um único arquivo `.json.gz` contendo dump de todas as tabelas do tenant ativo (produtos, clientes, pedidos, itens, pagamentos, contas, caixa, fornecedores, categorias, configurações, api_keys sem hash, perfis sem auth). Server function em streaming.
- **Importar backup**: upload do `.json.gz`, valida assinatura/versão, mostra preview (quantas linhas por tabela) e confirma. Usa transação por tabela respeitando ordem de FKs.
- **Backups automáticos**: agendamento opcional (diário/semanal) gravando em `pdv-assets/backups/{tenant}/` com retenção configurável.
- **Histórico**: tabela `backups_log` com data, tamanho, autor, status, link de download (signed URL 7 dias).

---

### 6. Segurança avançada do painel

Conjunto de proteções aplicadas no shell autenticado:
- **Anti-DevTools** (frontend): detector via `debugger`-loop + dimensão da janela; em produção, ao detectar, desloga e registra `app_logs` categoria `seguranca`.
- **Anti-cópia/print de telas sensíveis** (Supabase, Configurações > API keys): bloqueia `oncontextmenu`, `copy`, `cut` e impressão (CSS `@media print { body { display:none } }`).
- **CSP estrita** + `X-Frame-Options: DENY` + `Referrer-Policy: no-referrer` via headers do server route raiz (anti-clickjacking).
- **Rate limit** nas server functions sensíveis (`createUser`, `validate*`, `createTenant`) — bucket em memória por IP+userId, 10 req/min.
- **Bloqueio de iframe**: refuse renderizar se `window.top !== window.self`.
- **Reautenticação** obrigatória ao abrir Configurações, Supabase e Backup (modal pede senha — válida por 10 min).
- **Bloqueio de menu /supabase** para qualquer papel ≠ admin/super-admin (rota faz `redirect` no `beforeLoad`).
- **Audit completo**: toda ação privilegiada (criar usuário, conectar tenant, gerar backup, gerar API key, alterar role) entra em `audit_logs` com IP+UA.
- **HIBP** habilitado no Supabase Auth (senha vazada).

---

## Detalhes técnicos

- Migrations:
  1. `notificacoes` + triggers + cron (`pg_cron` se disponível, senão server fn agendada via `/api/public/cron/notify`).
  2. `backups_log` + bucket `backups` (privado).
  3. `pgcrypto` para cifrar `tenants.supabase_anon_key`.
- Server functions novas: `exportBackup`, `importBackup`, `requireReauth`, `rateLimit` helper.
- Não toco em: schema de produtos/pedidos/clientes/categorias, lógica do PDV, design tokens em `styles.css`, layout das demais telas.
- Refatorações apenas onde citado; sem mover arquivos sem necessidade.

---

## Ordem de execução

1. Migrations (notificações, backups_log, pgcrypto, ajustes profile/tenants).
2. Reorganização da aba Integrações.
3. Fix do modal SQL + redesign da lista Supabase + setup.sql limpo.
4. Permissões por papel + bloqueio /supabase para não-admin.
5. Sistema de notificações + bell em realtime.
6. Aba Backup (export/import/histórico).
7. Camada de segurança (anti-devtools, CSP, rate limit, reauth, audit).

Confirma que posso seguir com tudo isso? É bastante coisa — se quiser priorizar (por exemplo, fechar 1+2+3+4 hoje e deixar 5+6+7 para a próxima), me diz que eu corto exatamente nesse ponto.