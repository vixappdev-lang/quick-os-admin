import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { movimentacoes } from "@/data/mock";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque/movimentacoes")({
  head: () => ({ meta: [{ title: "Movimentações de estoque — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof movimentacoes[number]>[] = [
      { key: "data", header: "Data", render: (m) => formatDateTime(m.data) },
      { key: "tipo", header: "Tipo", render: (m) => <StatusBadge status={m.tipo} tone={statusTone(m.tipo)} /> },
      { key: "produto", header: "Produto" },
      { key: "qtd", header: "Quantidade", align: "right", render: (m) => <span className={m.qtd > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>{m.qtd > 0 ? "+" : ""}{m.qtd}</span> },
      { key: "origem", header: "Origem" },
      { key: "operador", header: "Operador" },
    ];
    return (
      <div>
        <PageHeader title="Movimentações de estoque" description="Histórico completo de entradas, saídas e ajustes" />
        <SectionCard padded={false}><DataTable columns={cols} rows={movimentacoes} /></SectionCard>
      </div>
    );
  },
});