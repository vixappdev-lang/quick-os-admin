## Plano de correções — Relatórios, Scanner e Vendedor

### 1. Relatórios — botão "Catálogo" e navegação

**Diagnóstico:** A rota `/_authenticated/relatorios/catalogo` está registrada corretamente no `routeTree.gen.ts` e o botão em `relatorios.tsx` já usa `useNavigate`. O motivo de "não ir" é que o botão está como `<button onClick={navigate(...)}>` dentro do header de ações, mas o `PageHeader` pode estar engolindo o clique em mobile/desktop (sobreposição do z-index do header sticky) **e** o link de "Voltar" da página catálogo aponta corretamente — o problema real é que o botão de "Catálogo" não está renderizando como link com prefetch, então a rota faz um cold-load e a página parece travar quando os hooks de queries (`useDespesas`, `useContas`, `useUsuarios`) ainda não retornaram.

**Correção em `src/routes/_authenticated/relatorios.tsx`:**
- Trocar o `<button onClick={navigate}>` por `<Link to="/relatorios/catalogo" preload="intent">` estilizado igual ao botão atual (mantém visual, ganha prefetch + navegação garantida).
- Garantir que o botão tem `type="button"` e está fora de qualquer `<form>`.

**Correção em `src/routes/_authenticated/relatorios.catalogo.tsx`:**
- Adicionar `errorComponent` e `pendingComponent` à `createFileRoute` (skeleton enquanto as 6 queries carregam) para não dar tela branca.
- Ajustar grid mobile: `grid-cols-1 lg:grid-cols-[340px_1fr]` já existe — adicionar `min-w-0` no painel direito para evitar overflow.

---

### 2. Scanner — solução robusta e independente

**Diagnóstico do erro do print anterior:** O servidor `identifyAndCreateProduct` lança `Error("LOVABLE_API_KEY ausente")` quando a env não está disponível no runtime do worker, e qualquer falha na chamada à AI quebra o fluxo. Em paralelo, o stream da câmera ainda continua ativo ao trocar de rota porque o `Dialog` é desmontado mas o `useEffect cleanup` depende do `open` virar `false` antes do unmount.

**Estratégia (sem mudar design):**

**`src/lib/produto-scan.functions.ts`** — tornar resiliente:
1. Se `LOVABLE_API_KEY` ausente OU AI falhar → **NÃO lançar erro**. Criar produto com `nome = "Produto " + ean`, `identified=false`, `imagem_url=null`. Usuário edita depois.
2. Try/catch global no `.handler` retornando `{ already, produto, identified, warning?: string }` em vez de propagar exceções.
3. Validar EAN: aceitar 8–14 dígitos numéricos puros (regex `^\d{8,14}$`) e rejeitar antes da query.

**`src/components/barcode-scanner.tsx`** — robustez do stream:
1. Adicionar `useEffect` de unmount puro (sem deps) que sempre chama `stopAll()` — garante limpeza mesmo se o Dialog for desmontado por troca de rota.
2. Listener `visibilitychange`: quando aba esconde, pausa o stream; ao voltar, reinicia.
3. Adicionar fallback de 3 camadas (já existe 2): **BarcodeDetector nativo → ZXing → entrada manual sempre visível**. Se ambos os engines falharem em 8s, exibir aviso "Use o campo manual abaixo" sem fechar o modal.
4. Após `handleCode`, além de `stopAll()`, setar `videoRef.current.srcObject = null` explicitamente e remover qualquer `<video>` órfão.

**`src/components/novo-produto-chooser.tsx`:**
1. No `catch` do `identify`, voltar para `chooser` (já faz) **e** chamar `stopAll` via prop callback exposta pelo Scanner — adicionar `ref` ou `onStopped` callback.
2. Adicionar `useEffect` que, ao `open` virar `false`, força `setStage("chooser")` para resetar tudo.

---

### 3. Vendedor — layout desktop + dark mode

**Diagnóstico (print):** A página `vendedor.index.tsx` foi pensada para mobile. No desktop (1252px) os KPIs ficam pequenos no canto, há muito espaço vazio à direita, o header não respeita o container central, e não há toggle de tema.

**Redesign em `src/routes/vendedor.index.tsx` (sem mudar funcionalidade):**

**Header:**
- Manter altura, mas adicionar **3 botões à direita** na ordem: `[Novo pedido] [ToggleTema] [Sair]`.
- ToggleTema: novo componente `<ThemeToggle />` (ícone Sun/Moon do lucide), tamanho `h-9 w-9`, igual aos outros botões-ícone.

**Layout desktop:**
- Aumentar KPI cards no `lg:` — `lg:p-5`, valor em `lg:text-2xl`, ícone maior.
- Grid de pedidos: `md:grid-cols-2 xl:grid-cols-3` (já existe) → adicionar `2xl:grid-cols-4` e altura mínima dos cards.
- Adicionar **painel lateral** opcional `lg:grid-cols-[1fr_320px]` com resumo do dia (próximos pedidos pendentes em destaque). Mantém mobile single-column.
- Sticky toolbar de busca/filtros no desktop com sombra sutil.

**Dark mode:**
- Criar `src/lib/theme.tsx`: contexto `ThemeProvider` que persiste em `localStorage` (`quickos-theme`: `light`|`dark`|`system`) e aplica classe `dark` em `<html>`.
- Adicionar `<ThemeProvider>` no `__root.tsx` envolvendo o `<Outlet />`.
- Componente `src/components/theme-toggle.tsx` — botão que cicla light → dark → system com ícone correspondente.
- Revisar `src/styles.css`: confirmar que todos os tokens (`--background`, `--card`, `--muted`, `--primary`, `--success`, `--warning`, `--destructive`, `--info`, `--chart-*`) têm valores `oklch` definidos dentro de `.dark { ... }`. Se faltar algum, completar.
- Substituir qualquer cor hardcoded (`text-white`, `bg-black`, `bg-amber-500`) por tokens semânticos no scanner e no chooser para não quebrar no dark.

**Arquivos novos:**
- `src/lib/theme.tsx`
- `src/components/theme-toggle.tsx`

**Arquivos editados:**
- `src/routes/__root.tsx` (envolver com ThemeProvider)
- `src/routes/vendedor.index.tsx` (header + grid + toggle)
- `src/routes/_authenticated/relatorios.tsx` (Link em vez de button)
- `src/routes/_authenticated/relatorios.catalogo.tsx` (errorComponent/pendingComponent)
- `src/components/barcode-scanner.tsx` (limpeza + visibilitychange + tokens)
- `src/components/novo-produto-chooser.tsx` (reset robusto)
- `src/lib/produto-scan.functions.ts` (resiliência + fallback sem AI)
- `src/styles.css` (completar tokens dark se faltar)

**Não tocar:**
- `client.ts`, `client.server.ts`, `auth-middleware.ts`, `routeTree.gen.ts`, `types.ts`, migrations.
- Funcionalidade do PDV, Pedidos, Produtos, Estoque (só dark-mode-safety pass se houver cor hardcoded).

---

### Validação pós-implementação
1. Build sem erros TS.
2. Navegar `/relatorios` → clicar Catálogo → carrega `/relatorios/catalogo` com lista de relatórios numerados.
3. Em `/produtos` → "Novo" → "Scanner" → simular EAN manual → produto criado mesmo sem AI key.
4. Em `/vendedor` desktop → ver layout amplo + botão tema funcionando (light/dark/system) sem cores quebradas no scanner/PDV.
