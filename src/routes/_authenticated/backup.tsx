import { createFileRoute } from "@tanstack/react-router";
import { DatabaseBackup, Download, Cloud } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({ meta: [{ title: "Backup — Quick OS" }] }),
  component: () => {
    type B = { id: string; data: string; tamanho: string; tipo: string; status: string };
    const rows: B[] = [
      { id: "b1", data: "24/05/2026 03:00", tamanho: "248 MB", tipo: "Automático", status: "concluído" },
      { id: "b2", data: "23/05/2026 03:00", tamanho: "246 MB", tipo: "Automático", status: "concluído" },
      { id: "b3", data: "22/05/2026 14:21", tamanho: "245 MB", tipo: "Manual", status: "concluído" },
      { id: "b4", data: "22/05/2026 03:00", tamanho: "244 MB", tipo: "Automático", status: "concluído" },
    ];
    const cols: Column<B>[] = [
      { key: "data", header: "Data" },
      { key: "tipo", header: "Tipo" },
      { key: "tamanho", header: "Tamanho", align: "right" },
      { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} tone="success" /> },
      { key: "acoes", header: "", align: "right", render: () => <button className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs hover:bg-muted"><Download className="h-3 w-3" /> Baixar</button> },
    ];
    return (
      <div>
        <PageHeader title="Backup" description="Cópias de segurança automáticas e manuais" actions={<button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><DatabaseBackup className="h-3.5 w-3.5" /> Gerar backup agora</button>} />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SectionCard><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success"><Cloud className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Último backup</p><p className="text-sm font-semibold">Hoje · 03:00</p></div></div></SectionCard>
          <SectionCard><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><DatabaseBackup className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Total armazenado</p><p className="text-sm font-semibold">1,2 GB</p></div></div></SectionCard>
          <SectionCard><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-info/10 text-info"><Cloud className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Próximo automático</p><p className="text-sm font-semibold">Amanhã · 03:00</p></div></div></SectionCard>
        </div>
        <SectionCard title="Histórico de backups" padded={false}><DataTable columns={cols} rows={rows} /></SectionCard>
      </div>
    );
  },
});