import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { deliveries } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/delivery")({
  head: () => ({ meta: [{ title: "Delivery — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof deliveries[number]>[] = [
      { key: "numero", header: "Pedido", render: (d) => <span className="font-semibold">{d.numero}</span> },
      { key: "cliente", header: "Cliente" },
      { key: "endereco", header: "Endereço", render: (d) => <span className="text-muted-foreground">{d.endereco}</span> },
      { key: "entregador", header: "Entregador" },
      { key: "tempo", header: "Tempo", render: (d) => <span className="tabular">{d.tempo}</span> },
      { key: "total", header: "Total", align: "right", render: (d) => formatBRL(d.total) },
      { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} tone={statusTone(d.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Delivery" description="Acompanhe pedidos em rota e tempo de entrega" />
        <SectionCard padded={false}><DataTable columns={cols} rows={deliveries} /></SectionCard>
      </div>
    );
  },
});