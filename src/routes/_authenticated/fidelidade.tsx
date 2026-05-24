import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { clientes } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fidelidade")({
  head: () => ({ meta: [{ title: "Fidelidade — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof clientes[number]>[] = [
      { key: "nome", header: "Cliente", render: (c) => <span className="font-medium">{c.nome}</span> },
      { key: "pontos", header: "Pontos", align: "right", render: (c) => <span className="font-semibold text-primary">{c.pontos}</span> },
      { key: "compras", header: "Compras", align: "right" },
      { key: "totalGasto", header: "Total gasto", align: "right", render: (c) => formatBRL(c.totalGasto) },
    ];
    return (
      <div>
        <PageHeader title="Programa de Fidelidade" description="Gestão de pontos e recompensas" />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Participantes" value={String(clientes.length)} icon={Heart} accent="primary" />
          <KpiCard label="Pontos ativos" value={clientes.reduce((s, c) => s + c.pontos, 0).toString()} icon={Heart} accent="success" />
          <KpiCard label="Resgates do mês" value="42" icon={Heart} accent="warning" />
        </div>
        <SectionCard title="Top clientes em pontos" padded={false}><DataTable columns={cols} rows={[...clientes].sort((a, b) => b.pontos - a.pontos)} /></SectionCard>
      </div>
    );
  },
});