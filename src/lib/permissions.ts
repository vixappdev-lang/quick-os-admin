import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Lista de menus que podem ter permissão controlada
export const MENU_KEYS = [
  "/", "/pdv", "/pedidos", "/produtos", "/estoque", "/nfe",
  "/caixa", "/financeiro", "/relatorios", "/clientes",
  "/usuarios", "/configuracoes", "/supabase",
] as const;
export type MenuKey = typeof MENU_KEYS[number];

export const MENU_LABEL: Record<string, string> = {
  "/": "Dashboard",
  "/pdv": "PDV",
  "/pedidos": "Pedidos",
  "/produtos": "Produtos",
  "/estoque": "Estoque",
  "/nfe": "Entradas NF-e",
  "/caixa": "Caixa",
  "/financeiro": "Financeiro",
  "/relatorios": "Relatórios",
  "/clientes": "Clientes",
  "/usuarios": "Usuários",
  "/configuracoes": "Configurações",
  "/supabase": "Supabase",
};

/** Hook que retorna { allowed(menu): boolean, ready } para o usuário logado. */
export function useMyPermissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const q = useQuery({
    queryKey: ["user_permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as { menu: string; allowed: boolean }[];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("menu, allowed")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const map = new Map<string, boolean>();
  (q.data ?? []).forEach((p) => map.set(p.menu, p.allowed));
  return {
    ready: q.isFetched || !user,
    allowed: (menu: string) => {
      if (isAdmin) return true;
      // default: permitido se nenhuma regra explícita existir
      const v = map.get(menu);
      return v === undefined ? true : v;
    },
  };
}

/** Lê permissões de um usuário específico (admin) */
export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_permissions", "for", userId],
    queryFn: async () => {
      if (!userId) return [] as { menu: string; allowed: boolean }[];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("menu, allowed")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}