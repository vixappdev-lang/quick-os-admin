import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gerente" | "operador" | "vendedor";

/** Único e-mail com poderes plenos (gerenciar permissões e tenants Supabase). */
export const SUPER_ADMIN_EMAIL = "admin@loja.com";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  roleLabel: string;
  initials: string;
  avatarUrl?: string | null;
  isSuperAdmin: boolean;
}

interface AuthState {
  user: SessionUser | null;
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  operador: "Operador",
  vendedor: "Vendedor",
};
const ROLE_RANK: Record<AppRole, number> = { admin: 4, gerente: 3, operador: 2, vendedor: 1 };

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

async function hydrateUser(u: User): Promise<SessionUser> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("nome, avatar_url").eq("id", u.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", u.id),
  ]);
  const name = profile?.nome || u.email?.split("@")[0] || "Usuário";
  const list = (roles ?? []).map((r) => r.role as AppRole);
  const top = list.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0] ?? "operador";
  return {
    id: u.id,
    name,
    email: u.email ?? "",
    role: top,
    roleLabel: ROLE_LABEL[top],
    initials: initialsOf(name),
    avatarUrl: profile?.avatar_url ?? null,
    isSuperAdmin: (u.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let lastHydratedUid: string | null = null;
    const hydrate = (u: User) => {
      if (lastHydratedUid === u.id) return;
      lastHydratedUid = u.id;
      hydrateUser(u).then((v) => { if (mounted) setUser(v); }).catch(() => { if (mounted) setUser(null); });
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Defer hydration to next tick to avoid deadlock and dedupe by uid
        setTimeout(() => hydrate(s.user), 0);
      } else {
        lastHydratedUid = null;
        setUser(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        lastHydratedUid = s.user.id;
        hydrateUser(s.user)
          .then((v) => { if (mounted) setUser(v); })
          .finally(() => { if (mounted) setReady(true); });
      } else {
        if (mounted) setReady(true);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nome }, emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, ready, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function isVendedor(role: AppRole | undefined) {
  return role === "vendedor";
}
export function isStaff(role: AppRole | undefined) {
  return role === "admin" || role === "gerente" || role === "operador";
}