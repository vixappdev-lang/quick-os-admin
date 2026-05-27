import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (!(data ?? []).some((r: any) => r.role === "admin")) throw new Error("Apenas administradores");
}

const CreateTenantSchema = z.object({
  user_id: z.string().uuid(),
  slug: z.string().min(3).max(24).regex(/^[a-z0-9]+$/, "Use apenas letras minúsculas e números"),
  nome: z.string().max(80).optional().nullable(),
  supabase_url: z.string().url(),
  supabase_anon_key: z.string().min(20),
});

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CreateTenantSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // 1) cria tenant
    const { data: t, error } = await supabaseAdmin
      .from("tenants")
      .insert({
        user_id: data.user_id,
        slug: data.slug,
        nome: data.nome ?? null,
        supabase_url: data.supabase_url,
        supabase_anon_key: data.supabase_anon_key,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // 2) atualiza profile.tenant_slug
    await supabaseAdmin.from("profiles").update({ tenant_slug: data.slug }).eq("id", data.user_id);
    return { tenant: t };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, nome, supabase_url, user_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const PermSchema = z.object({
  user_id: z.string().uuid(),
  permissions: z.array(z.object({ menu: z.string().min(1).max(40), allowed: z.boolean() })),
});

export const setUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => PermSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // apaga e re-insere as fornecidas
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.user_id);
    if (data.permissions.length) {
      const rows = data.permissions.map((p) => ({
        user_id: data.user_id,
        menu: p.menu,
        allowed: p.allowed,
      }));
      const { error } = await supabaseAdmin.from("user_permissions").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });