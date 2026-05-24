import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Search, Sun, Moon, ChevronRight, Wallet, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const labels: Record<string, string> = {
  "": "Dashboard",
  pdv: "PDV", pedidos: "Pedidos", comandas: "Comandas", delivery: "Delivery",
  produtos: "Produtos", categorias: "Categorias", estoque: "Estoque", nfe: "Entradas NF-e", movimentacoes: "Movimentações",
  caixa: "Caixa", financeiro: "Fluxo Financeiro", despesas: "Despesas", contas: "Contas", relatorios: "Relatórios",
  clientes: "Clientes", fidelidade: "Fidelidade", fiado: "Fiado",
  usuarios: "Usuários", permissoes: "Permissões", logs: "Logs",
  configuracoes: "Configurações", integracoes: "Integrações", backup: "Backup",
  novo: "Novo",
};

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const { user, signOut } = useAuth();
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border glass">
      <div className="flex h-14 items-center gap-3 px-6">
        <nav className="flex items-center gap-1.5 text-[13px]">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Quick OS</Link>
          {segments.length === 0 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="font-medium text-foreground">Dashboard</span>
            </>
          )}
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className={cn(i === segments.length - 1 ? "font-medium text-foreground" : "text-muted-foreground")}>
                {labels[seg] ?? seg}
              </span>
            </span>
          ))}
        </nav>

        <div className="ml-6 hidden flex-1 max-w-md md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos, pedidos, clientes..."
              className="h-9 w-full rounded-md border border-input bg-background/70 pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] font-medium text-success md:flex">
            <Wallet className="h-3.5 w-3.5" />
            <span>Caixa aberto</span>
            <span className="tabular text-success/80">R$ 7.240,90</span>
          </div>

          <Link to="/pdv" className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)]">
            <Plus className="h-4 w-4" /> Nova venda
          </Link>

          <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex-col items-start gap-0.5">
                <p className="text-xs font-medium">Estoque crítico: Red Bull 250ml</p>
                <p className="text-[11px] text-muted-foreground">Apenas 8 unidades restantes</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start gap-0.5">
                <p className="text-xs font-medium">NF-e 00012340 com divergência</p>
                <p className="text-[11px] text-muted-foreground">Diageo Brasil — 2 itens</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start gap-0.5">
                <p className="text-xs font-medium">Conta a pagar vence amanhã</p>
                <p className="text-[11px] text-muted-foreground">Diageo Brasil — R$ 12.480,00</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                {user?.initials ?? "CA"}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-[12px] font-medium leading-tight text-foreground">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground">{user?.role}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass">
              <DropdownMenuLabel>
                <p className="text-xs font-medium">{user?.name}</p>
                <p className="text-[11px] font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Meu perfil</DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/configuracoes">Configurações</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}