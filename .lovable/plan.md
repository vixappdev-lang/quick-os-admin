## Plano final — encerramento

### 1. NF-e: botão "Visualizar modelo real"
- Em `src/routes/_authenticated/nfe.tsx` adicionar botão **"Visualizar modelo DANFE"**.
- Criar `src/components/danfe-preview.tsx` — DANFE Modelo 55 fiel ao padrão SEFAZ (cabeçalho emitente, destinatário, dados NF, produtos, cálculo impostos, transportador, dados adicionais), renderizado em `<Dialog>` grande com botão imprimir. Usa dados de `app_settings` (emitente) + dados mock/preview de exemplo.

### 2. Tela Supabase — refatorar
- **Remover** botão "Schema SQL" do header (mantém o `SchemaDialog` aparecendo só após criar tenant novo).
- **Adicionar linha fixa "Banco principal (Lovable Cloud)"** no topo da tabela com badge "Atual", mostrando `VITE_SUPABASE_URL` e `VITE_SUPABASE_PROJECT_ID`. Ações: **Ver** (drawer com métricas), **Editar** (desabilitado/tooltip "gerenciado"), **Rastreio em tempo real** (drawer com últimos logs auth + DB usando `app_logs` realtime + IP atual).
- Para tenants: ações **Ver** (detalhes + URL/key mascarada), **Editar** (form), **Rastrear** (eventos realtime), **Remover**.
- Responsividade: tabela vira cards em `<md`.

### 3. Logs — captura real
- Migração: trigger/helper `log_event(categoria, mensagem, payload)` já existe via `app_logs`. Adicionar coluna `ip` (text) e `user_agent` (text) em `app_logs`.
- Em `src/lib/auth.tsx`: no `signIn` sucesso → inserir log `login` com email, IP (via `https://api.ipify.org?format=json`), user agent, timestamp. No `signOut` → log `logout`. Falha de login → log `erro`.
- Tela Logs em Configurações: já existe; adicionar coluna IP, filtros por usuário e busca textual.

### 4. Modal boas-vindas (1º acesso admin)
- Adicionar coluna `onboarding_completed_at` em `profiles` (migração).
- Componente `src/components/welcome-onboarding.tsx`: `<Dialog>` com `modal=true`, sem botão fechar, backdrop com `backdrop-blur`, slider de 4 steps (Boas-vindas → Como funciona → Recursos → Configure empresa). Botão "Próximo" → "Concluir" no último step grava `onboarding_completed_at=now()` e redireciona para `/configuracoes`.
- Disparado em `_authenticated.tsx` quando `profile.onboarding_completed_at IS NULL`.

### 5. API Keys — completar
- Painel `src/components/api-keys-panel.tsx` já existe; enriquecer com: descrição, escopos (leitura/escrita), data expiração opcional, contador de uso, botão "Testar chave" que faz `GET /api/public/v1` autenticado e mostra resposta.
- Migração: adicionar `scopes text[]`, `expires_at timestamptz`, `usage_count int default 0` em `api_keys`. Atualizar `_auth.ts` para incrementar `usage_count` e validar `expires_at`.

### 6. Responsividade mobile (sweep)
- `fornecedores.tsx`, `configuracoes.tsx`, `supabase.tsx`, `produtos.tsx`, `pedidos.index.tsx`, `relatorios.tsx`, `clientes.tsx`, `financeiro.tsx`, `nfe.tsx`:
  - Tabelas com `overflow-x-auto` + min-width já existe; adicionar render alternativo em cards para `md:hidden`.
  - PageHeader actions stack vertical em mobile.
  - Tabs com `overflow-x-auto whitespace-nowrap`.
  - Padding lateral reduzido em mobile (`p-3 md:p-6`).
  - Forms em `<Dialog>` com `max-h-[90vh] overflow-y-auto`.

### 7. Ordem de execução
1. Migrações (app_logs.ip/ua, api_keys campos, profiles.onboarding_completed_at)
2. `danfe-preview.tsx` + botão em nfe.tsx
3. Refatorar supabase.tsx (remover Schema btn, banco principal row, ações drawer)
4. Logs IP no auth.tsx + filtros na UI
5. Welcome onboarding modal
6. API keys panel enriquecido
7. Sweep responsividade

### Não mexer
- Design tokens, paleta, fontes
- `client.ts`, `types.ts`, `auth-middleware.ts`
- Triggers de estoque e numeração de pedidos
- Funcionalidades já entregues (NF-e config, fornecedores, kanban, faturamento)
