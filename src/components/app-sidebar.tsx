import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Boxes,
  Wallet, TrendingUp, FileBarChart, Users, UserCog, Settings,
  ChevronLeft, Zap, X, FileText, Database, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyPermissions } from "@/lib/permissions";

type Item = { label: string; to: string; icon: any };
type Group = { label?: string; items: Item[] };

const groups: Group[] = [
  { items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }] },
  {
    label: "Operacional",
    items: [
      { label: "PDV", to: "/pdv", icon: ShoppingCart },
      { label: "Pedidos", to: "/pedidos", icon: Receipt },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { label: "Produtos", to: "/produtos", icon: Package },
      { label: "Estoque", to: "/estoque", icon: Boxes },
      { label: "Entradas NF-e", to: "/nfe", icon: FileText },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Caixa", to: "/caixa", icon: Wallet },
      { label: "Financeiro", to: "/financeiro", icon: TrendingUp },
      { label: "Relatórios", to: "/relatorios", icon: FileBarChart },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Clientes", to: "/clientes", icon: Users },
      { label: "Fornecedores", to: "/fornecedores", icon: Truck },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Usuários", to: "/usuarios", icon: UserCog },
      { label: "Supabase", to: "/supabase", icon: Database },
      { label: "Configurações", to: "/configuracoes", icon: Settings },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { allowed } = useMyPermissions();
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => allowed(it.to)) }))
    .filter((g) => g.items.length > 0);
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200",
          collapsed ? "lg:w-[68px]" : "lg:w-[244px]",
          "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden" onClick={onMobileClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <p className="text-[13px] font-semibold tracking-tight text-white">Quick OS</p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--sidebar-muted)]">Enterprise</p>
              </div>
            )}
          </Link>
          <button
            onClick={onMobileClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--sidebar-muted)] hover:bg-sidebar-accent hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-muted)] transition-colors hover:bg-sidebar-accent hover:text-white lg:flex",
              collapsed && "rotate-180",
            )}
            aria-label="Colapsar menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-3">
          {visibleGroups.map((g, gi) => (
            <div key={gi} className="mb-1.5">
              {g.label && !collapsed && (
                <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">
                  {g.label}
                </p>
              )}
              {g.label && collapsed && <div className="my-2 border-t border-sidebar-border" />}
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onMobileClose}
                        preload="intent"
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-[var(--sidebar-foreground)] hover:bg-sidebar-accent/60 hover:text-white",
                          collapsed && "lg:justify-center",
                        )}
                      >
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-sidebar-primary" />}
                        <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "")} />
                        {(!collapsed || mobileOpen) && <span className="truncate lg:[.collapsed_&]:hidden">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="border-t border-sidebar-border p-3">
            <div className="rounded-lg bg-sidebar-accent/50 p-3">
              <p className="text-[11px] font-medium text-white">Plano Premium</p>
              <p className="mt-0.5 text-[10px] text-[var(--sidebar-muted)]">Renovação em 12 dias</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
