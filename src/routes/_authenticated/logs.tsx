import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { logs } from "@/data/mock";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Logs — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof logs[number]>[] = [
      { key: "data", header: "Data", render: (l) => formatDateTime(l.data) },
      { key: "usuario", header: "Usuário", render: (l) => <span className="font-medium">{l.usuario}</span> },
      { key: "acao", header: "Ação" },
      { key: "recurso", header: "Recurso", render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.recurso}</span> },
      { key: "ip", header: "IP", render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.ip}</span> },
    ];
    return (
      <div>
        <PageHeader title="Logs de auditoria" description="Histórico completo de ações no sistema" />
        <SectionCard padded={false}><DataTable columns={cols} rows={logs} /></SectionCard>
      </div>
    );
  },
});