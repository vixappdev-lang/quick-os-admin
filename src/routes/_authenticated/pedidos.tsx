import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Search, MoreVertical, Eye, Edit, Printer, CheckCircle2, XCircle, LayoutGrid, List, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatBRL, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePedidos, useUpdatePedidoStatus, type Pedido } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Quick OS" }] }),
  component: PedidosPage,
});

const COLUMNS: { id: Pedido["status"]; label: string; tone: string }[] = [
  { id: "pendente", label: "Pendente", tone: "border-warning/40" },
  { id: "autorizado", label: "Autorizado", tone: "border-info/40" },
  { id: "separacao", label: "Separação", tone: "border-info/40" },
  { id: "conferencia", label: "Conferência", tone: "border-primary/40" },
  { id: "concluido", label: "Finalizado", tone: "border-success/40" },
];

function PedidosPage() {
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = usePedidos();
  const updateStatus = useUpdatePedidoStatus();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [busca, setBusca] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(
    () => pedidos.filter((p) =>
      !busca ||
      p.numero.toLowerCase().includes(busca.toLowerCase()) ||
      p.cliente?.nome?.toLowerCase().includes(busca.toLowerCase()),
    ),
    [pedidos, busca],
  );

  const byCol = useMemo(() => {
    const map: Record<string, any[]> = {};
    COLUMNS.forEach((c) => (map[c.id] = []));
    filtered.forEach((p) => {
      const col = COLUMNS.find((c) => c.id === p.status)?.id ?? "pendente";
      map[col].push(p);
    });
    return map;
  }, [filtered]);

  const onDragEnd = async (e: DragEndEvent) => {
    setDragId(null);
    const id = e.active.id as string;
    const newStatus = e.over?.id as Pedido["status"] | undefined;
    if (!newStatus) return;
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido || pedido.status === newStatus) return;
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Pedido ${pedido.numero} → ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao mover pedido");
    }
  };

  const draggedPedido = dragId ? pedidos.find((p) => p.id === dragId) : null;

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description={`${filtered.length} de ${pedidos.length} pedidos`}
        actions={
          <>
            <div className="inline-flex rounded-md border bg-card p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium", view === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </button>
              <button
                onClick={() => setView("lista")}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium", view === "lista" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
            </div>
            <Link to="/pedidos/novo" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              <Plus className="h-3.5 w-3.5" /> Novo pedido
            </Link>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número ou cliente..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {isLoading && <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Carregando pedidos...</div>}

      {!isLoading && view === "kanban" && (
        <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragId(e.active.id as string)} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <KanbanColumn key={col.id} col={col} pedidos={byCol[col.id] ?? []} onView={(id) => navigate({ to: "/pedidos/$id", params: { id } })} />
            ))}
          </div>
          <DragOverlay>
            {draggedPedido && <KanbanCardSimple pedido={draggedPedido} />}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && view === "lista" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pedido</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Origem</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hora</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum pedido encontrado</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })}>
                  <td className="px-4 py-3 font-semibold">{p.numero}</td>
                  <td className="px-4 py-3">{p.cliente?.nome ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{p.origem}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatTime(p.created_at)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatBRL(Number(p.total))}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} tone={statusTone(p.status)} /></td>
                  <td className="px-4 py-3"><PedidoActions pedido={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ col, pedidos, onView }: { col: typeof COLUMNS[number]; pedidos: any[]; onView: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div ref={setNodeRef} className={cn("flex flex-col rounded-xl border-t-2 bg-muted/30 transition-colors", col.tone, isOver && "bg-muted/60")}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</p>
        <span className="rounded bg-card px-1.5 py-0.5 text-[11px] font-medium tabular">{pedidos.length}</span>
      </div>
      <div className="flex-1 space-y-2 px-2 pb-2 min-h-[200px]">
        {pedidos.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
            Solte pedidos aqui
          </div>
        )}
        {pedidos.map((p) => <KanbanCard key={p.id} pedido={p} onView={onView} />)}
      </div>
    </div>
  );
}

function KanbanCard({ pedido, onView }: { pedido: any; onView: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: pedido.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("group cursor-grab rounded-lg border bg-card p-3 shadow-subtle transition-shadow hover:shadow-md active:cursor-grabbing", isDragging && "opacity-30")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{pedido.numero}</p>
          <p className="truncate text-xs text-muted-foreground">{pedido.cliente?.nome ?? "Balcão"}</p>
        </div>
        <PedidoActions pedido={pedido} onView={() => onView(pedido.id)} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{formatTime(pedido.created_at)} · {(pedido.itens ?? []).length} itens</span>
        <span className="tabular text-sm font-semibold">{formatBRL(Number(pedido.total))}</span>
      </div>
    </div>
  );
}

function KanbanCardSimple({ pedido }: { pedido: any }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold">{pedido.numero}</p>
      <p className="text-xs text-muted-foreground">{pedido.cliente?.nome ?? "Balcão"}</p>
      <p className="mt-1 text-sm font-semibold tabular">{formatBRL(Number(pedido.total))}</p>
    </div>
  );
}

function PedidoActions({ pedido, onView }: { pedido: any; onView?: () => void }) {
  const navigate = useNavigate();
  const updateStatus = useUpdatePedidoStatus();
  const handle = async (status: Pedido["status"], label: string) => {
    try {
      await updateStatus.mutateAsync({ id: pedido.id, status });
      toast.success(`${pedido.numero} ${label}`);
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Ações">
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => (onView ? onView() : navigate({ to: "/pedidos/$id", params: { id: pedido.id } }))} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <Eye className="h-3.5 w-3.5" /> Ver detalhes
        </button>
        <button onClick={() => toast.info("Em breve: edição completa")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <Edit className="h-3.5 w-3.5" /> Editar
        </button>
        <button onClick={() => window.print()} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </button>
        <div className="my-1 border-t" />
        {pedido.status !== "concluido" && (
          <button onClick={() => handle("concluido", "concluído")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-success hover:bg-success/10">
            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
          </button>
        )}
        {pedido.status !== "cancelado" && (
          <button onClick={() => handle("cancelado", "cancelado")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10">
            <XCircle className="h-3.5 w-3.5" /> Cancelar
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
