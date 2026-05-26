import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Download, FileBarChart2, Info, Printer, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRelatorios, exportRelatorioCSV, printRelatorio, type RelReport, type RelRow } from "@/components/relatorio-catalog";
import { usePedidos, useProdutos, useClientes, useDespesas, useContas, useUsuarios } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/relatorios/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo de Relatórios — Quick OS" }] }),
  pendingComponent: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  ),
  errorComponent: ({ error }) => (
    <CatalogoError error={error} />
  ),
  component: CatalogoPage,
});

function CatalogoError({ error }: { error: Error }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (typeof window !== "undefined") console.error("[relatorios/catalogo]", error);
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm font-semibold text-destructive">Não foi possível carregar o catálogo</p>
      <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
      <a href="/relatorios" className="mt-4 inline-flex h-9 items-center justify-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Voltar</a>
    </div>
  );
}

function CatalogoPage() {
  const { data: pedidos = [] } = usePedidos();
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const { data: despesas = [] } = useDespesas();
  const { data: contas = [] } = useContas();
  const { data: usuarios = [] } = useUsuarios();

  const grupos = useRelatorios({ pedidos, produtos, clientes, despesas, contas, usuarios });
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [busca, setBusca] = useState("");

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos;
    return grupos
      .map((g) => ({ ...g, rows: g.rows.filter((r) => `${r.num} ${r.titulo}`.toLowerCase().includes(q)) }))
      .filter((g) => g.rows.length > 0);
  }, [grupos, busca]);

  const selected: RelRow | null = useMemo(() => {
    if (selectedNum == null) return null;
    for (const g of grupos) {
      const r = g.rows.find((x) => x.num === selectedNum);
      if (r) return r;
    }
    return null;
  }, [selectedNum, grupos]);

  const report: RelReport | null = useMemo(() => (selected ? selected.build() : null), [selected]);

  return (
    <div>
      <PageHeader
        title="Catálogo de Relatórios"
        description="Selecione um relatório à esquerda para visualizar, imprimir ou exportar"
        actions={
          <Link to="/relatorios" className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Dashboard
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Sidebar com categorias */}
        <SectionCard padded={false} className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] overflow-hidden">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nº ou nome..."
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="max-h-[60vh] lg:max-h-[calc(100vh-13rem)] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhum relatório encontrado</p>
            )}
            {filtered.map((g) => (
              <div key={g.titulo} className="border-b last:border-b-0">
                <div className="bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.titulo}
                </div>
                <ul>
                  {g.rows.map((r) => {
                    const active = r.num === selectedNum;
                    return (
                      <li key={r.num}>
                        <button
                          onClick={() => setSelectedNum(r.num)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                            active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          }`}
                        >
                          <span className={`w-12 shrink-0 text-right font-mono text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
                            {r.num} -
                          </span>
                          <span className="flex-1 truncate">{r.titulo}</span>
                          <Info className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/60"}`} aria-label={r.info} />
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/40"}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Painel do relatório */}
        <SectionCard padded={false}>
          {!report ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <FileBarChart2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Selecione um relatório</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Escolha qualquer item numerado da lista ao lado para visualizar os dados, imprimir ou exportar em CSV.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Relatório nº {selected?.num}</p>
                  <h2 className="truncate text-base font-semibold">{report.titulo}</h2>
                  {selected?.info && <p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.info}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportRelatorioCSV(report)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Exportar</span> CSV
                  </button>
                  <button
                    onClick={() => printRelatorio(report)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {report.colunas.map((c) => (
                        <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.linhas.length === 0 && (
                      <tr>
                        <td colSpan={report.colunas.length} className="px-3 py-12 text-center text-xs text-muted-foreground">
                          Sem dados para este relatório
                        </td>
                      </tr>
                    )}
                    {report.linhas.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-muted/40">
                        {r.map((c, j) => (
                          <td key={j} className="px-3 py-2 tabular">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.rodape && (
                <p className="border-t bg-muted/40 px-4 py-2.5 text-right text-xs font-semibold">{report.rodape}</p>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}