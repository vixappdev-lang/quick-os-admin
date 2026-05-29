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
import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { SecurityShield } from "@/components/security-shield";

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
  // Gate de renderização: até resolver qual banco (central ou tenant) o
  // usuário deve usar, NÃO renderizamos a UI e NÃO pré-carregamos queries.
  // Sem isso, o prefetch dispara no banco errado e o usuário enxerga
  // dados de outra conta por um instante.
  const [tenantReady, setTenantReady] = useState(false);
  const [resolvedForUid, setResolvedForUid] = useState<string | null>(null);

  // Sincroniza tenant ativo do usuário (banco próprio). Se ele tem um tenant
  // conectado, todas as queries de dados passam a apontar para esse banco.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      // logout: derruba tenant e cache para o próximo usuário começar limpo.
      if (getActiveTenant()) setActiveTenant(null);
      qc.clear();
      setTenantReady(false);
      setResolvedForUid(null);
      return;
    }
    // Mudou de usuário: zera AGORA o tenant ativo e o cache para evitar
    // que o proxy `activeSupabase` resolva para o banco do usuário anterior
    // enquanto buscamos o tenant correto deste usuário.
    if (resolvedForUid !== user.id) {
      if (getActiveTenant()) setActiveTenant(null);
      qc.clear();
      setTenantReady(false);
    } else if (tenantReady) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const t = await fetchMyTenant();
        if (cancelled) return;
        if (!t || !(t as any).hasServiceRole) {
          // Sem tenant — ou tenant sem service_role (proxy não funciona):
          // mantém usuário no banco central até o admin completar a conexão.
          if (getActiveTenant()) setActiveTenant(null);
        } else {
          const current = getActiveTenant();
          if (!current || current.slug !== t.slug) {
            setActiveTenant({ slug: t.slug, nome: t.nome, url: t.url });
          }
        }
      } catch {
        // falha em resolver tenant: segue no banco central.
        if (getActiveTenant()) setActiveTenant(null);
      } finally {
        if (!cancelled) {
          qc.clear();
          setResolvedForUid(user.id);
          setTenantReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ready, user?.id, fetchMyTenant, qc, resolvedForUid, tenantReady]);

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
    // CRÍTICO: só pré-carrega dados depois que o tenant ativo correto foi
    // resolvido — caso contrário, o prefetch vai no banco errado e o
    // usuário enxerga dados de outra conta por um instante.
    if (!ready || !user || user.role === "vendedor" || !tenantReady) return;
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
  }, [ready, user, router, qc, tenantReady]);

  if (!ready || (user && user.role !== "vendedor" && !tenantReady)) {
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
        <main className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
      {user.role === "admin" && <WelcomeOnboarding />}
      <SecurityShield />
    </div>
  );
}
