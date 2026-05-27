import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash, randomBytes } from "crypto";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin =
      (context.claims as any)?.user_roles?.includes?.("admin") ?? false;
    if (!isAdmin) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      if (!roles?.some((r: any) => r.role === "admin"))
        throw new Error("Apenas administradores");
    }
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, nome, prefix, ativo, last_used_at, created_at, scopes, expires_at, usage_count, descricao")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      nome: z.string().min(2).max(80),
      descricao: z.string().max(240).optional().nullable(),
      scopes: z.array(z.enum(["read", "write"])).min(1).default(["read", "write"]),
      expires_at: z.string().datetime().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r: any) => r.role === "admin"))
      throw new Error("Apenas administradores");
    const raw = randomBytes(24).toString("base64url");
    const prefix = "qos_" + raw.slice(0, 8);
    const key = prefix + "." + randomBytes(24).toString("base64url");
    const key_hash = hashKey(key);
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        nome: data.nome,
        descricao: data.descricao ?? null,
        prefix,
        key_hash,
        created_by: context.userId,
        scopes: data.scopes,
        expires_at: data.expires_at ?? null,
      } as any)
      .select("id, nome, prefix, ativo, created_at, scopes, expires_at, descricao")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, key };
  });

export const toggleApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r: any) => r.role === "admin"))
      throw new Error("Apenas administradores");
    const { error } = await supabaseAdmin
      .from("api_keys").update({ ativo: data.ativo }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r: any) => r.role === "admin"))
      throw new Error("Apenas administradores");
    const { error } = await supabaseAdmin.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });