## Plano de correções e arquitetura HID do Scanner

### 1. Botão "Catálogo de Relatórios" — não navega

**Diagnóstico real:** O `<Link to="/relatorios/catalogo" preload="intent">` já existe em `relatorios.tsx` (linhas 76-82) e a rota está registrada em `routeTree.gen.ts`. O motivo do botão "não fazer nada" não é navegação — é que a rota destino quebra silenciosamente: `relatorios.catalogo.tsx` chama `useDespesas`, `useContas`, `useUsuarios`. Se qualquer um falhar (RLS, query), o `errorComponent` aparece numa flash e o usuário interpreta como "não foi". Além disso o `<Link>` está dentro do bloco `actions` do `PageHeader` que tem `flex-wrap` — em telas estreitas vira a segunda linha e fica invisível abaixo do fold.

**Correções em `src/routes/_authenticated/relatorios.tsx`:**
- Trocar o `<Link>` por um botão visualmente igual mas que use `useNavigate` no `onClick` + `onMouseEnter` faz `router.preloadRoute`. Mantém o estilo, garante click handler explícito e log de erro no console se a navegação falhar.
- Renderizar o botão **antes** dos botões "30 dias / Exportar" para nunca cair na segunda linha do flex-wrap.
- Aumentar prioridade visual: `bg-primary`, ícone `FileBarChart2`, label "Abrir Catálogo".

**Correções em `src/routes/_authenticated/relatorios.catalogo.tsx`:**
- Já tem `pendingComponent` e `errorComponent`. Adicionar `console.error(error)` no errorComponent para diagnóstico.
- Defender contra falhas individuais: usar `data: ... = []` em todas as queries (já feito) e envolver `useRelatorios(...)` num try/catch para não quebrar a página inteira se uma agregação falhar.

### 2. Vendedor — ícone do tema mostrando "PC"

**Diagnóstico:** O `ThemeToggle` cicla `light → dark → system` e o ícone reflete `theme` (não `resolved`). No primeiro carregamento o tema padrão é `"system"`, então aparece `Monitor` (ícone de monitor/PC). O usuário reclama disso.

**Correção em `src/components/theme-toggle.tsx`:**
- Remover o modo `system` do ciclo: cycle simples `light ↔ dark`.
- Ícone passa a refletir `resolved`: mostra `Sun` no light, `Moon` no dark.
- Inicialização em `theme.tsx`: se não houver valor salvo, **resolver** `system` na hora e gravar `light` ou `dark` no estado público — internamente continua respeitando o prefers-color-scheme apenas até a primeira interação. Assim o usuário nunca vê o ícone de monitor.

### 3. Tela "Novo pedido" — 100% responsiva mobile

**Diagnóstico:** `pedido-form.tsx` usa grid `lg:grid-cols-12` com muitos campos desabilitados (Orçamento, Pedido, Nota, Empresa) que poluem o mobile; a tabela de itens tem `min-w-[860px]` forçando scroll horizontal feio; o card lateral de Pagamento/Resumo só vira sidebar em `xl:`; barra sticky de ações usa flex-row.

**Correções em `src/components/pedido-form.tsx` (sem mudar lógica):**
- **Esconder campos meta-administrativos no mobile**: Orçamento, Pedido (auto), Nota, Empresa, Entrada/Saída, Origem ficam dentro de `<details>` colapsado ("Mais detalhes") até `md:`. No `md:+` voltam ao grid de 12 colunas.
- **Barra de ações sticky**: no mobile usar grid `grid-cols-2` (Cancelar | Salvar) fixo no rodapé com `safe-area-inset-bottom`. O `Salvar` mostra "Salvar · R$ X".
- **Cliente**: campo single column no mobile, botão "Novo cliente" full-width abaixo do search.
- **Lista de itens**: no mobile renderizar `cards` em vez da `<table>`. Cada card: imagem 48px, nome, SKU/estoque, controles qtd ± centrais, preço unit e desconto editáveis em duas colunas, total e botão remover. No `md:+` mantém a tabela atual.
- **Pagamento + Resumo**: no mobile vira `Accordion` na ordem [Itens] → [Pagamento] → [Resumo] dentro do fluxo; no `xl:+` continua sticky aside.
- **Header (`vendedor.novo.tsx`)**: adicionar `truncate` no nome do vendedor para não estourar.
- **Dialog "Novo cliente"**: usar variante full-screen no mobile (`max-sm:!h-[100dvh] max-sm:!rounded-none`).

### 4. Revisar métodos de pagamento em pedidos antigos

**Diagnóstico:** Enum no banco já contém `pix, credito, debito, dinheiro, fiado, outro, nota_promissoria, cheque`. As listas em PDV (`pdv.tsx`) e PedidoForm (`pedido-form.tsx`) já contemplam todos. O que está faltando é exibição consistente:

**Correções:**
- Criar `src/lib/pagamento.ts` com `PAGAMENTO_META: Record<PaymentMethod, { label, icon, color }>` exportável — centraliza labels (PIX, Crédito, Débito, Dinheiro, Fiado, Nota promissória, Cheque, Outro), ícones lucide e cor.
- `src/routes/_authenticated/pedidos.$id.tsx`, `pedidos.index.tsx` e `relatorio-catalog.tsx` passam a importar de `PAGAMENTO_META` em vez de map local — garante que pedidos antigos com `nota_promissoria`/`cheque` apareçam corretamente (hoje provavelmente caem em fallback "—").
- `relatorios.tsx` (gráfico Pizza) idem: usa `PAGAMENTO_META.label` para `nome`.

### 5. Scanner HID — análise arquitetural completa

**Modelo HID = teclado.** Não exige `getUserMedia`, MediaStream, BarcodeDetector, ZXing nem permissão de câmera. O scanner físico digita no input focado e dispara Enter. A arquitetura atual (`barcode-scanner.tsx`) é **câmera-only** — totalmente inadequada para uso profissional contínuo em mercado/PDV.

**Diagnóstico do que existe hoje:**
- Modal de câmera para cada leitura → fluxo lento, mata performance, requer permissão, falha em desktop sem câmera, exige toque para abrir.
- Sem captura global de Enter/Tab/CRLF.
- Sem identificação de fonte (digitação humana vs scanner HID — diferenciada pela velocidade entre keystrokes, tipicamente <30ms).
- Sem cache; cada leitura faz query no Supabase.
- `produtos.codigo_barras` já é `text` (✅), mas não há índice único nem normalização (zeros à esquerda).
- Sem multi-tenant — `produtos` é compartilhado por toda a instância.
- Falta tabela global de GTIN (banco compartilhado entre tenants).
- Sem integração com API externa de GTIN (cosmos/openfoodfacts/bluesoft).

**Arquitetura proposta (a implementar nas próximas iterações):**

**A. Captura HID global (`src/lib/hid-scanner.tsx`)**
- Hook `useHidScanner({ onCode, minLength=6, maxGapMs=35, terminators=["Enter","Tab"] })`.
- Listener `keydown` na `window`. Acumula caracteres em buffer; se gap > 35ms entre teclas, descarta (é digitação humana). Quando recebe terminator (Enter/Tab) e buffer ≥ 6 dígitos → dispara `onCode(buffer)` e limpa.
- Ignora quando o foco está em `<input type="text|number">` que NÃO seja o input invisível de captura.
- Provider `<HidScannerProvider>` em `__root.tsx` para captura global; consumido pelas telas que querem reagir (PDV, Estoque, Conferência, Inventário, Produtos/Novo).

**B. Input invisível de foco permanente (`src/components/hid-capture-input.tsx`)**
- Input `aria-hidden`, `tabIndex={-1}`, `opacity-0`, posicionado off-screen, **mas focável**.
- `useEffect` re-foca a cada `blur` (com debounce 100ms para não brigar com outros inputs).
- Cada tela que usa scanner monta este componente; quando o usuário clica num input visível (ex.: buscar produto), a captura passa a aquele input enquanto ele tiver foco.

**C. Normalização e validação de EAN (`src/lib/ean.ts`)**
- `normalizeEan(raw): string` — trim, remove não-dígitos, preserva zeros à esquerda, valida 8/12/13/14.
- `validateChecksum(ean): boolean` — cálculo do dígito verificador EAN-13/8/UPC-A.
- `codigo_barras` permanece `text` (já é). Adicionar índice `CREATE UNIQUE INDEX ux_produtos_codigo_barras ON produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;` — impede duplicação.

**D. Cache local + global + externo (fluxo cascata)**
1. **Cache em memória (React Query)** — `useProdutos()` já carrega tudo; `findByEan(code)` faz lookup O(1) num `Map` mantido em `useMemo`.
2. **Banco do tenant** (`produtos`) — fallback se não encontrou no cache (raro, só após sync).
3. **Banco global compartilhado** — nova tabela `public.gtin_global` (read-only para `authenticated`, write para `service_role`): `gtin TEXT PRIMARY KEY, nome TEXT, marca, categoria_sugerida, unidade, imagem_url, fonte TEXT, created_at`. Quando um tenant cadastra um produto novo via scanner, o backend grava também aqui (best-effort, idempotente).
4. **API externa GTIN** — server function `lookupGtinExternal(ean)` que tenta na ordem: Bluesoft Cosmos (se `BLUESOFT_TOKEN` setado), Open Food Facts (público, sem chave), fallback null. Resultado é persistido em `gtin_global` para nunca consultar de novo.
5. **AI fallback** (`identifyAndCreateProduct` atual) só roda se externo falhar.

**E. Multi-tenant (preparação)**
- Adicionar `tenant_id UUID` em `produtos`, `pedidos`, `clientes`, `app_settings` (default tenant atual).
- `gtin_global` é **cross-tenant** (sem `tenant_id`). RLS: SELECT para `authenticated`, INSERT via security definer function `register_gtin_global(...)`.
- Tabela `tenants` + `tenant_members(user_id, tenant_id, role)`. Por enquanto criar um tenant default `'main'` e migrar registros existentes.

**F. UX PDV rápido**
- Scanner HID lê → busca cache → adiciona ao carrinho (incrementa se já existe) → beep + flash visual de 200ms no card "Venda em andamento". Sem modal, sem reload, sem confirmação.
- Se não encontrar localmente: beep de erro + banner amarelo "Código X — produto não cadastrado [Cadastrar agora]" que abre `novo-produto` pré-preenchido.
- Em "Cadastrar produto", a câmera permanece como alternativa para celular, mas o input HID é o caminho principal — modal de câmera vira um botão secundário "Usar câmera".

**G. Estoque / Inventário / Conferência**
- Mesma `HidCaptureInput` em telas de Movimentação de Estoque, NF-e (conferência item-a-item), e nova tela `/estoque/inventario` (contagem rolante: scan + qtd → registra ajuste).

**H. Riscos e mitigações**
- **Leitura duplicada** (HID dispara código 2x em <100ms): debounce de 1.2s por código (já existe no scanner câmera; mover para o hook HID).
- **Foco perdido**: re-foco automático + indicador visual "🟢 Scanner ativo" no canto.
- **Conflito com inputs**: hook só age quando `event.target === document.body` OU o `HidCaptureInput` está focado.
- **Teclados internacionais**: scanners HID normalmente enviam dígitos puros + Enter; usar `event.key` (não `event.code`) e aceitar 0-9.
- **Performance**: lookup O(1) via Map; não fazer round-trip ao Supabase para cada leitura.
- **Zeros à esquerda**: sempre tratar como string, nunca cast para INT.

**Arquivos a criar (fase de implementação):**
- `src/lib/hid-scanner.tsx` (provider + hook)
- `src/components/hid-capture-input.tsx`
- `src/lib/ean.ts`
- `src/lib/pagamento.ts`
- `src/lib/gtin-lookup.functions.ts` (server fn cascata externa)

**Arquivos a editar:**
- `src/routes/__root.tsx` — montar `<HidScannerProvider>`
- `src/routes/_authenticated/pdv.tsx` — usar HID + cache local
- `src/routes/_authenticated/produtos.novo.tsx` — fluxo "scan → identifica → cadastra"
- `src/routes/_authenticated/estoque.tsx` + `estoque.movimentacoes.tsx` — entrada por scan
- `src/components/barcode-scanner.tsx` — vira fallback opcional (câmera)
- `src/components/pedido-form.tsx` — redesenho mobile (item 3)
- `src/components/theme-toggle.tsx` + `src/lib/theme.tsx` — corrigir ícone (item 2)
- `src/routes/_authenticated/relatorios.tsx` + `relatorios.catalogo.tsx` — botão Catálogo (item 1)
- `src/routes/_authenticated/pedidos.$id.tsx`, `pedidos.index.tsx`, `relatorio-catalog.tsx` — usar `PAGAMENTO_META` (item 4)

**Migrações SQL (uma migração):**
```sql
-- Índice único para evitar duplicação por código de barras
CREATE UNIQUE INDEX IF NOT EXISTS ux_produtos_codigo_barras
  ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;

-- Banco global de GTIN (cross-tenant)
CREATE TABLE public.gtin_global (
  gtin TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  marca TEXT, categoria_sugerida TEXT, unidade TEXT,
  imagem_url TEXT, fonte TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gtin_global TO authenticated;
GRANT ALL ON public.gtin_global TO service_role;
ALTER TABLE public.gtin_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY gtin_read_auth ON public.gtin_global FOR SELECT TO authenticated USING (true);
```

**Não tocar:** `client.ts`, `client.server.ts`, `auth-middleware.ts`, `routeTree.gen.ts`, `types.ts`.

### Validação pós-implementação
1. Build TS limpo.
2. `/relatorios` → botão "Abrir Catálogo" navega para `/relatorios/catalogo` em <300ms (preload no hover).
3. `/vendedor` → toggle mostra Sun/Moon (nunca Monitor); alterna light↔dark e persiste.
4. `/vendedor/novo` em 375×812 (iPhone SE): sem scroll horizontal; barra de ações sticky no rodapé; itens em cards; pagamento em accordion.
5. Detalhe de pedido com `pagamento=nota_promissoria` ou `cheque` exibe label e ícone corretos.
6. Scanner HID: teste com `Stream Deck`/teclado simulando 7894900011517 + Enter em 50ms — produto entra no carrinho sem modal; segunda leitura igual em 200ms é ignorada (debounce); leitura em 2s incrementa qtd.
