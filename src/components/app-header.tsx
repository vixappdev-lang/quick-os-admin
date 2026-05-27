import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Wallet, Plus, Menu, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCaixaAtual } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";

const labels: Record<string, string> = {
  "": "Dashboard",
  pdv: "PDV", pedidos: "Pedidos",
  produtos: "Produtos", estoque: "Estoque", nfe: "Entradas NF-e", movimentacoes: "Movimentações",
  caixa: "Caixa", financeiro: "Financeiro", relatorios: "Relatórios",
  clientes: "Clientes",
  usuarios: "Usuários", configuracoes: "Configurações",
  novo: "Novo",
};

interface Props {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const { user, signOut } = useAuth();
  const { data: caixa } = useCaixaAtual();

  const caixaTotal = caixa
    ? Number(caixa.valor_inicial) + (caixa.movimentos ?? []).reduce(
        (s: number, m: any) =>
          s + (m.tipo === "suprimento" || m.tipo === "venda" ? Number(m.valor) : -Number(m.valor)),
        0,
      )
    : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-border glass">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-1.5 text-[13px] md:flex">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Quick OS</Link>
          {segments.length === 0 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="font-medium text-foreground">Dashboard</span>
            </>
          )}
          {segments.map((seg, i) => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg);
            const display = isUuid ? `#${seg.slice(0, 8)}` : (labels[seg] ?? seg);
            return (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span
                  title={isUuid ? seg : undefined}
                  className={cn(
                    i === segments.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                    isUuid && "font-mono text-xs",
                  )}
                >
                  {display}
                </span>
              </span>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {caixa ? (
            <Link to="/caixa" className="hidden items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] font-medium text-success transition-colors hover:bg-success/15 md:flex">
              <Wallet className="h-3.5 w-3.5" />
              <span>Caixa aberto</span>
              <span className="tabular text-success/80">{formatBRL(caixaTotal)}</span>
            </Link>
          ) : (
            <Link to="/caixa" className="hidden items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[11px] font-medium text-warning transition-colors hover:bg-warning/15 md:flex">
              <Wallet className="h-3.5 w-3.5" />
              <span>Caixa fechado</span>
            </Link>
          )}

          <Link to="/pdv" className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)]">
            <Plus className="h-4 w-4" /> Nova venda
          </Link>

          <ThemeToggle />

          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-md px-1.5 text-left hover:bg-muted">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary">
                {user?.initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-[12px] font-medium leading-tight">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{user?.roleLabel}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracoes"><UserIcon className="h-4 w-4 mr-2" /> Configurações</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
