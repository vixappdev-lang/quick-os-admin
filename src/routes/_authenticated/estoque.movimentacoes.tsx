import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, History, Search, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { useEstoqueMovimentos } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque/movimentacoes")({
  head: () => ({ meta: [{ title: "Movimentações de estoque — Quick OS" }] }),
  component: MovimentacoesPage,
});

function MovimentacoesPage() {
  const { data: movs = [], isLoading } = useEstoqueMovimentos();
  const [tipo, setTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return movs.filter((m: any) => {
      if (tipo !== "todos" && m.tipo !== tipo) return false;
      if (!q) return true;
      return (
        (m.produto?.nome ?? "").toLowerCase().includes(q) ||
        (m.produto?.sku ?? "").toLowerCase().includes(q) ||
        (m.motivo ?? "").toLowerCase().includes(q)
      );
    });
  }, [movs, tipo, busca]);

  const totals = useMemo(() => {
    let entradas = 0, saidas = 0, ajustes = 0;
    movs.forEach((m: any) => {
      const q = Number(m.qtd ?? 0);
      if (m.tipo === "entrada") entradas += q;
      else if (m.tipo === "saida" || m.tipo === "perda") saidas += q;
      else if (m.tipo === "ajuste") ajustes += 1;
    });
    return { entradas, saidas, ajustes, total: movs.length };
  }, [movs]);

  return (
    <div>
      <Link to="/estoque" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para estoque
      </Link>
      <PageHeader
        title="Movimentações de estoque"
        description="Histórico completo e atualizado de entradas, saídas e ajustes"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Movimentações" value={String(totals.total)} icon={History} accent="primary" />
        <KpiCard label="Total de entradas" value={String(totals.entradas)} icon={ArrowDownToLine} accent="success" />
        <KpiCard label="Total de saídas" value={String(totals.saidas)} icon={ArrowUpFromLine} accent="info" />
        <KpiCard label="Ajustes / perdas" value={String(totals.ajustes)} icon={AlertTriangle} accent="warning" />
      </div>

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto, SKU ou motivo..."
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
              <option value="ajuste">Ajustes</option>
              <option value="perda">Perdas</option>
              <option value="venda">Vendas</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando movimentações...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {movs.length === 0 ? "Nenhuma movimentação registrada ainda" : "Nenhuma movimentação para os filtros aplicados"}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">Data</th>
                    <th className="px-4 py-2.5 text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-left">Produto</th>
                    <th className="px-4 py-2.5 text-right">Quantidade</th>
                    <th className="px-4 py-2.5 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((m: any) => {
                    const q = Number(m.qtd);
                    const negativo = m.tipo === "saida" || m.tipo === "perda" || m.tipo === "venda";
                    return (
                      <tr key={m.id} className="border-b hover:bg-muted/40">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(m.created_at)}</td>
                        <td className="px-4 py-3"><StatusBadge status={m.tipo} tone={statusTone(m.tipo)} /></td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{m.produto?.nome ?? "—"}</p>
                          <p className="font-mono text-xs text-muted-foreground">{m.produto?.sku ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular">
                          <span className={negativo ? "font-semibold text-destructive" : "font-semibold text-success"}>
                            {negativo ? "-" : "+"}{Math.abs(q)} {m.produto?.unidade ?? ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.motivo ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="md:hidden divide-y">
              {filtrados.map((m: any) => {
                const q = Number(m.qtd);
                const negativo = m.tipo === "saida" || m.tipo === "perda" || m.tipo === "venda";
                return (
                  <li key={m.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.tipo} tone={statusTone(m.tipo)} />
                          <span className="text-[11px] text-muted-foreground">{formatDateTime(m.created_at)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{m.produto?.nome ?? "—"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{m.produto?.sku} · {m.motivo ?? "Sem motivo"}</p>
                      </div>
                      <span className={`tabular text-sm font-semibold ${negativo ? "text-destructive" : "text-success"}`}>
                        {negativo ? "-" : "+"}{Math.abs(q)} {m.produto?.unidade ?? ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SectionCard>
    </div>
  );
}