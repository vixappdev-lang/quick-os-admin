## Escopo

Três correções precisas, sem mexer em nada além do solicitado.

---

### 1) Tela `/relatorios` — limpeza + navegação garantida

`src/routes/_authenticated/relatorios.tsx`
- Remover por completo o bloco `<Tabs>` com `TabsList` (Vendas / Cadastros / Financeiro / Estoque) e seus 4 `TabsContent`. Manter apenas o conteúdo do tab "Vendas" (KPIs, gráfico de Vendas por dia, Métodos de pagamento, Top produtos) renderizado direto na página.
- Remover imports não usados: `Tabs/TabsList/TabsTrigger/TabsContent`, `useClientes`, `useDespesas`, `useContas`, `useUsuarios`, `UsersIcon`, `Wallet`, `Boxes`.
- Trocar o `<Link to="/relatorios/catalogo">` por `useNavigate` + `<button onClick={() => navigate({ to: "/relatorios/catalogo" })}>` para evitar qualquer interceptação de clique. Estilo idêntico ao atual (primary, ícone `FileBarChart2`, label "Catálogo de Relatórios").

A rota `/_authenticated/relatorios/catalogo` já existe (confirmado em `routeTree.gen.ts`); a navegação por `useNavigate` resolve o caso do botão sem reação.

---

### 2) Scanner — fechar de verdade ao detectar e parar a câmera

Sintoma: ao escanear em "Novo Produto", o modal do scanner fica residual sobre a tela (parece que "navegou" para o PDV mas o scanner continua aberto) e o erro reaparece.

#### `src/components/barcode-scanner.tsx`
- Garantir parada total do stream quando `open` vira `false`: já existe cleanup no `useEffect`, mas adicionar uma trava — quando o componente recebe `open=false`, executar o teardown imediatamente via efeito separado (`useEffect(() => { if (!open) stopAll(); }, [open])`) e zerar `videoRef.current.srcObject`.
- Extrair a lógica de parada num helper `stopAll()` reutilizado pelo cleanup do mount e pelo efeito de `open=false`.
- No `handleCode`, após `onDetected(code)`, chamar `stopAll()` para encerrar a câmera imediatamente (o pai decide se reabre). Isso evita o "fantasma" do vídeo continuando ativo.

#### `src/components/novo-produto-chooser.tsx`
- No `handleDetected`, antes de `setStage("processing")`, já vai esconder o `BarcodeScanner` (porque `open={open && stage === "scanner"}` deixa de ser verdadeiro). Bom — manter.
- Em caso de erro no `identify(...)` no `catch`: trocar o `setStage("scanner")` por `setStage("chooser")` e mostrar o toast. Isso evita re-abrir a câmera com o erro pendurado em loop.
- Em todos os botões que voltam a abrir o scanner (success/duplicate "Novo"), trocar a sequência `reset(); setStage("scanner");` por apenas `setStage("scanner"); setResult(null); setIdentified(false); setLastEan("");` (evitar voltar pro chooser por um frame).
- Adicionar `DialogDescription` no `success` para silenciar o warning "Missing Description" do Radix.

#### Erro de ambiente reaparecendo
Esse erro vem de `client.ts` quando `VITE_SUPABASE_*` está ausente — só ocorre em ambientes onde as envs não foram configuradas (produção Vercel). Em preview Lovable não dispara. **Não tocar em `client.ts`** (é arquivo gerado). A tela `EnvMissingScreen` já existente em `__root.tsx` cobre o caso quando faltar a env. O fechamento correto do scanner já resolve o "ficar travado".

---

### 3) Pedidos — backend real para "Relação de Entregas" e "Separação por Produto"

`src/routes/_authenticated/pedidos.index.tsx` (apenas o `KanbanColumn` e helpers)

Hoje os dois itens do popover apenas chamam `toast.info("Em breve")`. Substituir pela implementação real:

#### a) Relação de Entregas
- Novo componente `EntregasDialog` (no mesmo arquivo, ao final): recebe `pedidos: any[]` e `open/onOpenChange`.
- Conteúdo: tabela imprimível com colunas **Nº pedido · Cliente · Endereço · Telefone · Origem · Total · Status**.
- Endereço resolvido a partir de `pedido.cliente?.endereco` (jsonb) — formatar com `[logradouro, numero, bairro, cidade, uf, cep]` filtrando vazios. Telefone de `pedido.cliente?.telefone`.
- Botão "Imprimir" que aciona um helper `printEntregas(pedidos)` (novo arquivo `src/components/entregas-print.tsx`) — usa o mesmo padrão do `romaneio-print.tsx` (window.open + HTML simples + window.print).
- Botão "Exportar CSV" inline (gera blob + download), reutilizando a util já existente; se não houver, escrever inline curto.

#### b) Separação por Produto
- Novo componente `SeparacaoDialog`: agrega os itens de todos os `pedidos` da coluna por `produto_id`.
- Conteúdo: tabela com **SKU · Produto · Qtd total · Unid · Pedidos (lista de números)**.
- Ordenação por nome do produto.
- Botão "Imprimir" via `printSeparacao(pedidos)` (novo arquivo `src/components/separacao-print.tsx`), mesmo padrão do romaneio.

#### Wiring no `KanbanColumn`
- Adicionar `useState` para `entregasOpen` e `separacaoOpen`.
- Trocar os dois `ColAction` `onClick={() => toast.info(...)}` por `onClick={() => setEntregasOpen(true)}` e `onClick={() => setSeparacaoOpen(true)}`.
- Renderizar os dois Dialogs ao final do `KanbanColumn`, passando `pedidos` da coluna.

Não mexer em nada além disso (sem migration, sem schema, sem nova tabela — os dados já existem em `pedidos`/`pedido_itens`/`clientes`).

---

### Arquivos

**Editar**
- `src/routes/_authenticated/relatorios.tsx` (remoção das tabs + navegação por button)
- `src/components/barcode-scanner.tsx` (stopAll + efeito de open=false + DialogDescription)
- `src/components/novo-produto-chooser.tsx` (catch volta p/ chooser + DialogDescription)
- `src/routes/_authenticated/pedidos.index.tsx` (wiring dos dois dialogs)

**Criar**
- `src/components/entregas-print.tsx`
- `src/components/separacao-print.tsx`

**Não tocar**: `client.ts`, `client.server.ts`, `routeTree.gen.ts`, `types.ts`, migrations, qualquer outro arquivo.

---

### Verificações pós-edit
1. Botão "Catálogo de Relatórios" navega para `/relatorios/catalogo`.
2. Tela `/relatorios` sem as 4 abas; gráficos de Vendas continuam.
3. Scanner em "Novo Produto": ao detectar, modal do scanner some imediatamente (câmera para), processing aparece; em erro volta para chooser, sem janela fantasma.
4. Popover de uma coluna do Kanban: "Relação de Entregas" abre dialog com tabela real + impressão; "Separação por Produto" abre dialog com agregação real + impressão.
