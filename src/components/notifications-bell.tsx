import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, PackageX, Receipt, Wallet, Power, CheckCheck, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProdutos, usePedidos, useCaixaAtual, useAppSettings } from "@/lib/queries";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { activeSupabase } from "@/integrations/supabase/active-client";
import { useAuth } from "@/lib/auth";

type DbNotif = {
  id: string;
  tipo: string;
  severidade: string;
  titulo: string;
  mensagem: string;
  payload: any;
  lida_em: string | null;
  created_at: string;
};

function severityTone(sev: string) {
  if (sev === "critico") return "text-destructive";
  if (sev === "aviso") return "text-warning";
  return "text-info";
}

function severityIcon(tipo: string) {
  if (tipo.startsWith("estoque_zerado")) return PackageX;
  if (tipo.startsWith("estoque_baixo")) return AlertTriangle;
  if (tipo.startsWith("pedido_")) return Receipt;
  return AlertTriangle;
}

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { data: produtos = [] } = useProdutos();
  const { data: pedidos = [] } = usePedidos();
  const { data: caixa } = useCaixaAtual();
  const { data: settings } = useAppSettings();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const { data: dbNotifs = [] } = useQuery<DbNotif[]>({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const { data, error } = await activeSupabase
        .from("notificacoes")
        .select("*")
        .is("lida_em", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) return [];
      return (data ?? []) as DbNotif[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  // Realtime — escuta inserts e refaz a query.
  useEffect(() => {
    if (!user) return;
    const ch = activeSupabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes" }, () => {
        qc.invalidateQueries({ queryKey: ["notificacoes"] });
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user, qc]);

  // Derivados (estado atual do painel) — complementam o feed do DB.
  const derived = useMemo(() => {
    const list: { id: string; icon: any; tone: string; title: string; desc: string; to?: string }[] = [];
    const pendentes = pedidos.filter((p: any) => p.status === "pendente");
    if (pendentes.length > 0) list.push({ id: "ped", icon: Receipt, tone: "text-info", title: `${pendentes.length} pedido(s) pendente(s)`, desc: "Aguardando autorização", to: "/pedidos" });
    if (!caixa) list.push({ id: "cx", icon: Wallet, tone: "text-warning", title: "Caixa fechado", desc: "Abra o caixa para iniciar vendas", to: "/caixa" });
    if (settings && !settings.pdv_ativo) list.push({ id: "pdv", icon: Power, tone: "text-destructive", title: "PDV desativado", desc: "Ative em Configurações > PDV", to: "/configuracoes" });
    return list;
  }, [produtos, pedidos, caixa, settings]);

  const totalCount = dbNotifs.length + derived.length;

  const markAllRead = async () => {
    if (dbNotifs.length === 0) return;
    await activeSupabase
      .from("notificacoes")
      .update({ lida_em: new Date().toISOString() })
      .in("id", dbNotifs.map((n) => n.id));
    qc.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  const Content = (
    <div className="flex flex-col h-full sm:h-auto">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:py-2.5 shrink-0">
        <div>
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-[11px] text-muted-foreground">{totalCount === 0 ? "Tudo em ordem" : `${totalCount} aviso(s)`}</p>
        </div>
        {dbNotifs.length > 0 && (
          <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-[11px] hover:bg-muted">
            <CheckCheck className="h-3 w-3" /> Marcar lidas
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto max-h-[60vh] sm:max-h-80">
        {totalCount === 0 ? (
          <div className="px-4 py-10 text-center">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Sem notificações</p>
          </div>
        ) : (
          <>
            {dbNotifs.map((n) => {
              const Icon = severityIcon(n.tipo);
              const tone = severityTone(n.severidade);
              const pedidoId = n.payload?.pedido_id;
              const produtoId = n.payload?.produto_id;
              const to = pedidoId ? `/pedidos/${pedidoId}` : produtoId ? `/produtos` : "/";
              return (
                <Link key={n.id} to={to} onClick={() => setOpen(false)} className="flex gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${tone}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{n.titulo}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.mensagem}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                </Link>
              );
            })}
            {derived.map((n) => (
              <Link key={n.id} to={n.to ?? "/"} onClick={() => setOpen(false)} className="flex gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50">
                <n.icon className={`h-4 w-4 shrink-0 mt-0.5 ${n.tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );

  const Trigger = (
    <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Notificações">
      <Bell className="h-4 w-4" />
      {totalCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {totalCount > 9 ? "9+" : totalCount}
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{Trigger}</SheetTrigger>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md flex flex-col">
          <SheetHeader className="sr-only"><SheetTitle>Notificações</SheetTitle></SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        {Content}
      </PopoverContent>
    </Popover>
  );
}