import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { despesas } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({ meta: [{ title: "Despesas — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof despesas[number]>[] = [
      { key: "descricao", header: "Descrição", render: (d) => <span className="font-medium">{d.descricao}</span> },
      { key: "categoria", header: "Categoria", render: (d) => <span className="rounded bg-muted px-2 py-0.5 text-xs">{d.categoria}</span> },
      { key: "vencimento", header: "Vencimento", render: (d) => formatDate(d.vencimento) },
      { key: "valor", header: "Valor", align: "right", render: (d) => <span className="font-semibold">{formatBRL(d.valor)}</span> },
      { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} tone={statusTone(d.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Despesas" description="Controle de gastos e contas operacionais" actions={<button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Nova despesa</button>} />
        <SectionCard padded={false}><DataTable columns={cols} rows={despesas} /></SectionCard>
      </div>
    );
  },
});