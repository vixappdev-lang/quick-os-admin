import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useUsuarios } from "@/lib/queries";
import { createUser, deleteUser } from "@/lib/admin-users.functions";
import { setUserPermissions } from "@/lib/tenants.functions";
import { useUserPermissions, MENU_KEYS, MENU_LABEL } from "@/lib/permissions";

// Menus que NUNCA podem ser concedidos a vendedor/operador
const ADMIN_ONLY_MENUS = new Set<string>(["/supabase", "/usuarios", "/configuracoes", "/financeiro", "/caixa"]);
// Menus que vendedor recebe automaticamente (não editáveis)
const VENDEDOR_FIXED = new Set<string>(["/", "/pdv", "/pedidos", "/clientes"]);
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — LyneCloud" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { user: me } = useAuth();
  const { data: usuarios = [], isLoading } = useUsuarios();
  const [open, setOpen] = useState(false);
  const [permFor, setPermFor] = useState<any | null>(null);
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const deleteFn = useServerFn(deleteUser);

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); toast.success("Usuário removido"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const isAdmin = me?.role === "admin";
  const isSuper = !!me?.isSuperAdmin;

  return (
    <div>
      <PageHeader
        title="Usuários"
        description={`${usuarios.length} usuário(s) cadastrado(s)`}
        actions={
          isAdmin ? (
            <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              <Plus className="h-3.5 w-3.5" /> Novo usuário
            </button>
          ) : null
        }
      />
      <SectionCard padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Função</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Criado</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!isLoading && usuarios.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nenhum usuário</td></tr>
              )}
              {usuarios.map((u: any) => (
                <tr key={u.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {(u.nome || u.email || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.nome}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(u.roles || []).map((r: string) => (
                        <span key={r} className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        {isSuper && (
                          <button
                            onClick={() => setPermFor(u)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            aria-label="Permissões"
                            title="Permissões de menu"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {u.id !== me?.id && (
                          <button
                            onClick={() => { if (confirm(`Remover ${u.nome}?`)) del.mutate(u.id); }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <NewUserDialog open={open} onOpenChange={setOpen} createFn={createFn} />
      <PermissionsDialog user={permFor} onClose={() => setPermFor(null)} />
    </div>
  );
}

function PermissionsDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const setFn = useServerFn(setUserPermissions);
  const { data } = useUserPermissions(user?.id);
  const [state, setState] = useState<Record<string, boolean>>({});

  const userRole = (user?.roles?.[0] ?? "operador") as string;
  const isVendedor = userRole === "vendedor";
  const isAdminUser = userRole === "admin";

  // Filtra os menus disponíveis conforme o papel do usuário
  const visibleMenus = useMemo<string[]>(() => {
    if (isVendedor) return (MENU_KEYS as readonly string[]).filter((k) => VENDEDOR_FIXED.has(k));
    return (MENU_KEYS as readonly string[]).filter((k) => !ADMIN_ONLY_MENUS.has(k) || isAdminUser);
  }, [isVendedor, isAdminUser]);

  useEffect(() => {
    if (!user) { setState({}); return; }
    const m: Record<string, boolean> = {};
    visibleMenus.forEach((k) => (m[k] = true));
    (data ?? []).forEach((r: any) => (m[r.menu] = r.allowed));
    setState(m);
  }, [user?.id, data, visibleMenus]);

  const m = useMutation({
    mutationFn: () => setFn({
      data: {
        user_id: user!.id,
        permissions: visibleMenus.map((k) => ({ menu: k, allowed: state[k] ?? true })),
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_permissions"] });
      toast.success("Permissões salvas");
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões — {user?.nome}</DialogTitle>
        </DialogHeader>
        {isVendedor && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <p className="font-semibold text-foreground">Acesso de vendedor</p>
            <p className="mt-1 text-muted-foreground">Vendedores têm acesso fixo apenas a Dashboard, PDV, Pedidos (próprios) e Clientes. Menus administrativos (Supabase, Usuários, Configurações, Financeiro, Caixa) são bloqueados por segurança.</p>
          </div>
        )}
        <div className="grid max-h-[60vh] grid-cols-1 gap-1 overflow-y-auto pr-1">
          {visibleMenus.map((k) => (
            <label key={k} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
              <span>{MENU_LABEL[k] ?? k}</span>
              <input
                type="checkbox"
                checked={state[k] ?? true}
                disabled={isVendedor}
                onChange={(e) => setState({ ...state, [k]: e.target.checked })}
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
          <button type="button" onClick={() => m.mutate()} disabled={m.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewUserDialog({ open, onOpenChange, createFn }: { open: boolean; onOpenChange: (o: boolean) => void; createFn: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", email: "", password: "", role: "vendedor" as "admin" | "vendedor" });
  const m = useMutation({
    mutationFn: (input: typeof form) => createFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário criado");
      onOpenChange(false);
      setForm({ nome: "", email: "", password: "", role: "vendedor" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(form); }} className="space-y-3">
          <Field label="Nome">
            <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Senha (mínimo 6)">
            <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
          </Field>
          <Field label="Tipo de acesso">
            <div className="grid grid-cols-2 gap-2">
              {(["admin", "vendedor"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={
                    "rounded-md border p-3 text-left text-sm transition-colors " +
                    (form.role === r ? "border-primary bg-primary/5 text-foreground" : "border-input hover:bg-muted")
                  }
                >
                  <p className="font-semibold capitalize">{r}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {r === "admin" ? "Acesso total ao sistema" : "Painel mobile: criar e listar pedidos"}
                  </p>
                </button>
              ))}
            </div>
          </Field>
          <DialogFooter className="mt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={m.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar usuário
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}
