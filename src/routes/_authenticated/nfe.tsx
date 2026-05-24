import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { nfes } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/nfe")({
  head: () => ({ meta: [{ title: "Entradas NF-e — Quick OS" }] }),
  component: NfePage,
});

function NfePage() {
  const cols: Column<typeof nfes[number]>[] = [
    { key: "numero", header: "NF-e", render: (n) => <span className="font-mono font-semibold">{n.numero}</span> },
    { key: "emissor", header: "Emissor" },
    { key: "data", header: "Data", render: (n) => formatDate(n.data) },
    { key: "itens", header: "Itens", align: "right" },
    { key: "valor", header: "Valor", align: "right", render: (n) => formatBRL(n.valor) },
    { key: "status", header: "Status", render: (n) => <StatusBadge status={n.status} tone={statusTone(n.status)} /> },
  ];
  return (
    <div>
      <PageHeader title="Entradas NF-e" description="Importação automática e conferência de notas fiscais" />
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><UploadCloud className="h-6 w-6" /></div>
            <p className="mt-3 text-sm font-semibold">Arraste o XML da NF-e aqui</p>
            <p className="mt-1 text-xs text-muted-foreground">ou clique para selecionar arquivos · até 10MB</p>
            <button className="mt-4 h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Selecionar XML</button>
          </div>
        </SectionCard>
        <div className="space-y-3">
          {[
            { i: CheckCircle2, c: "text-success bg-success/10", t: "Leitura automática", d: "Produtos vinculados via EAN" },
            { i: AlertTriangle, c: "text-warning bg-warning/15", t: "Conferência de divergências", d: "Preço, quantidade, NCM" },
            { i: FileText, c: "text-info bg-info/10", t: "Resumo financeiro", d: "Conta a pagar gerada automaticamente" },
          ].map((s) => (
            <div key={s.t} className="flex gap-3 rounded-xl border bg-card p-4 shadow-subtle">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${s.c}`}><s.i className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium">{s.t}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
            </div>
          ))}
        </div>
      </div>
      <SectionCard title="NF-e recentes" padded={false}><DataTable columns={cols} rows={nfes} /></SectionCard>
    </div>
  );
}