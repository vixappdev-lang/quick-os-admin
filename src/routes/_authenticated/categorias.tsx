import { createFileRoute } from "@tanstack/react-router";
import { Plus, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { categorias } from "@/data/mock";

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Quick OS" }] }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const cols: Column<typeof categorias[number]>[] = [
    { key: "nome", header: "Categoria", render: (c) => <span className="font-medium">{c.nome}</span> },
    { key: "produtos", header: "Produtos", align: "right" },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} tone="success" /> },
    { key: "acoes", header: "", render: () => <button className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>, align: "right" },
  ];
  return (
    <div>
      <PageHeader title="Categorias" description="Organize seu catálogo por agrupamentos" actions={<button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Nova categoria</button>} />
      <SectionCard padded={false}><DataTable columns={cols} rows={categorias} /></SectionCard>
    </div>
  );
}