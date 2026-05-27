import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Loader2, Database, Copy, Check, Download, ExternalLink, FileCode2 } from "lucide-react";
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
    enabled: !!user?.isSuperAdmin,
  });
  const { data: usuarios = [] } = useUsuarios();

  const [open, setOpen] = useState(false);
  const [schemaTenant, setSchemaTenant] = useState<any | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Conexão removida. O usuário verá o banco central no próximo login.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  if (!user?.isSuperAdmin) {
    return <div className="p-8 text-sm text-muted-foreground">Acesso restrito ao super-administrador (admin@loja.com).</div>;
  }

  return (
    <div>
      <PageHeader
        title="Supabase"
        description="Conecte clientes a bancos Supabase próprios usando um slug único."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setSchemaTenant({})} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <FileCode2 className="h-3.5 w-3.5" /> Schema SQL
            </button>
            <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              <Plus className="h-3.5 w-3.5" /> Nova conexão
            </button>
          </div>
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

      <NewTenantDialog open={open} onOpenChange={setOpen} usuarios={usuarios} onCreated={(t) => setSchemaTenant(t)} />
      <SchemaDialog tenant={schemaTenant} onClose={() => setSchemaTenant(null)} />
    </div>
  );
}

function SchemaDialog({ tenant, onClose }: { tenant: any | null; onClose: () => void }) {
  const [sql, setSql] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const open = !!tenant;

  useState(() => undefined);
  if (open && !sql) {
    fetch("/setup.sql").then((r) => r.text()).then(setSql).catch(() => setSql("-- erro ao carregar setup.sql"));
  }

  const supabaseUrl: string | undefined = tenant?.supabase_url;
  const projectRef = supabaseUrl?.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : "https://supabase.com/dashboard/project/_/sql/new";

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toast.success("SQL copiado. Cole no SQL Editor e execute.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Falha ao copiar. Use o botão Baixar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileCode2 className="h-4 w-4" /> Schema do banco (pré-requisito)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tenant?.slug
              ? <>Conexão criada para <code className="rounded bg-muted px-1 py-0.5 text-xs">/t/{tenant.slug}</code>. <b>Antes do primeiro login</b> do usuário, execute este SQL no Supabase do cliente.</>
              : <>Para que as queries funcionem no Supabase do cliente, o schema (tabelas, RLS, funções) precisa estar instalado. Execute o SQL abaixo no <b>SQL Editor</b> do projeto.</>}
            {" "}Não é possível rodar DDL via anon key — por isso é manual e único.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={sqlEditorUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir SQL Editor
            </a>
            <button type="button" onClick={copyAll} disabled={!sql} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar SQL completo"}
            </button>
            <a href="/setup.sql" download="setup.sql" className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> Baixar setup.sql
            </a>
          </div>
          <div className="rounded-md border bg-muted/30">
            <div className="border-b px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Prévia ({sql ? `${sql.split("\n").length} linhas` : "carregando…"})</div>
            <pre className="max-h-[320px] overflow-auto p-3 font-mono text-[11px] leading-relaxed">{sql || "carregando..."}</pre>
          </div>
          <ol className="rounded-md border bg-card p-3 text-xs text-muted-foreground space-y-1 list-decimal pl-6">
            <li>Abra o <b>SQL Editor</b> do projeto Supabase do cliente.</li>
            <li>Cole o SQL acima e clique em <b>Run</b>.</li>
            <li>No próximo login do usuário, o painel limpa e carrega do banco dele.</li>
          </ol>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Entendi</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>;
}

function NewTenantDialog({ open, onOpenChange, usuarios, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; usuarios: any[]; onCreated?: (tenant: any) => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createTenant);
  const [form, setForm] = useState({ user_id: "", slug: randomSlug(), nome: "", supabase_url: "", supabase_anon_key: "" });
  const [copied, setCopied] = useState(false);

  const m = useMutation({
    mutationFn: (input: typeof form) => createFn({ data: input }),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant conectado.");
      const payload = created && typeof created === "object" ? { ...form, ...created } : { ...form };
      onOpenChange(false);
      setForm({ user_id: "", slug: randomSlug(), nome: "", supabase_url: "", supabase_anon_key: "" });
      onCreated?.(payload);
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