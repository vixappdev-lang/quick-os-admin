// Client Supabase "ativo" — alterna entre o banco central (Lovable Cloud)
// e um banco de tenant conectado para aquele usuário.
//
// Use `activeSupabase` em TODAS as queries de dados (produtos, pedidos,
// clientes, estoque etc). Use o `supabase` padrão apenas para auth,
// gerenciamento de tenants, permissões e tabela `profiles`/`user_roles`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabase as defaultClient } from "./client";

const STORAGE_KEY = "active_tenant_v1";

export interface ActiveTenantConfig {
  slug: string;
  url: string;
  anon_key: string;
}

let cached: { cfg: ActiveTenantConfig; client: SupabaseClient<Database> } | null = null;

function readStored(): ActiveTenantConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.slug || !v?.url || !v?.anon_key) return null;
    return v as ActiveTenantConfig;
  } catch { return null; }
}

function buildTenantClient(cfg: ActiveTenantConfig): SupabaseClient<Database> {
  return createClient<Database>(cfg.url, cfg.anon_key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

function resolve(): SupabaseClient<Database> {
  const cfg = readStored();
  if (!cfg) { cached = null; return defaultClient as any; }
  if (cached && cached.cfg.slug === cfg.slug && cached.cfg.url === cfg.url) {
    return cached.client;
  }
  const client = buildTenantClient(cfg);
  cached = { cfg, client };
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
  // notifica a aplicação para invalidar cache
  window.dispatchEvent(new CustomEvent("active-tenant-changed"));
}

/** Proxy que sempre resolve para o client correto em tempo de chamada. */
export const activeSupabase = new Proxy({} as SupabaseClient<Database>, {
  get(_t, prop, receiver) {
    const c = resolve();
    return Reflect.get(c as any, prop, receiver);
  },
});