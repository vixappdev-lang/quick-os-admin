import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, PackageX, Receipt, Wallet, Power } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProdutos, usePedidos, useCaixaAtual, useAppSettings } from "@/lib/queries";
import { useMemo } from "react";

export function NotificationsBell() {
  const { data: produtos = [] } = useProdutos();
  const { data: pedidos = [] } = usePedidos();
  const { data: caixa } = useCaixaAtual();
  const { data: settings } = useAppSettings();

  const items = useMemo(() => {
    const list: { id: string; icon: any; tone: string; title: string; desc: string; to?: string }[] = [];
    const ruptura = produtos.filter((p: any) => Number(p.estoque) <= 0);
    const baixo = produtos.filter((p: any) => Number(p.estoque) > 0 && Number(p.estoque) < Number(p.estoque_minimo ?? 0));
    const pendentes = pedidos.filter((p: any) => p.status === "pendente");

    if (ruptura.length > 0) list.push({ id: "rup", icon: PackageX, tone: "text-destructive", title: `${ruptura.length} produto(s) em ruptura`, desc: "Estoque zerado — reabasteça", to: "/produtos" });
    if (baixo.length > 0) list.push({ id: "bx", icon: AlertTriangle, tone: "text-warning", title: `${baixo.length} produto(s) com estoque baixo`, desc: "Abaixo do mínimo definido", to: "/produtos" });
    if (pendentes.length > 0) list.push({ id: "ped", icon: Receipt, tone: "text-info", title: `${pendentes.length} pedido(s) pendente(s)`, desc: "Aguardando autorização", to: "/pedidos" });
    if (!caixa) list.push({ id: "cx", icon: Wallet, tone: "text-warning", title: "Caixa fechado", desc: "Abra o caixa para iniciar vendas", to: "/caixa" });
    if (settings && !settings.pdv_ativo) list.push({ id: "pdv", icon: Power, tone: "text-destructive", title: "PDV desativado", desc: "Ative em Configurações > PDV", to: "/configuracoes" });
    return list;
  }, [produtos, pedidos, caixa, settings]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-[11px] text-muted-foreground">{items.length === 0 ? "Tudo em ordem" : `${items.length} alerta(s)`}</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">Sem notificações</p>
          ) : (
            items.map((n) => (
              <Link key={n.id} to={n.to ?? "/"} className="flex gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50">
                <n.icon className={`h-4 w-4 shrink-0 mt-0.5 ${n.tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}