import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { useEstoqueMovimentos } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque/movimentacoes")({
  head: () => ({ meta: [{ title: "Movimentações de estoque — Quick OS" }] }),
  component: () => {
    const { data: movs = [], isLoading } = useEstoqueMovimentos();
    const cols: Column<any>[] = [
      { key: "data", header: "Data", render: (m) => formatDateTime(m.created_at) },
      { key: "tipo", header: "Tipo", render: (m) => <StatusBadge status={m.tipo} tone={statusTone(m.tipo)} /> },
      { key: "produto", header: "Produto", render: (m) => <div><p className="font-medium">{m.produto?.nome ?? "—"}</p><p className="text-xs text-muted-foreground">{m.produto?.sku ?? ""}</p></div> },
      { key: "qtd", header: "Quantidade", align: "right", render: (m) => { const q = Number(m.qtd); return <span className={q > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>{q > 0 ? "+" : ""}{q} {m.produto?.unidade ?? ""}</span>; } },
      { key: "motivo", header: "Motivo", render: (m) => <span className="text-sm text-muted-foreground">{m.motivo ?? "—"}</span> },
    ];
    return (
      <div>
        <PageHeader title="Movimentações de estoque" description="Histórico completo de entradas, saídas e ajustes" />
        <SectionCard padded={false}>
          {isLoading
            ? <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>
            : movs.length === 0
              ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada</div>
              : <DataTable columns={cols} rows={movs} />}
        </SectionCard>
      </div>
    );
  },
});