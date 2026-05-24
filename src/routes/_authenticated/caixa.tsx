import { createFileRoute } from "@tanstack/react-router";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { sessoesCaixa } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({ meta: [{ title: "Caixa — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof sessoesCaixa[number]>[] = [
      { key: "caixa", header: "Caixa", render: (s) => <span className="font-semibold">{s.caixa}</span> },
      { key: "operador", header: "Operador" },
      { key: "abertura", header: "Abertura" },
      { key: "fechamento", header: "Fechamento" },
      { key: "inicial", header: "Inicial", align: "right", render: (s) => formatBRL(s.inicial) },
      { key: "atual", header: "Valor", align: "right", render: (s) => <span className="font-semibold">{formatBRL(s.atual)}</span> },
      { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} tone={statusTone(s.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Caixa" description="Sessões de caixa e movimentações" actions={
          <>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><ArrowDownToLine className="h-3.5 w-3.5" /> Sangria</button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><ArrowUpFromLine className="h-3.5 w-3.5" /> Suprimento</button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:opacity-90"><Lock className="h-3.5 w-3.5" /> Fechar caixa</button>
          </>
        } />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Caixa atual" value={formatBRL(7240.9)} icon={Wallet} accent="primary" />
          <KpiCard label="Entradas hoje" value={formatBRL(18432.5)} icon={ArrowDownToLine} accent="success" />
          <KpiCard label="Saídas hoje" value={formatBRL(2120)} icon={ArrowUpFromLine} accent="warning" />
          <KpiCard label="Sangrias" value={formatBRL(800)} icon={ArrowUpFromLine} accent="info" />
        </div>
        <SectionCard title="Sessões de caixa" padded={false}><DataTable columns={cols} rows={sessoesCaixa} /></SectionCard>
      </div>
    );
  },
});