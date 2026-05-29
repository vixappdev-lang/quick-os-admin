import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateSchema = z.object({
  nome: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(["admin", "vendedor"]),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Only admins can create users
    const { data: callerRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (callerRoles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas administradores podem criar usuários");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome, created_by_admin: context.userId },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    // Garante que o profile fique vinculado ao admin que criou.
    await supabaseAdmin
      .from("profiles")
      .update({ created_by_admin: context.userId })
      .eq("id", newId);

    // Profile is auto-created by handle_new_user trigger.
    // Default role inserted by trigger is 'operador' — replace with chosen role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: re } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (re) throw new Error(re.message);

    return { id: newId, email: data.email };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: callerRoles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!(callerRoles ?? []).some((r) => r.role === "admin"))
      throw new Error("Apenas administradores podem remover usuários");
    if (data.id === context.userId) throw new Error("Você não pode remover a si mesmo");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });