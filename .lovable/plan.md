## Problema
1. O `public/setup.sql` (origem do "SQL de correção") é um dump do `pg_dump` que **não é idempotente** — só funciona em banco vazio. Rodar em projeto que já tem o schema dá `ERROR: 42710: type "app_role" already exists`, e o mesmo vale para tabelas, índices, policies, sequences, triggers.
2. O modal "SQL de correção" hoje só mostra o SQL inteiro (2776 linhas) sem dizer **o que realmente falta** naquela conexão — fica visualmente bagunçado e não ajuda a resolver.

## O que vou fazer (sem mexer no design geral)

### 1. Gerar um SQL idempotente de verdade
Criar um script Node em `scripts/build-setup-sql.mjs` que lê o dump bruto e produz `public/setup.sql` (e copia para `docs/setup.sql`) com:
- `CREATE TYPE` → envolto em `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` (corrige 42710).
- `CREATE TABLE x (...)` → `CREATE TABLE IF NOT EXISTS x (...)` + bloco que adiciona colunas faltantes via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- `CREATE SEQUENCE` → `CREATE SEQUENCE IF NOT EXISTS`.
- `CREATE INDEX` → `CREATE INDEX IF NOT EXISTS` (e `CREATE UNIQUE INDEX IF NOT EXISTS`).
- `CREATE TRIGGER` → precedido de `DROP TRIGGER IF EXISTS ... ON ...;`.
- `CREATE POLICY` → precedido de `DROP POLICY IF EXISTS ... ON ...;`.
- `CREATE FUNCTION` → já usa `CREATE OR REPLACE`, mantém.
- `ALTER TABLE ... ADD CONSTRAINT` (PK/UK/FK) → envolto em `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object/duplicate_table THEN NULL; END $$;`.
- `GRANT` é naturalmente idempotente — mantém.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` é idempotente — mantém.

O resultado pode ser executado **N vezes** em qualquer banco (vazio ou já com schema parcial) sem erro, e completa o que estiver faltando.

### 2. Limpar o modal "SQL de correção"
Em `src/routes/_authenticated/supabase.tsx`:
- Remover a "PRÉVIA (2776 linhas)" enorme. Substituir por um bloco compacto e rolável menor (max-height ~240px) com fonte mono e fade na borda.
- Cabeçalho do modal mostra **somente**:
  - Nome/slug da conexão.
  - Se houver erros capturados (via `getSchemaIssuesBySlug`), uma lista curta: "Tabelas/colunas que falharam: produtos, pedido_itens.desconto…".
  - Se não houver erros: texto neutro "SQL completo idempotente — pode ser executado quantas vezes for necessário".
- Três ações no topo: **Copiar SQL**, **Baixar setup.sql**, **Abrir SQL Editor** do projeto correto.
- Rodapé com 3 passos curtos (abrir, colar, run).
- Sem banners decorativos, sem texto longo.

### 3. Build hook
Rodar o script uma vez para regenerar o `public/setup.sql` idempotente. Não mexo no design das outras telas, não toco em business logic, não mexo em rotas além do modal.

## Fora do escopo
- Não mexo em `src/lib/schema-errors.ts`, `src/router.tsx`, `tenants.functions.ts` — já fazem o trabalho deles.
- Não vou tentar gerar um SQL "diff" cirúrgico (apenas o que falta) — é frágil e perigoso. O caminho seguro é um SQL completo **idempotente**, que é exatamente o que resolve o `42710`.

## Resultado esperado
- Colar o SQL no SQL Editor do tenant **nunca mais** dá erro de "already exists".
- O modal fica enxuto, mostrando claramente qual é a conexão, o que falhou (quando há erro registrado) e o SQL pronto para copiar.
