// Proxy seguro: encaminha todas as requisições Supabase do tenant do usuário
// logado para o banco conectado, usando a service_role_key (server-only).
//
// Fluxo:
//   1. Browser cria um Supabase JS client apontando para /api/tenant
//   2. Cada chamada (.from, .rpc, .auth.getUser...) bate aqui com
//      header X-Lovable-Auth = access_token do usuário no banco CENTRAL
//   3. Validamos esse token no banco central (supabaseAdmin.auth.getUser)
//   4. Buscamos o tenant do usuário e proxyamos para
//      <tenant.url>/<path> com Authorization/apikey = service_role
//
// A service_role NUNCA sai do servidor. Tabelas permitidas: whitelist abaixo.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_TABLES = new Set<string>([
  "produtos", "categorias", "clientes", "fornecedores",
  "pedidos", "pedido_itens", "pedido_pagamentos",
  "estoque_movimentos", "caixa_sessoes", "caixa_movimentos",
  "contas", "despesas", "app_settings", "patrimonio",
  "product_images", "notificacoes", "faturamentos", "faturamento_pedidos",
  "nfe_entradas", "nfe_itens", "nfe_webhook_events",
  "gtin_global", "fidelidade_pontos",
  "audit_logs", "app_logs", "backups_log", "api_keys",
  "profiles", "user_roles",
]);

const HOP_BY_HOP = new Set([
  "host", "content-length", "connection", "transfer-encoding",
  "upgrade", "keep-alive", "te", "trailer", "proxy-authorization",
  // strip caller's Supabase auth — replaced by service_role
  "authorization", "apikey", "x-lovable-auth", "cookie",
]);

async function handle(request: Request, splat: string) {
  // 1. Validar usuário no banco central
  const userToken = request.headers.get("x-lovable-auth");
  if (!userToken) return new Response("Unauthorized", { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(userToken);
  if (userErr || !userData?.user) return new Response("Unauthorized", { status: 401 });
  const userId = userData.user.id;

  // 2. Buscar tenant do usuário
  const { data: tenant, error: te } = await supabaseAdmin
    .from("tenants")
    .select("supabase_url, supabase_service_role_key, slug")
    .eq("user_id", userId)
    .maybeSingle();
  if (te) return new Response(te.message, { status: 500 });
  if (!tenant) return new Response("Tenant not found", { status: 404 });
  if (!tenant.supabase_service_role_key) {
    return new Response(
      "Service role key missing — peça ao administrador para atualizar a conexão Supabase.",
      { status: 412 }
    );
  }

  // 3. Whitelist de tabelas
  const tableMatch = splat.match(/^rest\/v1\/([a-zA-Z0-9_]+)/);
  if (tableMatch && !ALLOWED_TABLES.has(tableMatch[1])) {
    return new Response(`Table not allowed: ${tableMatch[1]}`, { status: 403 });
  }

  // 4. Montar URL alvo
  const incoming = new URL(request.url);
  const base = tenant.supabase_url.replace(/\/$/, "");
  const target = `${base}/${splat}${incoming.search}`;

  // 5. Cabeçalhos
  const fwd = new Headers();
  for (const [k, v] of request.headers.entries()) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    fwd.set(k, v);
  }
  fwd.set("Authorization", `Bearer ${tenant.supabase_service_role_key}`);
  fwd.set("apikey", tenant.supabase_service_role_key);

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(target, { method, headers: fwd, body });

  // 6. Repassar resposta (incluindo content-type, content-range etc)
  const respHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (HOP_BY_HOP.has(k.toLowerCase())) return;
    respHeaders.set(k, v);
  });
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

export const Route = createFileRoute("/api/tenant/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => handle(request, params._splat ?? ""),
      POST: ({ request, params }) => handle(request, params._splat ?? ""),
      PUT: ({ request, params }) => handle(request, params._splat ?? ""),
      PATCH: ({ request, params }) => handle(request, params._splat ?? ""),
      DELETE: ({ request, params }) => handle(request, params._splat ?? ""),
      HEAD: ({ request, params }) => handle(request, params._splat ?? ""),
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});