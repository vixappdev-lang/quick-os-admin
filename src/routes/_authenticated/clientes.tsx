import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { clientes, type Cliente } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Quick OS" }] }),
  component: () => {
    const navigate = useNavigate();
    const [busca, setBusca] = useState("");
    const filtrados = useMemo(() => clientes.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca)), [busca]);
    const cols: Column<Cliente>[] = [
      { key: "nome", header: "Cliente", render: (c) => <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div><p className="font-medium">{c.nome}</p><p className="text-xs text-muted-foreground">{c.email}</p></div></div> },
      { key: "telefone", header: "Telefone" },
      { key: "compras", header: "Compras", align: "right" },
      { key: "totalGasto", header: "Total gasto", align: "right", render: (c) => <span className="font-semibold">{formatBRL(c.totalGasto)}</span> },
      { key: "fiado", header: "Fiado", align: "right", render: (c) => c.fiado > 0 ? <span className="font-semibold text-destructive">{formatBRL(c.fiado)}</span> : <span className="text-muted-foreground">—</span> },
      { key: "ultimaCompra", header: "Última compra", render: (c) => formatDate(c.ultimaCompra) },
      { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} tone={statusTone(c.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Clientes" description={`${clientes.length} clientes cadastrados`} actions={<button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Novo cliente</button>} />
        <SectionCard padded={false}>
          <div className="flex items-center gap-3 border-b px-5 py-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <DataTable columns={cols} rows={filtrados} onRowClick={(c) => navigate({ to: "/clientes/$id", params: { id: c.id } })} />
        </SectionCard>
      </div>
    );
  },
});