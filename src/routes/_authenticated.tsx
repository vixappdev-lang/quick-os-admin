import { createFileRoute, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { activeSupabase, setActiveTenant, getActiveTenant } from "@/integrations/supabase/active-client";
import { useServerFn } from "@tanstack/react-start";
import { getMyTenant } from "@/lib/tenants.functions";
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
  const fetchMyTenant = useServerFn(getMyTenant);

  // Sincroniza tenant ativo do usuário (banco próprio). Se ele tem um tenant
  // conectado, todas as queries de dados passam a apontar para esse banco.
  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchMyTenant();
        if (cancelled) return;
        const current = getActiveTenant();
        if (!t) {
          if (current) { setActiveTenant(null); qc.clear(); }
          return;
        }
        if (!current || current.slug !== t.slug || current.url !== t.url) {
          setActiveTenant({ slug: t.slug, url: t.url, anon_key: t.anon_key });
          qc.clear(); // painel "limpa" — recarrega dados do tenant
        }
      } catch {/* ignore — segue no banco central */}
    })();
    return () => { cancelled = true; };
  }, [ready, user, fetchMyTenant, qc]);

  // Reage a trocas manuais do tenant (super-admin conectando/removendo).
  useEffect(() => {
    const onChange = () => qc.clear();
    window.addEventListener("active-tenant-changed", onChange);
    return () => window.removeEventListener("active-tenant-changed", onChange);
  }, [qc]);

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
      { key: ["produtos"], fn: () => activeSupabase.from("produtos").select("*, categoria:categorias(id,nome,cor)").order("nome") },
      { key: ["clientes"], fn: () => activeSupabase.from("clientes").select("*").order("nome") },
      { key: ["categorias"], fn: () => activeSupabase.from("categorias").select("*").order("nome") },
      { key: ["pedidos", undefined], fn: () => activeSupabase.from("pedidos").select("*, cliente:clientes(id,nome,telefone), itens:pedido_itens(id,qtd,preco_unit,total,produto:produtos(id,nome,sku))").order("created_at", { ascending: false }) },
      { key: ["app_settings"], fn: () => activeSupabase.from("app_settings").select("*").eq("id", "main").maybeSingle() },
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
