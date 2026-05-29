import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, setCookie, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildAuthorizeUrl,
  listProjects as mgmtListProjects,
  getProjectApiKeys,
  runQuery,
  projectUrl,
  SUPABASE_SETUP_SQL,
} from "./supabase-oauth.server";

const SUPER = "admin@loja.com";
function ensureSuper(ctx: any) {
  const email = (ctx?.claims?.email || "").toString().toLowerCase();
  if (email !== SUPER) throw new Error("Apenas o super-administrador pode conectar Supabase.");
}

function origin() {
  const host = getRequestHost();
  // Em dev o host pode ser localhost — assumimos https em produção.
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}
function redirectUri() {
  return `${origin()}/api/supabase-oauth/callback`;
}
function randomState() {
  // 32 bytes hex
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Inicia o fluxo: cria state, grava no banco e seta cookie. Retorna a URL de autorização. */
export const startSupabaseOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    target_user_id: z.string().uuid(),
    slug: z.string().regex(/^[a-z0-9]{3,24}$/),
    nome: z.string().max(80).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    ensureSuper(context);
    const state = randomState();
    const { error } = await supabaseAdmin.from("supabase_oauth_states").insert({
      state,
      super_admin_id: context.userId,
      target_user_id: data.target_user_id,
      slug: data.slug,
      nome: data.nome ?? null,
    });
    if (error) throw new Error(error.message);
    setCookie("sb_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 15,
    });
    return { url: buildAuthorizeUrl({ state, redirectUri: redirectUri() }) };
  });

/** Lista projetos disponíveis no token guardado para esse state. */
export const listOAuthProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ state: z.string().min(10) }).parse(i))
  .handler(async ({ data, context }) => {
    ensureSuper(context);
    const { data: row, error } = await supabaseAdmin
      .from("supabase_oauth_states").select("*").eq("state", data.state).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.super_admin_id !== context.userId) throw new Error("State inválido.");
    if (!row.access_token) throw new Error("OAuth ainda não concluído.");
    const projects = await mgmtListProjects(row.access_token);
    return {
      target_user_id: row.target_user_id,
      slug: row.slug,
      nome: row.nome,
      projects,
    };
  });

/** Finaliza: pega keys, roda setup.sql e cria tenant. */
export const connectOAuthProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    state: z.string().min(10),
    project_ref: z.string().min(10),
    slug: z.string().regex(/^[a-z0-9]{3,24}$/).optional(),
    nome: z.string().max(80).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    ensureSuper(context);
    const { data: row, error } = await supabaseAdmin
      .from("supabase_oauth_states").select("*").eq("state", data.state).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.super_admin_id !== context.userId) throw new Error("State inválido.");
    if (!row.access_token) throw new Error("OAuth não concluído.");

    const { anon, service } = await getProjectApiKeys(row.access_token, data.project_ref);
    if (!anon || !service) throw new Error("Não foi possível obter as chaves do projeto (anon/service_role).");

    // Roda setup.sql idempotente no projeto do cliente
    try {
      await runQuery(row.access_token, data.project_ref, SUPABASE_SETUP_SQL);
    } catch (e: any) {
      throw new Error("Falha ao instalar o schema no projeto: " + (e?.message || e));
    }

    const url = projectUrl(data.project_ref);
    const slug = data.slug || row.slug;
    const nome = data.nome ?? row.nome ?? null;

    const { data: tenant, error: te } = await supabaseAdmin.from("tenants").insert({
      user_id: row.target_user_id,
      slug,
      nome,
      supabase_url: url,
      supabase_anon_key: anon,
      supabase_service_role_key: service,
      project_ref: data.project_ref,
      oauth_access_token: row.access_token,
      oauth_refresh_token: row.refresh_token,
      oauth_expires_at: row.expires_at,
      created_by: context.userId,
    }).select().single();
    if (te) throw new Error(te.message);

    await supabaseAdmin.from("profiles").update({ tenant_slug: slug }).eq("id", row.target_user_id);
    await supabaseAdmin.from("supabase_oauth_states").delete().eq("state", data.state);

    return { tenant };
  });

/** Cancela e limpa um state pendente. */
export const cancelOAuthState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ state: z.string().min(10) }).parse(i))
  .handler(async ({ data, context }) => {
    ensureSuper(context);
    await supabaseAdmin.from("supabase_oauth_states")
      .delete().eq("state", data.state).eq("super_admin_id", context.userId);
    return { ok: true };
  });

// Re-export usado pelo route callback para validar o cookie sem expor helpers.
export function _readOauthStateCookie() {
  return getCookie("sb_oauth_state");
}
