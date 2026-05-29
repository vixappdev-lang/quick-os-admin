// Client Supabase "ativo" — alterna entre o banco central (Lovable Cloud)
// e um banco de tenant conectado para aquele usuário.
//
// Quando há tenant ativo, criamos um Supabase client apontando para o
// proxy backend `/api/tenant/*`. O proxy valida o usuário e encaminha
// para o Supabase do tenant usando service_role (server-only).
// A service_role NUNCA fica no navegador.
//
// Use `activeSupabase` em TODAS as queries de dados. Use o `supabase`
// padrão apenas para auth, gerenciamento de tenants e tabelas centrais.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabase as defaultClient } from "./client";

const STORAGE_KEY = "active_tenant_v1";

export interface ActiveTenantConfig {
  slug: string;
  nome?: string | null;
  url?: string;
}

let cached: { slug: string; client: SupabaseClient<Database> } | null = null;

function readStored(): ActiveTenantConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.slug) return null;
    return v as ActiveTenantConfig;
  } catch { return null; }
}

function buildTenantClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") return defaultClient as any;
  const baseUrl = `${window.location.origin}/api/tenant`;
  // O "key" abaixo é apenas um placeholder; o proxy ignora e usa service_role.
  return createClient<Database>(baseUrl, "tenant-proxy-placeholder", {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: async (input, init) => {
        // Anexa o token do usuário no banco central para o proxy validar.
        const { data } = await defaultClient.auth.getSession();
        const token = data.session?.access_token;
        const headers = new Headers(init?.headers);
        if (token) headers.set("X-Lovable-Auth", token);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function resolve(): SupabaseClient<Database> {
  const cfg = readStored();
  if (!cfg) { cached = null; return defaultClient as any; }
  if (cached && cached.slug === cfg.slug) return cached.client;
  const client = buildTenantClient();
  cached = { slug: cfg.slug, client };
  return client;
}

export function getActiveTenant(): ActiveTenantConfig | null { return readStored(); }

export function setActiveTenant(cfg: ActiveTenantConfig | null) {
  if (typeof window === "undefined") return;
  if (cfg) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  cached = null;
  window.dispatchEvent(new CustomEvent("active-tenant-changed"));
}

/** Proxy que sempre resolve para o client correto em tempo de chamada. */
export const activeSupabase = new Proxy({} as SupabaseClient<Database>, {
  get(_t, prop, receiver) {
    const c = resolve();
    return Reflect.get(c as any, prop, receiver);
  },
});