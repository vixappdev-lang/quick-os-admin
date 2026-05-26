import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Search, MoreVertical, Eye, Printer, CheckCircle2, XCircle, LayoutGrid, List, ChevronDown, ArrowRight, ArrowLeft, FileText, Package as PackageIcon, CreditCard, AlertTriangle, MessageSquare, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, statusTone, pedidoStatusTone, PEDIDO_STATUS_LABEL } from "@/components/status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatBRL, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePedidos, useUpdatePedidoStatus, useUpdatePedido, useProdutos, useClientes, useVendedores, useCriarFaturamento, type Pedido } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { printRomaneio, printRomaneios } from "@/components/romaneio-print";
import { printEntregas, exportEntregasCSV, formatEndereco } from "@/components/entregas-print";
import { printSeparacao, agregarSeparacao } from "@/components/separacao-print";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  // Index route for /pedidos. Path is normalized below via TanStack;
  // the trailing slash here mirrors the file system convention.
  head: () => ({ meta: [{ title: "Pedidos — Quick OS" }] }),
  component: PedidosPage,
});

const COLUMNS: { id: Pedido["status"]; label: string; tone: string }[] = [
  { id: "pendente", label: "Pendente", tone: "border-warning/40" },
  { id: "autorizado", label: "Autorizado", tone: "border-info/40" },
  { id: "separacao", label: "Separação", tone: "border-info/40" },
  { id: "conferencia", label: "Conferência", tone: "border-primary/40" },
  { id: "faturamento" as any, label: "Faturamento", tone: "border-primary/40" },
  { id: "concluido", label: "Finalizado", tone: "border-success/40" },
];
const NEXT_OF: Record<string, Pedido["status"] | null> = {
  pendente: "autorizado", autorizado: "separacao", separacao: "conferencia", conferencia: "faturamento" as any, faturamento: "concluido" as any, concluido: null,
};
const PREV_OF: Record<string, Pedido["status"] | null> = {
  pendente: null, autorizado: "pendente", separacao: "autorizado", conferencia: "separacao", faturamento: "conferencia" as any, concluido: "faturamento" as any,
};

function PedidosPage() {
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: clientesAll = [] } = useClientes();
  const { data: vendedoresAll = [] } = useVendedores();
  const updateStatus = useUpdatePedidoStatus();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [busca, setBusca] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [incluirEncerrados, setIncluirEncerrados] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState<string>("");
  const [filtroVendedor, setFiltroVendedor] = useState<string>("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(
    () => pedidos.filter((p: any) => {
      if (busca && !(p.numero.toLowerCase().includes(busca.toLowerCase()) || p.cliente?.nome?.toLowerCase().includes(busca.toLowerCase()))) return false;
      return true;
    }),
    [pedidos, busca],
  );

  const filteredLista = useMemo(() => {
    return filtered.filter((p: any) => {
      if (!incluirEncerrados && (p.status === "concluido" || p.status === "cancelado")) return false;
      if (filtroCliente && p.cliente_id !== filtroCliente) return false;
      if (filtroVendedor && p.vendedor_id !== filtroVendedor) return false;
      if (filtroProduto) {
        const t = filtroProduto.toLowerCase();
        const ok = (p.itens ?? []).some((i: any) => (i.produto?.nome ?? "").toLowerCase().includes(t) || (i.produto?.sku ?? "").toLowerCase().includes(t));
        if (!ok) return false;
      }
      return true;
    });
  }, [filtered, incluirEncerrados, filtroCliente, filtroVendedor, filtroProduto]);

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
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        <>
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</label>
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Todos</option>
              {clientesAll.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Vendedor</label>
            <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Todos</option>
              {vendedoresAll.map((v: any) => <option key={v.id} value={v.id}>{v.nome ?? v.email}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Produto contido</label>
            <input value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} placeholder="Nome ou SKU..." className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
          </div>
          <label className="ml-auto inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={incluirEncerrados} onChange={(e) => setIncluirEncerrados(e.target.checked)} />
            Incluir encerrados/cancelados
          </label>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
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
              {filteredLista.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum pedido encontrado</td></tr>
              )}
              {filteredLista.map((p: any) => (
                <tr key={p.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })}>
                  <td className="px-4 py-3 font-semibold">{p.numero}</td>
                  <td className="px-4 py-3">{p.cliente?.nome ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{p.origem}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatTime(p.created_at)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatBRL(Number(p.total))}</td>
                  <td className="px-4 py-3"><StatusBadge status={PEDIDO_STATUS_LABEL[p.status] ?? p.status} tone={pedidoStatusTone(p.status)} /></td>
                  <td className="px-4 py-3"><PedidoActions pedido={p} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
        </>
      )}
    </div>
  );
}

function KanbanColumn({ col, pedidos, onView }: { col: typeof COLUMNS[number]; pedidos: any[]; onView: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const updateStatus = useUpdatePedidoStatus();
  const criarFat = useCriarFaturamento();
  const { user } = useAuth();
  const [entregasOpen, setEntregasOpen] = useState(false);
  const [separacaoOpen, setSeparacaoOpen] = useState(false);
  const next = NEXT_OF[col.id];
  const moverTodos = async (alvo: Pedido["status"]) => {
    for (const p of pedidos) {
      try { await updateStatus.mutateAsync({ id: p.id, status: alvo }); } catch {}
    }
    toast.success(`${pedidos.length} pedido(s) movidos para ${alvo}`);
  };
  const faturarTodos = async () => {
    if (pedidos.length === 0) return;
    const total = pedidos.reduce((s, p) => s + Number(p.total), 0);
    try {
      const fat: any = await criarFat.mutateAsync({ pedidoIds: pedidos.map((p) => p.id), total, userId: user?.id ?? null });
      toast.success(`Faturamento ${fat?.numero ?? ""} criado · ${pedidos.length} pedido(s)`);
    } catch (e: any) { toast.error(e.message ?? "Erro ao faturar"); }
  };
  return (
    <div ref={setNodeRef} className={cn("flex flex-col rounded-xl border-t-2 bg-muted/30 transition-colors min-w-0", col.tone, isOver && "bg-muted/60")}>
      <div className="flex items-center justify-between gap-1 px-2 py-2">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</p>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-card px-1.5 py-0.5 text-[10px] font-medium tabular">{pedidos.length}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button disabled={pedidos.length === 0} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-40" aria-label="Ações da coluna">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              {col.id === ("faturamento" as any) && (
                <ColAction icon={FileText} label="Faturar todos os pedidos" onClick={faturarTodos} />
              )}
              <ColAction icon={CheckCircle2} label="Encerrar todos os pedidos" onClick={() => moverTodos("concluido")} />
              <ColAction icon={Printer} label="Imprimir todos" onClick={() => printRomaneios(pedidos)} />
              {next && <ColAction icon={ArrowRight} label="Mover p/ o próximo processo" onClick={() => moverTodos(next)} />}
              <div className="my-1 border-t" />
              <ColAction icon={Truck()} label="Relação de Entregas" onClick={() => setEntregasOpen(true)} />
              <ColAction icon={PackageIcon} label="Separação por Produto" onClick={() => setSeparacaoOpen(true)} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex-1 space-y-2 px-2 pb-2 min-h-[200px]">
        {pedidos.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
            Solte pedidos aqui
          </div>
        )}
        {pedidos.map((p) => <KanbanCard key={p.id} pedido={p} onView={onView} />)}
      </div>
      <EntregasDialog open={entregasOpen} onOpenChange={setEntregasOpen} pedidos={pedidos} colLabel={col.label} />
      <SeparacaoDialog open={separacaoOpen} onOpenChange={setSeparacaoOpen} pedidos={pedidos} colLabel={col.label} />
    </div>
  );
}

function KanbanCard({ pedido, onView }: { pedido: any; onView: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: pedido.id });
  const itens = pedido.itens ?? [];
  const primeiros = itens.slice(0, 2).map((i: any) => i.produto?.nome).filter(Boolean) as string[];
  const sobra = Math.max(0, itens.length - primeiros.length);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("group cursor-grab rounded-lg border bg-card p-3 shadow-subtle transition-shadow hover:shadow-md active:cursor-grabbing", isDragging && "opacity-30")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold">{pedido.numero}</p>
            <StatusBadge status={PEDIDO_STATUS_LABEL[pedido.status] ?? pedido.status} tone={pedidoStatusTone(pedido.status)} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{pedido.cliente?.nome ?? "Balcão"}</p>
        </div>
        <PedidoActions pedido={pedido} onView={() => onView(pedido.id)} />
      </div>
      {primeiros.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {primeiros.map((n, i) => (
            <p key={i} className="truncate text-[11px] text-foreground/80">• {n}</p>
          ))}
          {sobra > 0 && <p className="text-[10px] text-muted-foreground">+ {sobra} {sobra === 1 ? "item" : "itens"}</p>}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{formatTime(pedido.created_at)} · {itens.length} itens</span>
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
  const updatePedido = useUpdatePedido();
  const { data: produtos = [] } = useProdutos();
  const [pagOpen, setPagOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [pagamento, setPagamento] = useState<string>(pedido.pagamento ?? "pix");
  const [observacoes, setObservacoes] = useState<string>(pedido.observacoes ?? "");
  const next = NEXT_OF[pedido.status as string];
  const prev = PREV_OF[pedido.status as string];
  const inconsistencias = (pedido.itens ?? [])
    .map((i: any) => {
      const p = produtos.find((x: any) => x.id === i.produto?.id || x.id === i.produto_id);
      if (!p) return null;
      const est = Number(p.estoque);
      const min = Number(p.estoque_minimo ?? 0);
      if (est < 0 || est <= min) return { nome: p.nome, estoque: est, min };
      return null;
    })
    .filter(Boolean) as any[];

  const handle = async (status: Pedido["status"], label: string) => {
    try {
      await updateStatus.mutateAsync({ id: pedido.id, status });
      toast.success(`${pedido.numero} ${label}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const savePag = async () => {
    try { await updatePedido.mutateAsync({ id: pedido.id, pagamento }); toast.success("Pagamento atualizado"); setPagOpen(false); }
    catch (e: any) { toast.error(e.message); }
  };
  const saveObs = async () => {
    try { await updatePedido.mutateAsync({ id: pedido.id, observacoes }); toast.success("Observações salvas"); setObsOpen(false); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Ações">
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => (onView ? onView() : navigate({ to: "/pedidos/$id", params: { id: pedido.id } }))} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <Eye className="h-3.5 w-3.5" /> Ver detalhes
        </button>
        <button onClick={() => navigate({ to: "/pedidos/$id", params: { id: pedido.id }, search: { edit: 1 } as any })} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <Pencil className="h-3.5 w-3.5" /> Alterar pedido
        </button>
        <button onClick={() => printRomaneio(pedido)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </button>
        <div className="my-1 border-t" />
        {next && (
          <button onClick={() => handle(next, `movido para ${next}`)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
            <ArrowRight className="h-3.5 w-3.5" /> Próximo processo
          </button>
        )}
        {prev && (
          <button onClick={() => handle(prev, `voltado para ${prev}`)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
            <ArrowLeft className="h-3.5 w-3.5" /> Processo anterior
          </button>
        )}
        <button onClick={() => setPagOpen(true)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <CreditCard className="h-3.5 w-3.5" /> Pagamentos
        </button>
        <button onClick={() => setIncOpen(true)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <AlertTriangle className="h-3.5 w-3.5" /> Inconsistências {inconsistencias.length > 0 && <span className="ml-auto rounded bg-warning/20 px-1.5 text-[10px] text-warning">{inconsistencias.length}</span>}
        </button>
        <button onClick={() => setObsOpen(true)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <MessageSquare className="h-3.5 w-3.5" /> Observações
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

    <Dialog open={pagOpen} onOpenChange={setPagOpen}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Forma de pagamento — {pedido.numero}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {(["pix","credito","debito","dinheiro","fiado","outro"] as const).map((m) => (
            <button key={m} onClick={() => setPagamento(m)} className={cn("rounded-md border p-2 text-xs font-medium capitalize", pagamento === m ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{m}</button>
          ))}
        </div>
        <DialogFooter>
          <button onClick={() => setPagOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={savePag} disabled={updatePedido.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">Salvar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={obsOpen} onOpenChange={setObsOpen}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Observações — {pedido.numero}</DialogTitle></DialogHeader>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={5} className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Adicione observações..." />
        <DialogFooter>
          <button onClick={() => setObsOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={saveObs} disabled={updatePedido.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">Salvar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={incOpen} onOpenChange={setIncOpen}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Inconsistências — {pedido.numero}</DialogTitle></DialogHeader>
        {inconsistencias.length === 0 ? (
          <p className="rounded-md bg-success/10 p-3 text-sm text-success">Nenhuma inconsistência detectada.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {inconsistencias.map((i, ix) => (
              <li key={ix} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="font-medium">{i.nome}</span>
                <span className="text-xs"><span className={i.estoque < 0 ? "text-destructive" : "text-warning"}>Estoque: {i.estoque}</span> <span className="text-muted-foreground">/ mín {i.min}</span></span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter><button onClick={() => setIncOpen(false)} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Fechar</button></DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ColAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
      {typeof Icon === "function" && !(Icon as any).$$typeof ? <Icon /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
function Truck() { return function TruckIcon() { return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z"/></svg>; }; }

function EntregasDialog({ open, onOpenChange, pedidos, colLabel }: { open: boolean; onOpenChange: (o: boolean) => void; pedidos: any[]; colLabel: string }) {
  const totalGeral = pedidos.reduce((s, p) => s + Number(p.total), 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Relação de Entregas — {colLabel}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-muted/60">
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">Pedido</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">Cliente</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">Endereço</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">Telefone</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">Sem pedidos nesta coluna</td></tr>
              )}
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="px-3 py-2 font-semibold">{p.numero}</td>
                  <td className="px-3 py-2">{p.cliente?.nome ?? "Balcão"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatEndereco(p.cliente?.endereco)}</td>
                  <td className="px-3 py-2 text-xs">{p.cliente?.telefone ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular font-semibold">{formatBRL(Number(p.total))}</td>
                </tr>
              ))}
            </tbody>
            {pedidos.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40"><td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold">Total geral</td><td className="px-3 py-2 text-right tabular font-bold">{formatBRL(totalGeral)}</td></tr>
              </tfoot>
            )}
          </table>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Fechar</button>
          <button onClick={() => exportEntregasCSV(pedidos)} disabled={pedidos.length === 0} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted disabled:opacity-50">Exportar CSV</button>
          <button onClick={() => printEntregas(pedidos)} disabled={pedidos.length === 0} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">Imprimir</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeparacaoDialog({ open, onOpenChange, pedidos, colLabel }: { open: boolean; onOpenChange: (o: boolean) => void; pedidos: any[]; colLabel: string }) {
  const linhas = useMemo(() => agregarSeparacao(pedidos), [pedidos]);
  const totalItens = linhas.reduce((s, l) => s + l.qtd, 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Separação por Produto — {colLabel}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="sticky top-0 bg-muted/60">
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">SKU</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">Produto</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-muted-foreground">Qtd</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase text-muted-foreground">Unid</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-muted-foreground">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">Sem itens para separar</td></tr>
              )}
              {linhas.map((l) => (
                <tr key={l.produto_id} className="border-b">
                  <td className="px-3 py-2 font-mono text-xs">{l.sku}</td>
                  <td className="px-3 py-2 font-medium">{l.nome}</td>
                  <td className="px-3 py-2 text-right tabular font-semibold">{l.qtd.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">{l.unidade}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{l.pedidos.join(", ")}</td>
                </tr>
              ))}
            </tbody>
            {linhas.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40"><td colSpan={2} className="px-3 py-2 text-right text-xs font-semibold">Total</td><td className="px-3 py-2 text-right tabular font-bold">{totalItens.toLocaleString("pt-BR")}</td><td colSpan={2} /></tr>
              </tfoot>
            )}
          </table>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Fechar</button>
          <button onClick={() => printSeparacao(pedidos)} disabled={linhas.length === 0} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">Imprimir</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
