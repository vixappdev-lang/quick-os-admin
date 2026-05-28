import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LogOut, ShoppingBag, Plus, Search, Clock, CheckCircle2, XCircle, User, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePedidos } from "@/lib/queries";
import { formatBRL, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/vendedor/")({
  head: () => ({ meta: [{ title: "Meus Pedidos | LyneCloud" }] }),
  component: VendedorHome,
});

function VendedorHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = usePedidos({ vendedorId: user?.id });
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "pendente" | "concluido" | "cancelado">("todos");

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtro === "pendente" && !["pendente", "autorizado", "separacao", "conferencia", "faturamento"].includes(p.status)) return false;
      if (filtro === "concluido" && p.status !== "concluido") return false;
      if (filtro === "cancelado" && p.status !== "cancelado") return false;
      if (busca && !p.numero.toLowerCase().includes(busca.toLowerCase()) && !p.cliente?.nome?.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [pedidos, filtro, busca]);

  const totais = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const doDia = pedidos.filter((p) => new Date(p.created_at) >= hoje);
    return {
      hoje: doDia.length,
      valor: doDia.reduce((s, p) => s + Number(p.total), 0),
      pendentes: pedidos.filter((p) => ["pendente", "autorizado", "separacao"].includes(p.status)).length,
    };
  }, [pedidos]);

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">Vendedor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/vendedor/novo" className="hidden h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] sm:inline-flex">
              <Plus className="h-3.5 w-3.5" /> Novo pedido
            </Link>
            <ThemeToggle />
            <button onClick={() => signOut().then(() => navigate({ to: "/login" }))} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {[
            { l: "Hoje", v: String(totais.hoje), i: ShoppingBag, c: "text-primary bg-primary/10" },
            { l: "Valor", v: formatBRL(totais.valor), i: CheckCircle2, c: "text-success bg-success/10" },
            { l: "Pendentes", v: String(totais.pendentes), i: Clock, c: "text-warning bg-warning/15" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border bg-card p-3 shadow-subtle lg:p-5">
              <div className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md lg:h-10 lg:w-10", k.c)}>
                <k.i className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground lg:mt-3 lg:text-xs">{k.l}</p>
              <p className="text-base font-semibold tabular lg:text-2xl">{k.v}</p>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pedido ou cliente..." className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            ["todos", "Todos"], ["pendente", "Em andamento"], ["concluido", "Finalizados"], ["cancelado", "Cancelados"],
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={cn("h-8 shrink-0 rounded-full border px-3.5 text-xs font-medium transition", filtro === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>

        {/* Lista */}
        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {isLoading && <div className="col-span-full rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Carregando...</div>}
          {!isLoading && filtrados.length === 0 && <div className="col-span-full rounded-xl border border-dashed bg-card/60 p-10 text-center text-sm text-muted-foreground">Nenhum pedido encontrado</div>}
          {filtrados.map((p) => (
            <button key={p.id} onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })} className="block w-full rounded-xl border bg-card p-4 text-left shadow-subtle transition hover:border-primary/40 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{p.numero}</p>
                    <StatusPill status={p.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <User className="h-3 w-3" /> {p.cliente?.nome ?? "Sem cliente"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold tabular">{formatBRL(Number(p.total))}</p>
                  <p className="text-[11px] text-muted-foreground">{formatTime(p.created_at)}</p>
                </div>
              </div>
              <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
                {(p.itens ?? []).length} {(p.itens ?? []).length === 1 ? "item" : "itens"}
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* FAB (mobile only — desktop tem botão no header) */}
      <Link to="/vendedor/novo" className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 sm:hidden">
        <Plus className="h-5 w-5" /> Novo pedido
      </Link>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { l: string; c: string; i: any }> = {
    pendente: { l: "Pendente", c: "bg-warning/15 text-warning", i: Clock },
    autorizado: { l: "Autorizado", c: "bg-info/10 text-info", i: CheckCircle2 },
    separacao: { l: "Separação", c: "bg-info/10 text-info", i: Clock },
    conferencia: { l: "Conferência", c: "bg-primary/10 text-primary", i: Clock },
    faturamento: { l: "Faturamento", c: "bg-primary/10 text-primary", i: Clock },
    concluido: { l: "Finalizado", c: "bg-success/10 text-success", i: CheckCircle2 },
    cancelado: { l: "Cancelado", c: "bg-destructive/10 text-destructive", i: XCircle },
  };
  const cfg = m[status] ?? m.pendente;
  const I = cfg.i;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", cfg.c)}>
      <I className="h-2.5 w-2.5" /> {cfg.l}
    </span>
  );
}