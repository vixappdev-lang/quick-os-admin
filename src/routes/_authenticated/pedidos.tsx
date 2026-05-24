import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Search, Filter, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { pedidos, type Pedido } from "@/data/mock";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Quick OS" }] }),
  component: PedidosPage,
});

function PedidosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("todos");

  const filtrados = useMemo(
    () => pedidos.filter((p) =>
      (status === "todos" || p.status === status) &&
      (!busca || p.numero.includes(busca) || p.cliente.toLowerCase().includes(busca.toLowerCase()))
    ),
    [busca, status]
  );

  const columns: Column<Pedido>[] = [
    { key: "numero", header: "Pedido", render: (p) => <span className="font-semibold text-foreground">{p.numero}</span> },
    { key: "data", header: "Data", render: (p) => <span className="text-muted-foreground">{formatDateTime(p.data)}</span> },
    { key: "cliente", header: "Cliente" },
    { key: "operador", header: "Operador", render: (p) => <span className="text-muted-foreground">{p.operador}</span> },
    { key: "origem", header: "Origem", render: (p) => <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.origem}</span> },
    { key: "pagamento", header: "Pagamento" },
    { key: "itens", header: "Itens", align: "right" },
    { key: "total", header: "Total", align: "right", render: (p) => <span className="font-semibold">{formatBRL(p.total)}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} tone={statusTone(p.status)} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description={`${filtrados.length} de ${pedidos.length} pedidos`}
        actions={
          <>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Exportar</button>
            <Link to="/pedidos/novo" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              <Plus className="h-3.5 w-3.5" /> Novo pedido
            </Link>
          </>
        }
      />

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número ou cliente..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="todos">Todos os status</option>
            <option value="concluído">Concluído</option>
            <option value="pendente">Pendente</option>
            <option value="em preparo">Em preparo</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground hover:bg-muted"><Filter className="h-3.5 w-3.5" /> Filtros avançados</button>
        </div>
        <DataTable columns={columns} rows={filtrados} onRowClick={(p) => navigate({ to: "/pedidos/$id", params: { id: p.id } })} />
        <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
          <p>Mostrando 1–{filtrados.length} de {pedidos.length}</p>
          <div className="flex items-center gap-1">
            <button className="rounded-md border bg-card px-3 py-1 hover:bg-muted">Anterior</button>
            <button className="rounded-md border bg-card px-3 py-1 hover:bg-muted">Próximo</button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}