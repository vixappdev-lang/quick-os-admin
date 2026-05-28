import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Download, FileBarChart2, Info, Printer, Search, X, Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useRelatorios, exportRelatorioCSV, printRelatorio, type RelReport, type RelRow } from "@/components/relatorio-catalog";
import { usePedidos, useProdutos, useClientes, useDespesas, useContas, useUsuarios, useFornecedores, useFaturamentos } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Quick OS" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: pedidosAll = [] } = usePedidos();
  const { data: produtosAll = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const { data: despesas = [] } = useDespesas();
  const { data: contas = [] } = useContas();
  const { data: usuarios = [] } = useUsuarios();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: faturamentosAll = [] } = useFaturamentos();

  // Filtros globais
  const [dtIni, setDtIni] = useState<string>("");
  const [dtFim, setDtFim] = useState<string>("");
  const [vendedorId, setVendedorId] = useState<string>("");
  const [fornecedorId, setFornecedorId] = useState<string>("");

  const pedidos = useMemo(() => {
    return pedidosAll.filter((p: any) => {
      if (vendedorId && p.vendedor_id !== vendedorId) return false;
      if (dtIni && new Date(p.created_at) < new Date(dtIni)) return false;
      if (dtFim) {
        const end = new Date(dtFim); end.setHours(23, 59, 59, 999);
        if (new Date(p.created_at) > end) return false;
      }
      return true;
    });
  }, [pedidosAll, vendedorId, dtIni, dtFim]);

  const produtos = useMemo(() => {
    if (!fornecedorId) return produtosAll;
    return produtosAll.filter((p: any) => p.fornecedor_id === fornecedorId);
  }, [produtosAll, fornecedorId]);

  const filtrosAtivos = !!(dtIni || dtFim || vendedorId || fornecedorId);

  const faturamentos = useMemo(() => {
    return faturamentosAll.filter((f: any) => {
      if (dtIni && new Date(f.created_at) < new Date(dtIni)) return false;
      if (dtFim) { const end = new Date(dtFim); end.setHours(23,59,59,999); if (new Date(f.created_at) > end) return false; }
      return true;
    });
  }, [faturamentosAll, dtIni, dtFim]);
  const grupos = useRelatorios({ pedidos, produtos, clientes, despesas, contas, usuarios, faturamentos });
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

  // Sheet só deve abrir em telas < lg (1024). Sem isso, o overlay do Radix
  // aparece no desktop mesmo com o conteúdo `lg:hidden`, escurecendo a tela.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Selecione um relatório para visualizar, imprimir ou exportar em CSV"
      />

      <SectionCard className="mb-4" padded={false}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros globais
          </div>
          {filtrosAtivos && (
            <button onClick={() => { setDtIni(""); setDtFim(""); setVendedorId(""); setFornecedorId(""); }} className="inline-flex h-7 items-center gap-1 rounded-md border bg-card px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
          <Field label="De">
            <input type="date" value={dtIni} onChange={(e) => setDtIni(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Field>
          <Field label="Até">
            <input type="date" value={dtFim} onChange={(e) => setDtFim(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Field>
          <Field label="Vendedor">
            <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Todos</option>
              {usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nome || u.email}</option>)}
            </select>
          </Field>
          <Field label="Fornecedor">
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Todos</option>
              {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
            </select>
          </Field>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
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
          <div className="max-h-[70vh] lg:max-h-[calc(100vh-13rem)] overflow-y-auto">
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

        {/* Painel direito (desktop apenas) */}
        <SectionCard padded={false} className="hidden lg:block">
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
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                  <button
                    onClick={() => printRelatorio(report)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                </div>
              </div>
              <ReportTable report={report} />
            </>
          )}
        </SectionCard>
      </div>

      {/* Sheet mobile: abre quando seleciona relatório (apenas em telas < lg) */}
      <Sheet open={isMobile && !!report && selectedNum != null} onOpenChange={(o) => !o && setSelectedNum(null)}>
        <SheetContent side="right" className="lg:hidden w-full sm:max-w-md p-0 flex flex-col">
          {report && (
            <>
              <div className="flex items-start gap-2 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Relatório nº {selected?.num}</p>
                  <h2 className="truncate text-base font-semibold">{report.titulo}</h2>
                  {selected?.info && <p className="mt-0.5 text-xs text-muted-foreground">{selected.info}</p>}
                </div>
                <button onClick={() => setSelectedNum(null)} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ReportTable report={report} />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t bg-card/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
                <button
                  onClick={() => exportRelatorioCSV(report)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
                >
                  <Download className="h-4 w-4" /> Exportar
                </button>
                <button
                  onClick={() => printRelatorio(report)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)]"
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ReportTable({ report }: { report: RelReport }) {
  return (
    <ReportTableInner report={report} />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ReportTableInner({ report }: { report: RelReport }) {
  return (
    <>
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
  );
}
