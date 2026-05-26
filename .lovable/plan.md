# Plano — Relatórios, Scanner e HID

## 1. Relatórios — redesenhar a tela principal

Hoje `/relatorios` mostra KPIs + gráficos (Bar/Pie) + Top produtos, e o catálogo fica em `/relatorios/catalogo`. Vou **inverter**: a tela principal vira o catálogo.

**Arquivo:** `src/routes/_authenticated/relatorios.tsx` — rewrite completo:
- Remover KPIs, charts (Recharts), Top produtos, botão "Abrir Catálogo".
- Renderizar o conteúdo que hoje está em `relatorios.catalogo.tsx`: sidebar de grupos (Cadastros / Financeiro / Vendas / Estoque) com busca + painel direito com tabela, botões **Imprimir** e **Exportar CSV**.
- Reaproveitar `useRelatorios`, `exportRelatorioCSV`, `printRelatorio` de `src/components/relatorio-catalog.tsx` (já prontos).
- Header: "Relatórios" / "Selecione um relatório para visualizar, imprimir ou exportar".

**Arquivo:** `src/routes/_authenticated/relatorios.catalogo.tsx` — virar redirect simples para `/relatorios` (manter compatibilidade com links antigos).

Resultado: clicar em **Relatórios** no menu já abre o catálogo numerado — sem gráficos, sem etapa extra.

## 2. Scanner do "Novo produto" — novo fluxo "não cadastrado"

O erro vem de `identifyAndCreateProduct`: ele tenta INSERT mesmo quando a IA falha, e como `codigo_barras` agora tem UNIQUE index, qualquer concorrência ou erro de validação estoura. Além disso o usuário **não quer** cadastro automático — quer um aviso e o formulário manual com o EAN preenchido.

**Mudanças:**

**`src/lib/produto-scan.functions.ts`** — simplificar drasticamente:
- Renomear lógica: a função vira `lookupProductByEan` (GET-style). Só faz **lookup**:
  1. `SELECT` em `produtos` por `codigo_barras` ou `sku`.
  2. Se não achou, `SELECT` em `gtin_global` (sugestão de nome/marca/unidade/categoria/imagem para pré-preencher).
  3. **Nunca** insere. Retorna `{ found: boolean, produto?: ..., sugestao?: {nome, marca, unidade, categoria_sugerida, imagem_url} }`.
- Sem chamada a IA no caminho de cadastro novo (elimina erros 500). A IA pode ser usada depois, de forma opcional, dentro do formulário manual (botão "preencher com IA").

**`src/components/novo-produto-chooser.tsx`** — novo estado `not_found`:
- Stages: `chooser → scanner → processing → (found | duplicate | not_found)`.
- `found`/`duplicate` → mesmo card de hoje (com "Adicionar estoque" / "Editar agora").
- `not_found` → card com ícone de alerta, texto **"Produto não cadastrado"**, mostrar EAN em mono, e dois botões:
  - **Cadastrar manualmente** (primário) → chama `onPickManual(ean, sugestao)` com o código já preenchido e (se houver) dados do `gtin_global` aplicados como defaults.
  - **Escanear outro** → volta ao stage `scanner`.
- Atualizar a interface `Props`: `onPickManual: (preFill?: { ean?: string; sugestao?: {...} }) => void`.

**Callers de `NovoProdutoChooser`** (provavelmente `produtos.tsx` e/ou `produtos.novo.tsx`):
- Aceitar o pré-fill e passar para `ProductFormPanel`/`produtos.novo` via state/search-param (`?ean=...`).
- Em `produtos.novo.tsx`, ler `ean` de search params e setar nos campos `codigo_barras` + `sku` ao montar.

Resultado: scaneia → se achar, abre o produto; se não, mostra **"Produto não cadastrado"** e abre o formulário manual já com o EAN. Depois de salvar, o produto está disponível no PDV (HID + busca).

## 3. HID Scanner — blindar e finalizar (100% funcional, sem erros)

Hoje `src/lib/hid-scanner.tsx` existe e está plugado no `__root.tsx` + `pdv.tsx`. Falta blindagem e integração nos outros pontos.

**`src/lib/hid-scanner.tsx`** — hardening:
- Ignorar quando algum `Dialog`/`Sheet` Radix com `data-state="open"` estiver visível com input focado (já cobrimos com `isEditable`, mas adicionar guard explícito para evitar conflito com o BarcodeScanner aberto).
- Garantir `passive: false` no listener para `preventDefault` no `Enter`.
- Adicionar `aria-hidden` capture-input helper component `<HidCaptureInput />` exportado, para telas que precisam capturar mesmo com inputs visíveis (PDV).
- Limpar buffer no `blur` da janela e ao trocar de rota (`useEffect` + `router.subscribe('onBeforeNavigate')` opcional — ou simples reset no `visibilitychange`).
- Telemetria leve via `console.debug` para diagnosticar em produção.

**Integração nas telas:**
- **PDV** (`src/routes/_authenticated/pdv.tsx`): já tem. Validar que o map de EAN é atualizado quando `produtos` muda (dependency array) e que itens com `codigo_barras` `null` não quebram.
- **Pedido novo** (`src/routes/_authenticated/pedidos.novo.tsx` / `pedido-builder.tsx`): plugar `useHidScanner` para adicionar item ao pedido em construção quando o usuário bipar.
- **Estoque entrada** (`src/routes/_authenticated/estoque.movimentacoes.tsx`): plugar para abrir/incrementar quantidade do produto bipado.
- **BarcodeScanner modal**: desativar HID enquanto o modal de câmera está aberto (evita captura dupla quando o leitor manda Enter).

**Migration (se necessário):** confirmar índice único em `codigo_barras` (já feito numa migration anterior). Nada novo.

## Arquivos afetados

```text
Edit  src/routes/_authenticated/relatorios.tsx           (rewrite — vira catálogo)
Edit  src/routes/_authenticated/relatorios.catalogo.tsx  (redirect → /relatorios)
Edit  src/lib/produto-scan.functions.ts                  (lookup-only, sem insert)
Edit  src/components/novo-produto-chooser.tsx            (stage not_found + onPickManual com preFill)
Edit  src/routes/_authenticated/produtos.tsx             (passar preFill)
Edit  src/routes/_authenticated/produtos.novo.tsx        (aceitar ?ean=)
Edit  src/lib/hid-scanner.tsx                            (hardening + capture input)
Edit  src/routes/_authenticated/pdv.tsx                  (revisão)
Edit  src/routes/_authenticated/pedidos.novo.tsx OU
      src/components/pedido-builder.tsx                  (integrar HID)
Edit  src/routes/_authenticated/estoque.movimentacoes.tsx (integrar HID)
```

## Critérios de aceite

1. Clicar em **Relatórios** no menu abre direto o catálogo numerado (Cadastros / Financeiro / Vendas / Estoque), com busca, imprimir, exportar CSV. Sem gráficos.
2. No chooser "Novo produto" → **Scanner** → bipar código novo → tela **"Produto não cadastrado — Cadastrar manualmente"**. Ao clicar, formulário abre com o EAN preenchido. Salvar funciona e o produto fica disponível no PDV.
3. Bipar código existente → tela **"Já cadastrado"** (igual hoje).
4. HID: em PDV, pedido novo e movimentação de estoque, bipar um EAN cadastrado adiciona/abre o produto instantaneamente sem foco em campo, sem caracteres digitados em inputs, sem captura dupla quando o modal de câmera estiver aberto.
5. Sem erros 500 do servidor no fluxo de scan (zero inserts especulativos).
