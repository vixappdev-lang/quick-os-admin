import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

export async function authenticateApiKey(request: Request) {
  const header =
    request.headers.get("authorization") ?? request.headers.get("x-api-key") ?? "";
  const raw = header.replace(/^Bearer\s+/i, "").trim();
  if (!raw || !raw.startsWith("qos_")) return null;
  const prefix = raw.split(".")[0];
  const hash = createHash("sha256").update(raw).digest("hex");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id, ativo, prefix, key_hash, expires_at, usage_count, scopes")
    .eq("prefix", prefix)
    .maybeSingle();
  if (!data || !data.ativo || data.key_hash !== hash) return null;
  if ((data as any).expires_at && new Date((data as any).expires_at).getTime() < Date.now()) return null;
  await supabaseAdmin
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: ((data as any).usage_count ?? 0) + 1,
    } as any)
    .eq("id", data.id);
  return { keyId: data.id, scopes: ((data as any).scopes as string[]) ?? ["read", "write"] };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export function unauthorized() {
  return json({ error: "Invalid or missing API key" }, 401);
}