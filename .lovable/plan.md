
# Quick OS — Plano de Implementação

Sistema operacional enterprise premium em modo claro, desktop-first, com navegação real, autenticação simulada e todos os módulos como **telas próprias** (não modais).

## Stack e arquitetura

- TanStack Start (já configurado) + Tailwind v4 + shadcn/ui + Recharts + Lucide
- File-based routing em `src/routes/` — cada módulo é uma rota dedicada
- Auth simulada com `localStorage` + contexto + `_authenticated` layout (`beforeLoad` redireciona para `/login`)
- Design tokens em `src/styles.css` (oklch) — paleta clara premium, azul profissional como primária, glass sutil via tokens reutilizáveis
- Dados mockados (fixtures TS) — sem backend nesta fase

## Design system

- Modo claro premium: superfícies `#FAFBFC`, cards brancos, borda `oklch(0.93 0.01 250)`, primária azul `oklch(0.55 0.18 255)`
- Tipografia: Inter (UI) + tabular-nums para números operacionais
- Tokens: `--surface`, `--surface-elevated`, `--glass-bg`, `--glass-border`, `--shadow-sm/md/lg` refinadas, `--radius: 0.625rem`
- Componentes shadcn customizados: Button (primário azul, ghost, outline refinado), Card (com variante `glass`), Table densa, Input compacto, Badge de status, KPI Card

## Estrutura de rotas

```
src/routes/
  __root.tsx                       (shell + providers)
  login.tsx                        (split-screen)
  _authenticated.tsx               (sidebar + header + Outlet, guard)
  _authenticated/
    index.tsx                      (Dashboard)
    pdv.tsx
    pedidos.tsx                    (listagem)
    pedidos.$id.tsx                (detalhes)
    pedidos.novo.tsx
    comandas.tsx
    delivery.tsx
    produtos.tsx
    produtos.$id.tsx               (cadastro/edição em tela)
    produtos.novo.tsx
    categorias.tsx
    estoque.tsx
    estoque.movimentacoes.tsx
    nfe.tsx                        (entradas NF-e)
    movimentacoes.tsx
    caixa.tsx
    financeiro.tsx                 (fluxo)
    despesas.tsx
    contas.tsx
    relatorios.tsx
    clientes.tsx
    clientes.$id.tsx
    fidelidade.tsx
    fiado.tsx
    usuarios.tsx
    permissoes.tsx
    logs.tsx
    configuracoes.tsx              (tabs internas)
    integracoes.tsx
    backup.tsx
```

## Shell (sidebar + header)

- **Sidebar** escura (`oklch(0.20 0.02 260)`), 240px expandida / 64px colapsada, grupos com labels: Operacional, Produtos, Financeiro, CRM, Administração, Sistema. Estados ativos com barra azul à esquerda + bg sutil. Ícones Lucide. Animação de collapse suave.
- **Header sticky** com glass leve (`backdrop-blur`, bg `white/70`, borda inferior 1px): breadcrumbs (do router), busca global (Cmd+K), status do caixa (badge verde/cinza), notificações (dropdown glass), troca tema, avatar perfil (dropdown).

## Módulos — escopo de implementação

**Dashboard**: 6 KPI cards (vendas hoje, pedidos, ticket médio, lucro, produtos vendidos, caixa) com mini-sparkline + delta %; 4 gráficos Recharts (vendas semana area, pagamentos pie, horários pico bar, fluxo line); listas operacionais (estoque baixo, pedidos recentes, alertas, NF-e recentes).

**PDV**: layout 2 colunas (60/40). Esquerda: busca + scanner mock + chips de categorias + grid de produtos com imagem/preço. Direita: carrinho com qty editável, subtotal/desconto/total, seletor de cliente, abas de pagamento (PIX/Cartão/Dinheiro/Fiado) com troco automático, botão finalizar. Atalhos teclado (F2 busca, F8 finalizar).

**Pedidos**: tabela densa com filtros (status, período, operador, pagamento), badges de status coloridos, paginação. Tela de detalhe com timeline vertical, dados do cliente, itens, totais, ações.

**Produtos**: tabela com imagem thumb, SKU, categoria, estoque (badge), preço, status. Filtros + busca + exportar. Tela de cadastro com seções (Identificação, Preços/Margem auto-calculada, Estoque, Imagens, Fornecedor).

**Estoque**: KPIs (itens, valor, baixo, ruptura) + tabela movimentações com tipo (entrada/saída/ajuste/perda) + filtros.

**NF-e**: dropzone XML, lista de NF-es importadas, tela de conferência (produtos do XML × cadastro, divergências destacadas), confirmação.

**Financeiro**: Caixa (estado aberto/fechado, sangria/suprimento, histórico de sessões), Fluxo (gráfico + tabela entradas/saídas), Despesas (CRUD em tela), Contas (a pagar/receber com status).

**Clientes**: tabela + tela de detalhe com abas (Dados, Histórico de compras, Fiado, Fidelidade, Observações, botão WhatsApp).

**Relatórios**: barra de filtros sticky + KPIs do período + 4 gráficos + 4 tabelas com export.

**Usuários/Permissões/Logs**: tabela usuários com role, matriz de permissões por módulo, log de auditoria com filtros.

**Configurações**: tabs (Empresa, PDV, Impressão, Integrações, Backup, Tema).

**Comandas / Delivery / Fidelidade / Fiado / Integrações / Backup**: telas funcionais com listagem + ações principais (não placeholder).

## Auth

- `/login` split-screen: esquerda gradiente sofisticado + branding Quick OS + mockup ilustrativo; direita card com email/senha/lembrar/entrar/esqueceu.
- Validação: `admin@loja.com` / `admin12` → grava sessão em `localStorage`, redireciona para `/`.
- `_authenticated` guard via `beforeLoad` lendo contexto auth.
- Enter submete, loading state no botão, toast de erro elegante.

## Detalhes técnicos

- Mock data em `src/data/` (produtos, pedidos, clientes, movimentações) para popular tabelas e gráficos de forma realista
- Helpers: `formatBRL`, `formatDate`, `formatPercent` em `src/lib/format.ts`
- Componentes compartilhados em `src/components/`: `KpiCard`, `PageHeader`, `DataTable`, `StatusBadge`, `EmptyState`, `SectionCard`, `GlassCard`
- Atalhos globais com `useHotkeys` simples (sem dep extra — handler em window)

## Entrega faseada (numa única implementação)

1. Tokens + tema + shell (sidebar + header + auth + guard)
2. Dashboard completo + componentes compartilhados
3. PDV + Pedidos (listagem/detalhe/novo)
4. Produtos + Categorias + Estoque + NF-e + Movimentações
5. Financeiro (Caixa, Fluxo, Despesas, Contas) + Relatórios
6. CRM (Clientes, Fidelidade, Fiado) + Administração (Usuários, Permissões, Logs) + Sistema (Configurações, Integrações, Backup) + Comandas + Delivery

## Fora de escopo desta fase

- Backend real / Lovable Cloud (tudo mockado in-memory)
- Integração real de NF-e, pagamentos, WhatsApp
- Mobile dedicado (responsivo básico, foco desktop/notebook/tablet)
- Modo escuro completo (toggle existe, mas otimização é para o claro)

Confirmando, parto direto para a build na ordem acima.
