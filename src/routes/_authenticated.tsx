import { createFileRoute, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/login" });
    } else if (user.role === "vendedor") {
      navigate({ to: "/vendedor" });
    }
  }, [ready, user, navigate]);

  // Pre-warm code-split route bundles AND common data caches once auth is
  // ready, so switching tabs feels instant instead of waiting on first fetch.
  useEffect(() => {
    if (!ready || !user || user.role === "vendedor") return;
    const routes = [
      "/pedidos", "/produtos", "/estoque", "/clientes",
      "/caixa", "/financeiro", "/pdv", "/configuracoes", "/relatorios",
    ] as const;
    routes.forEach((to) => { try { router.preloadRoute({ to }); } catch {} });

    const prefetch = [
      { key: ["produtos"], fn: () => supabase.from("produtos").select("*, categoria:categorias(id,nome,cor)").order("nome") },
      { key: ["clientes"], fn: () => supabase.from("clientes").select("*").order("nome") },
      { key: ["categorias"], fn: () => supabase.from("categorias").select("*").order("nome") },
      { key: ["pedidos", undefined], fn: () => supabase.from("pedidos").select("*, cliente:clientes(id,nome,telefone), itens:pedido_itens(id,qtd,preco_unit,total,produto:produtos(id,nome,sku))").order("created_at", { ascending: false }) },
      { key: ["app_settings"], fn: () => supabase.from("app_settings").select("*").eq("id", "main").maybeSingle() },
    ];
    prefetch.forEach(({ key, fn }) => {
      qc.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          const { data, error } = await fn();
          if (error) throw error;
          return data;
        },
        staleTime: 30_000,
      });
    });
  }, [ready, user, router, qc]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  if (!user || user.role === "vendedor") return null;

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        style={{ paddingLeft: undefined }}
        className={collapsed ? "lg:pl-[68px] transition-[padding] duration-200" : "lg:pl-[244px] transition-[padding] duration-200"}
      >
        <AppHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
