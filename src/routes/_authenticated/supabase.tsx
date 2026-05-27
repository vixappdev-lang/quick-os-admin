import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Loader2, Database, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useUsuarios } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { listTenants, createTenant, deleteTenant } from "@/lib/tenants.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/supabase")({
  head: () => ({ meta: [{ title: "Supabase — Quick OS" }] }),
  component: SupabasePage,
});

function randomSlug() {
  return Math.random().toString(36).slice(2, 8);
}

function SupabasePage() {
  const { user } = useAuth();
  const listFn = useServerFn(listTenants);
  const deleteFn = useServerFn(deleteTenant);
  const qc = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => listFn(),
    enabled: user?.role === "admin",
  });
  const { data: usuarios = [] } = useUsuarios();

  const [open, setOpen] = useState(false);
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  if (user?.role !== "admin") {
    return <div className="p-8 text-sm text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Supabase"
        description="Conecte clientes a bancos Supabase próprios usando um slug único."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
            <Plus className="h-3.5 w-3.5" /> Nova conexão
          </button>
        }
      />
      <SectionCard padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <Th>Slug</Th>
                <Th>Cliente</Th>
                <Th>URL Supabase</Th>
                <Th>Criado</Th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>}
              {!isLoading && tenants.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhum tenant cadastrado</td></tr>}
              {tenants.map((t: any) => {
                const u = usuarios.find((x: any) => x.id === t.user_id);
                return (
                  <tr key={t.id} className="border-b">
                    <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">/t/{t.slug}</code></td>
                    <td className="px-4 py-3">{u?.nome || t.nome || <span className="text-muted-foreground">—</span>}<div className="text-xs text-muted-foreground">{u?.email}</div></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[280px]">{t.supabase_url}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => confirm("Remover tenant?") && del.mutate(t.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <NewTenantDialog open={open} onOpenChange={setOpen} usuarios={usuarios} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>;
}

function NewTenantDialog({ open, onOpenChange, usuarios }: { open: boolean; onOpenChange: (o: boolean) => void; usuarios: any[] }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createTenant);
  const [form, setForm] = useState({ user_id: "", slug: randomSlug(), nome: "", supabase_url: "", supabase_anon_key: "" });
  const [copied, setCopied] = useState(false);

  const m = useMutation({
    mutationFn: (input: typeof form) => createFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant conectado");
      onOpenChange(false);
      setForm({ user_id: "", slug: randomSlug(), nome: "", supabase_url: "", supabase_anon_key: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const copySlug = () => { navigator.clipboard.writeText(form.slug); setCopied(true); setTimeout(() => setCopied(false), 1200); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Conectar novo Supabase</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(form); }} className="space-y-3">
          <Field label="Usuário (dono do tenant)">
            <select required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="input">
              <option value="">— selecione —</option>
              {usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nome} — {u.email}</option>)}
            </select>
          </Field>
          <Field label="Slug (URL: /t/<slug>)">
            <div className="flex gap-2">
              <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} pattern="[a-z0-9]{3,24}" className="input flex-1 font-mono" />
              <button type="button" onClick={() => setForm({ ...form, slug: randomSlug() })} className="h-9 rounded-md border bg-card px-3 text-xs hover:bg-muted">Gerar</button>
              <button type="button" onClick={copySlug} className="h-9 rounded-md border bg-card px-2 hover:bg-muted">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
            </div>
          </Field>
          <Field label="Nome (opcional)">
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" placeholder="Comércio do João" />
          </Field>
          <Field label="Supabase URL">
            <input required type="url" value={form.supabase_url} onChange={(e) => setForm({ ...form, supabase_url: e.target.value })} className="input" placeholder="https://xxxx.supabase.co" />
          </Field>
          <Field label="Anon Key (publishable)">
            <textarea required value={form.supabase_anon_key} onChange={(e) => setForm({ ...form, supabase_anon_key: e.target.value })} className="input min-h-[80px] py-2 font-mono text-[11px]" />
          </Field>
          <DialogFooter className="mt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={m.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar conexão
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