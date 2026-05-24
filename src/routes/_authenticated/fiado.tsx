import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { clientes } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fiado")({
  head: () => ({ meta: [{ title: "Fiado — Quick OS" }] }),
  component: () => {
    const devedores = clientes.filter((c) => c.fiado > 0);
    const cols: Column<typeof clientes[number]>[] = [
      { key: "nome", header: "Cliente", render: (c) => <span className="font-medium">{c.nome}</span> },
      { key: "telefone", header: "Telefone" },
      { key: "fiado", header: "Saldo devedor", align: "right", render: (c) => <span className="font-semibold text-destructive">{formatBRL(c.fiado)}</span> },
      { key: "ultimaCompra", header: "Última compra", render: (c) => formatDate(c.ultimaCompra) },
      { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} tone={statusTone(c.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Fiado" description={`${devedores.length} clientes com saldo em aberto · Total ${formatBRL(devedores.reduce((s, c) => s + c.fiado, 0))}`} />
        <SectionCard padded={false}><DataTable columns={cols} rows={devedores} /></SectionCard>
      </div>
    );
  },
});