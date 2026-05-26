## Diagnóstico

### 1) Erro "Missing Supabase environment variable(s)"
A mensagem vem de `src/integrations/supabase/client.ts` (linhas 14-22). O cliente lê `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no build, com fallback a `process.env.*` no SSR. No print, o domínio é **`s.vercel.app`** — ou seja, o app foi publicado no **seu próprio Vercel**, e lá essas variáveis **não foram configuradas**. No build do Vercel, o Vite faz replace estático dessas `VITE_*` em string vazia, e ao tentar criar o client, ele lança. O scanner não está quebrado — o erro só aparece porque, ao identificar o produto, fazemos `qc.invalidateQueries(["produtos"])`, que dispara `useProdutos()` → `supabase.from(...)` → e aí cai o throw.

No preview Lovable (`*.lovable.app`) funciona porque as `VITE_*` são injetadas no build. No Vercel próprio, **precisam ser adicionadas manualmente** no painel.

### 2) Botão "Relatório" não navega
O Link em `relatorios.tsx:81` aponta para `/relatorios/catalogo` e a rota existe (`relatorios.catalogo.tsx`). Provavelmente o usuário testou no Vercel quebrado (item 1) — o erro fatal do client.ts impede a renderização. Mesmo assim, vou reforçar a navegação e tornar o botão visualmente mais "primary" pra deixar claro que é a ação principal.

### 3) Scanner mobile mal adaptado + sons
- O `DialogContent` força fullscreen mobile, mas o `<video>` em `object-cover` dentro de um container `flex-1 min-h-0` corta o vídeo na altura. Precisa `object-contain` no mobile + reforçar `min-h-0` na coluna pai.
- O guide-box `h-1/3 w-4/5` fica pequeno demais no celular vertical — ampliar para `h-1/4 w-[88%]` mantendo proporção 16:9 do código de barras.
- O input "Código de barras..." quebra layout (vê-se no print que "Fechar" foi para fora). Reorganizar em duas linhas no mobile.
- Sons: o `beep()` atual é um tom seco. Trocar por um **double-beep estilo supermercado** (1200Hz curto + 1600Hz mais curto) e adicionar um som distinto de **sucesso** (tríade ascendente) para quando o produto for cadastrado/identificado.
- Aplicar o beep também no PDV quando o scanner adiciona item ao carrinho (já existe lá, mas usaremos o mesmo helper centralizado).

---

## Plano de correção

### A. Documentar/avisar as env vars no Vercel (item 1)
Não há como o agente alterar o painel do Vercel do usuário. Solução em camadas:
1. **Mensagem clara no app**: trocar o `throw` por uma tela de erro amigável (`src/integrations/supabase/client.ts` é read-only — então criar um wrapper que captura o erro e mostra UI dedicada em `__root.tsx` com instruções de configuração).
2. **Avisar o usuário** no chat (resposta final) com o passo-a-passo Vercel → Settings → Environment Variables, listando as 4 chaves a adicionar (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, opcionalmente `SUPABASE_SERVICE_ROLE_KEY` para server fns), com os valores que já estão no `.env` do projeto Lovable.

> Observação: como o arquivo `client.ts` é gerenciado pelo Lovable, **não** vou alterá-lo. Criar `src/lib/supabase-env-check.ts` exportando `hasSupabaseEnv()` e usar em `__root.tsx` para renderizar um banner de erro com instruções, evitando que a app crashe inteira.

### B. Sons centralizados (item 3)
Criar `src/lib/sounds.ts` com:
- `beepScan()` — double-beep estilo PDV de mercado (1200Hz 80ms + 1600Hz 60ms).
- `beepSuccess()` — tríade ascendente C5→E5→G5 (cadastro/identificação OK).
- `beepError()` — duplo grave (já cadastrado / erro).
- Sintetizados via `AudioContext` (sem assets), reusa o contexto e respeita autoplay policy (cria sob gesto do usuário — scanner já abre por clique).

Refatorar:
- `barcode-scanner.tsx`: substituir `beep()` interno por `beepScan()`.
- `pdv.tsx`: o `handleBarcodeDetected` (já existente) chamará `beepScan()` ao achar produto e `beepError()` quando não encontrar.
- `novo-produto-chooser.tsx`: tocar `beepSuccess()` no estágio `success` e `beepError()` no `duplicate` (no `useEffect` de stage).

### C. Scanner mobile — ajustes finos
Em `barcode-scanner.tsx`:
- Container `<video>`: adicionar classe `max-sm:object-contain` para não cortar imagem em retrato.
- Guide-box: `h-[22%] w-[88%] max-w-md aspect-[16/9] sm:h-1/3 sm:w-4/5 sm:aspect-auto` — proporção correta para barras.
- Toolbar inferior: empilhar input + linha de botões em `flex-col gap-2 sm:flex-row` para não estourar a tela.
- Botão "Trocar câmera": mover para canto inferior-esquerdo no mobile (`max-sm:bottom-3 max-sm:top-auto max-sm:left-3 max-sm:right-auto`) — fica mais ergonômico que o canto superior.
- Adicionar `safe-area-inset-bottom` no padding inferior (`max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]`).
- Lanterna (torch): se a track suportar `applyConstraints({advanced:[{torch:true}]})`, mostrar botão "Lanterna" — best-effort, sem quebrar quando não suportado.

### D. Navegação "Relatório" (item 2)
Em `relatorios.tsx:81`:
- Trocar estilo para variante primary (já que é a ação principal): `bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]` com ícone destacado.
- Verificar que `routeTree.gen.ts` inclui a rota `/relatorios/catalogo` (gerado automaticamente — só preciso confirmar que o arquivo existe; já existe).
- Tornar o botão "Exportar" um print local secundário (variante outline) para hierarquia ficar correta.

### E. Pequenas validações
- Confirmar no `produto-scan.functions.ts` que o `requireSupabaseAuth` funciona e que o cliente envia o `Authorization` header (já configurado em `start.ts` via `attachSupabaseAuth`).
- Garantir que o `beepSuccess()` só toca uma vez no `success` (guard com `useRef`).

---

## Arquivos afetados

**Novos:**
- `src/lib/sounds.ts`
- `src/lib/supabase-env-check.ts`

**Editados:**
- `src/components/barcode-scanner.tsx` (mobile UX + sons)
- `src/components/novo-produto-chooser.tsx` (sons de sucesso/duplicado)
- `src/routes/_authenticated/pdv.tsx` (sons no scanner do PDV)
- `src/routes/_authenticated/relatorios.tsx` (destaque do botão "Relatório")
- `src/routes/__root.tsx` (banner de env-error)

**Não tocar:**
- `src/integrations/supabase/client.ts` (gerenciado)
- `src/routeTree.gen.ts` (auto-gerado)
- migrações (nada de DB)

---

## Aviso ao usuário (na resposta final, após implementar)

Vou explicar que o erro "Missing Supabase env vars" no `*.vercel.app` é por causa das variáveis não configuradas no painel da Vercel, e listar os 3 nomes a adicionar (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) com os valores que já estão no `.env`. Depois é só "Redeploy" na Vercel.
