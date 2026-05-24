import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { contas } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({ meta: [{ title: "Contas — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof contas[number]>[] = [
      { key: "tipo", header: "Tipo", render: (c) => <span className={`rounded px-2 py-0.5 text-xs font-medium ${c.tipo === "a receber" ? "bg-success/10 text-success" : "bg-warning/15 text-warning"}`}>{c.tipo}</span> },
      { key: "parceiro", header: "Parceiro", render: (c) => <span className="font-medium">{c.parceiro}</span> },
      { key: "vencimento", header: "Vencimento", render: (c) => formatDate(c.vencimento) },
      { key: "valor", header: "Valor", align: "right", render: (c) => <span className="font-semibold">{formatBRL(c.valor)}</span> },
      { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} tone={statusTone(c.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Contas" description="A pagar e a receber" />
        <SectionCard padded={false}><DataTable columns={cols} rows={contas} /></SectionCard>
      </div>
    );
  },
});