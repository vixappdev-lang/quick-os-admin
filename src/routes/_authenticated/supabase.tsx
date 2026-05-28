import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Database, Copy, Check, Download, ExternalLink, FileCode2, Eye, Radio, Pencil, Shield, Search, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useUsuarios } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { listTenants, createTenant, deleteTenant } from "@/lib/tenants.functions";
import { getSchemaIssues, getSchemaIssuesBySlug, clearSchemaIssues, type SchemaIssue } from "@/lib/schema-errors";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/supabase")({
  head: () => ({ meta: [{ title: "Supabase — LyneCloud" }] }),
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
  const [viewTenant, setViewTenant] = useState<any | null>(null);
  const [trackTenant, setTrackTenant] = useState<any | null>(null);
  const [issues, setIssues] = useState<SchemaIssue[]>(() => getSchemaIssues());
  useEffect(() => {
    const h = () => setIssues(getSchemaIssues());
    window.addEventListener("schema-errors-changed", h);
    return () => window.removeEventListener("schema-errors-changed", h);
  }, []);
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

  const mainUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
  const mainProject = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "—";

  const mainTenant = {
    id: "__main__",
    slug: "principal",
    nome: "Lovable Cloud (banco principal)",
    supabase_url: mainUrl,
    project_ref: mainProject,
    created_at: new Date(0).toISOString(),
    isMain: true,
  };

  const issuesOf = (slug: string) => issues.filter((i) => i.slug === slug);

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

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Conexões ativas" value={String(tenants.length + 1)} hint="incluindo principal" />
        <StatCard label="Banco principal" value="Lovable Cloud" hint="gerenciado" />
        <StatCard label="Clientes conectados" value={String(tenants.length)} hint="tenants externos" />
        <StatCard label="Sua função" value="Super-admin" hint="acesso total" />
      </div>

      {/* Desktop table */}
      <SectionCard padded={false}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <Th>Slug</Th>
                <Th>Cliente / nome</Th>
                <Th>URL</Th>
                <Th>Criado</Th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody>
              {/* Linha fixa do banco principal */}
              <tr className="border-b bg-primary/5 hover:bg-primary/10 transition-colors">
                <td className="px-4 py-3">
                  <code className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">/t/principal</code>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold">Lovable Cloud</span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">ATUAL</span>
                    {issuesOf("principal").length > 0 && <PendingBadge n={issuesOf("principal").length} />}
                  </div>
                  <div className="text-xs text-muted-foreground">Banco gerenciado — onde tudo é salvo por padrão</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[280px]">{mainUrl || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">gerenciado</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Ver" onClick={() => setViewTenant(mainTenant)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="SQL de correção" highlight={issuesOf("principal").length > 0} onClick={() => setSchemaTenant(mainTenant)}><FileCode2 className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Rastrear em tempo real" onClick={() => setTrackTenant(mainTenant)}><Radio className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                </td>
              </tr>
              {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>}
              {!isLoading && tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum tenant adicional</p>
                    <p className="mt-1 text-xs text-muted-foreground">Clique em "Nova conexão" para conectar o banco de um cliente.</p>
                  </td>
                </tr>
              )}
              {tenants.map((t: any) => {
                const u = usuarios.find((x: any) => x.id === t.user_id);
                const tIssues = issuesOf(t.slug);
                return (
                  <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">/t/{t.slug}</code></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-medium">{u?.nome || t.nome || "—"}</span>
                        {tIssues.length > 0 && <PendingBadge n={tIssues.length} />}
                      </div>
                      <div className="ml-4 text-xs text-muted-foreground">{u?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[280px]">{t.supabase_url}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Ver" onClick={() => setViewTenant({ ...t, _user: u })}><Eye className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="SQL de correção" highlight={tIssues.length > 0} onClick={() => setSchemaTenant(t)}><FileCode2 className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Rastrear" onClick={() => setTrackTenant(t)}><Radio className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn danger title="Remover" onClick={() => confirm("Remover tenant?") && del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          <MobileRow t={mainTenant} main onView={() => setViewTenant(mainTenant)} onTrack={() => setTrackTenant(mainTenant)} onSchema={() => setSchemaTenant(mainTenant)} />
          {tenants.map((t: any) => {
            const u = usuarios.find((x: any) => x.id === t.user_id);
            return (
              <MobileRow
                key={t.id}
                t={{ ...t, _user: u }}
                onView={() => setViewTenant({ ...t, _user: u })}
                onTrack={() => setTrackTenant(t)}
                onSchema={() => setSchemaTenant(t)}
                onDelete={() => confirm("Remover tenant?") && del.mutate(t.id)}
              />
            );
          })}
        </div>
      </SectionCard>

      <NewTenantDialog open={open} onOpenChange={setOpen} usuarios={usuarios} onCreated={(t) => setSchemaTenant(t)} />
      <SchemaDialog tenant={schemaTenant} onClose={() => setSchemaTenant(null)} />
      <ViewTenantDialog tenant={viewTenant} onClose={() => setViewTenant(null)} />
      <TrackTenantDialog tenant={trackTenant} onClose={() => setTrackTenant(null)} />
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled, danger, highlight }: { children: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean; danger?: boolean; highlight?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "hover:bg-destructive/10 hover:text-destructive" : ""} ${highlight ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700" : ""}`}
    >
      {children}
      {highlight && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card" />}
    </button>
  );
}

function PendingBadge({ n }: { n: number }) {
  return (
    <span title={`${n} erro(s) de schema detectado(s)`} className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3 w-3" /> Correção pendente
    </span>
  );
}

function MobileRow({ t, main, onView, onTrack, onSchema, onDelete }: { t: any; main?: boolean; onView: () => void; onTrack: () => void; onSchema?: () => void; onDelete?: () => void }) {
  return (
    <div className={`p-3 ${main ? "bg-primary/5" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">/t/{t.slug}</code>
            {main && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">ATUAL</span>}
          </div>
          <p className="mt-1.5 text-sm font-medium">{main ? "Lovable Cloud" : (t._user?.nome ?? t.nome ?? "—")}</p>
          {!main && <p className="text-[11px] text-muted-foreground">{t._user?.email}</p>}
          <p className="mt-1 text-[10px] text-muted-foreground truncate">{t.supabase_url}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        <button onClick={onView} className="flex-1 h-8 rounded-md border bg-card text-xs hover:bg-muted">Ver</button>
        <button onClick={onTrack} className="flex-1 h-8 rounded-md border bg-card text-xs hover:bg-muted">Rastrear</button>
        {onSchema && <button onClick={onSchema} className="h-8 rounded-md border bg-card px-2 text-xs hover:bg-muted">SQL</button>}
        {onDelete && <button onClick={onDelete} className="h-8 rounded-md border bg-card px-2 text-xs text-destructive hover:bg-destructive/10">×</button>}
      </div>
    </div>
  );
}

function ViewTenantDialog({ tenant, onClose }: { tenant: any | null; onClose: () => void }) {
  if (!tenant) return null;
  const projectRef = tenant.supabase_url?.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? tenant.project_ref ?? "—";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Detalhes da conexão</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {tenant.isMain && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Banco principal (gerenciado)</p>
              <p className="mt-1 text-muted-foreground">Este é o backend Lovable Cloud que armazena os dados padrão do sistema. Não pode ser editado nem removido.</p>
            </div>
          )}
          <Row label="Slug" value={`/t/${tenant.slug}`} mono />
          {tenant._user && <Row label="Cliente" value={`${tenant._user.nome} (${tenant._user.email})`} />}
          <Row label="Project Ref" value={projectRef} mono />
          <Row label="URL" value={tenant.supabase_url ?? "—"} mono />
          {!tenant.isMain && <Row label="Anon Key" value="••••••••••• (mascarada)" mono />}
          {!tenant.isMain && <Row label="Criado em" value={new Date(tenant.created_at).toLocaleString("pt-BR")} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrackTenantDialog({ tenant, onClose }: { tenant: any | null; onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [ip, setIp] = useState<string>("");
  useEffect(() => {
    if (!tenant) return;
    fetch("https://api.ipify.org?format=json").then((r) => r.json()).then((j) => setIp(j.ip)).catch(() => setIp("—"));
    // tempo real só funciona no banco central (publication ativo lá)
    const ch = (window as any).__supabaseDefault?.channel?.("ten_track") ?? null;
    // usa o cliente padrão importado abaixo
    return () => { if (ch) ch.unsubscribe?.(); };
  }, [tenant]);
  if (!tenant) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Radio className="h-4 w-4 text-emerald-500" /> Rastreamento em tempo real</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-xs">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Banco</p><p className="font-mono">{tenant.slug}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seu IP atual</p><p className="font-mono">{ip || "carregando…"}</p></div>
          </div>
          <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Capturando logins, alterações de dados e webhooks em tempo real
            </p>
            <p>Veja o feed completo em <a href="/configuracoes" className="text-primary underline">Configurações → Logs</a> — filtros por categoria, IP e usuário.</p>
          </div>
          {events.length > 0 && (
            <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 text-[10px]">{JSON.stringify(events, null, 2)}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`break-all text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function SchemaDialog({ tenant, onClose }: { tenant: any | null; onClose: () => void }) {
  const [sql, setSql] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const open = !!tenant;

  useEffect(() => {
    if (!open || sql) return;
    fetch("/setup.sql").then((r) => r.text()).then(setSql).catch(() => setSql("-- erro ao carregar setup.sql"));
  }, [open, sql]);

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
            <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Prévia ({sql ? `${sql.split("\n").length} linhas` : "carregando…"})
                {query && sql ? (() => {
                  const matches = (sql.toLowerCase().match(new RegExp(query.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
                  return <span className="ml-2 normal-case tracking-normal text-primary">{matches} ocorrência(s)</span>;
                })() : null}
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar no SQL…"
                  className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <pre className="max-h-[320px] overflow-auto p-3 font-mono text-[11px] leading-relaxed">
              {sql ? renderHighlighted(sql, query) : "carregando..."}
            </pre>
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

function renderHighlighted(text: string, query: string) {
  if (!query) return text;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="rounded bg-primary/30 px-0.5 text-foreground">{p}</mark>
      : <span key={i}>{p}</span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold truncate">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
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