import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { BackupTab } from "@/components/backup-tab";
import {
  useAppSettings,
  useUpdateAppSettings,
  useAppLogs,
  useNfeWebhookEvents,
  LOG_CATEGORIAS,
  type LogCategoria,
  NFEIO_EVENTOS,
} from "@/lib/queries";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Copy, ShieldCheck, Activity, FileText, Plug } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { validateNfeio, validateBrasilnfe } from "@/lib/nfeio.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | LyneCloud" }] }),
  component: ConfiguracoesPage,
});

const PAYMENT_LABELS: Record<string, string> = { pix: "PIX", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", nota_promissoria: "Nota promissória", cheque: "Cheque", outro: "Outro" };
const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function ConfiguracoesPage() {
  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const [empresa, setEmpresa] = useState({ razao: "", cnpj: "", ie: "", telefone: "", email: "", endereco: "" });

  const paymentMap = useMemo<Record<string, boolean>>(() => ({ pix: true, credito: true, debito: true, dinheiro: true, nota_promissoria: true, cheque: false, outro: false, ...((settings?.metodos_pagamento ?? {}) as Record<string, boolean>) }), [settings]);

  const requiredOk = !!(settings?.empresa_razao && settings?.empresa_cnpj && settings?.empresa_ie && settings?.empresa_telefone && settings?.empresa_email && settings?.empresa_endereco);

  const saveEmpresa = async () => {
    try {
      await updateSettings.mutateAsync({
        empresa_razao: empresa.razao || settings?.empresa_razao || null,
        empresa_cnpj: empresa.cnpj || settings?.empresa_cnpj || null,
        empresa_ie: empresa.ie || settings?.empresa_ie || null,
        empresa_telefone: empresa.telefone || settings?.empresa_telefone || null,
        empresa_email: empresa.email || settings?.empresa_email || null,
        empresa_endereco: empresa.endereco || settings?.empresa_endereco || null,
      } as any);
      toast.success("Dados da empresa salvos");
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  const patchSettings = async (patch: any, msg = "Configuração salva") => {
    try { await updateSettings.mutateAsync(patch); toast.success(msg); }
    catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências da empresa e do sistema" />
      {!requiredOk && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-foreground">Dados da empresa obrigatórios</p>
            <p className="text-xs text-muted-foreground">Preencha <b>razão social, CNPJ, IE, telefone, e-mail e endereço</b> para emitir notas e faturar pedidos.</p>
          </div>
        </div>
      )}
      <Tabs defaultValue="empresa">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="pdv">PDV</TabsTrigger>
          <TabsTrigger value="nfe">Integrações</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="impressao">Impressão</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="tema">Tema</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa" className="mt-4">
          <SectionCard title="Dados da empresa" actions={<div className="flex items-center gap-3">{requiredOk && <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Completo</span>}<button onClick={saveEmpresa} disabled={updateSettings.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">Salvar</button></div>}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-medium">Razão social *</label><input defaultValue={settings?.empresa_razao ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, razao: e.target.value }))} className={inp} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">CNPJ *</label><input defaultValue={settings?.empresa_cnpj ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, cnpj: e.target.value }))} className={inp} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Inscrição Estadual (IE) *</label><input defaultValue={settings?.empresa_ie ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, ie: e.target.value }))} className={inp} placeholder="000.000.000.000" /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Telefone *</label><input defaultValue={settings?.empresa_telefone ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, telefone: e.target.value }))} className={inp} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Email *</label><input defaultValue={settings?.empresa_email ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, email: e.target.value }))} className={inp} /></div>
              <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-medium">Endereço *</label><input defaultValue={settings?.empresa_endereco ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, endereco: e.target.value }))} className={inp} /></div>
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="pdv" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <SectionCard title="Status do PDV" description="Controla se a tela de vendas pode ser usada">
              <ToggleRow label="PDV ativo" description="Quando desativado, a tela fica bloqueada com aviso em vidro." checked={settings?.pdv_ativo !== false} onCheckedChange={(checked) => patchSettings({ pdv_ativo: checked }, checked ? "PDV ativado" : "PDV desativado")} />
            </SectionCard>
            <SectionCard title="Métodos de pagamento" description="Afeta Novo pedido e PDV">
              <div className="space-y-2">
                {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                  <ToggleRow key={key} label={label} checked={paymentMap[key] !== false} onCheckedChange={(checked) => patchSettings({ metodos_pagamento: { ...paymentMap, [key]: checked } }, `${label} ${checked ? "ativado" : "desativado"}`)} />
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="impressao" className="mt-4"><SectionCard title="Impressora térmica"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-xs font-medium">Modelo</label><select className={inp}><option>Bematech MP-4200 TH</option><option>Epson TM-T20</option></select></div><div><label className="mb-1.5 block text-xs font-medium">Largura</label><select className={inp}><option>80mm</option><option>58mm</option></select></div></div></SectionCard></TabsContent>
        <TabsContent value="api" className="mt-4"><ApiKeysPanel /></TabsContent>
        <TabsContent value="backup" className="mt-4"><BackupTab /></TabsContent>
        <TabsContent value="tema" className="mt-4"><SectionCard title="Aparência"><ToggleRow label="Modo escuro" /></SectionCard></TabsContent>
        <TabsContent value="nfe" className="mt-4"><NfeTab /></TabsContent>
        <TabsContent value="logs" className="mt-4"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }: { label: string; description?: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-md border bg-card px-4 py-3"><span><span className="block text-sm font-medium">{label}</span>{description && <span className="block text-xs text-muted-foreground">{description}</span>}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>;
}

// ============================ Integrações (NF-e + futuros) ============================
function NfeTab() {
  const { data: settings } = useAppSettings();
  const update = useUpdateAppSettings();
  const validate = useServerFn(validateNfeio);
  const validateBn = useServerFn(validateBrasilnfe);
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [env, setEnv] = useState<"Development" | "Production">("Production");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [bnOpen, setBnOpen] = useState(false);
  const [nfeioOpen, setNfeioOpen] = useState(false);
  const [bnUser, setBnUser] = useState("");
  const [bnCompany, setBnCompany] = useState("");
  const [bnEnv, setBnEnv] = useState<"Development" | "Production">("Production");

  useEffect(() => {
    if (!settings) return;
    setApiKey((settings as any).nfeio_api_key ?? "");
    setCompanyId((settings as any).nfeio_company_id ?? "");
    setEnv(((settings as any).nfeio_environment as any) ?? "Production");
    setSecret((settings as any).nfeio_webhook_secret ?? "");
    setEvents(((settings as any).nfeio_webhook_events as any) ?? {});
    setBnUser((settings as any).brasilnfe_user_token ?? "");
    setBnCompany((settings as any).brasilnfe_company_token ?? "");
    setBnEnv(((settings as any).brasilnfe_environment as any) ?? "Production");
  }, [settings]);

  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "";
  const webhookUrl = useMemo(() => {
    if (typeof window !== "undefined") return `${window.location.origin}/api/public/nfeio-webhook`;
    return `/api/public/nfeio-webhook`;
  }, [projectId]);

  const genSecret = () => {
    const arr = new Uint8Array(24);
    (globalThis.crypto ?? (window as any).crypto).getRandomValues(arr);
    const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    setSecret(hex);
  };

  const copy = (txt: string) => {
    navigator.clipboard?.writeText(txt);
    toast.success("Copiado");
  };

  const salvar = async () => {
    if (!apiKey || !companyId) return toast.error("Preencha API Key e Company ID");
    setBusy(true);
    try {
      const r = await validate({ data: { apiKey, companyId, environment: env } });
      if (!(r as any).ok) {
        toast.error(`Validação falhou: ${(r as any).error}`);
        return;
      }
      await update.mutateAsync({
        nfeio_api_key: apiKey,
        nfeio_company_id: companyId,
        nfeio_environment: env,
        nfeio_webhook_secret: secret || null,
        nfeio_webhook_events: events,
        nfeio_validated_at: new Date().toISOString(),
      } as any);
      toast.success(`Validado ✓ ${(r as any).company?.name ?? ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const isOk = !!(settings as any)?.nfeio_validated_at;
  const bnOk = !!(settings as any)?.brasilnfe_validated_at;
  const provider = (settings as any)?.nfe_provider ?? "nfeio";
  const conectado = (provider === "nfeio" && isOk) || (provider === "brasilnfe" && bnOk);

  const saveBrasilnfe = async () => {
    if (!bnUser || !bnCompany) return toast.error("Preencha UserToken e Token da empresa");
    setBusy(true);
    try {
      const r = await validateBn({ data: { userToken: bnUser, companyToken: bnCompany, environment: bnEnv } });
      if (!(r as any).ok) { toast.error(`Validação falhou: ${(r as any).error}`); return; }
      await update.mutateAsync({
        nfe_provider: "brasilnfe",
        brasilnfe_user_token: bnUser,
        brasilnfe_company_token: bnCompany,
        brasilnfe_environment: bnEnv,
        brasilnfe_validated_at: new Date().toISOString(),
      } as any);
      toast.success(`Brasil NFe validado ✓ ${(r as any).company?.name ?? ""}`);
      setBnOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* Grid uniforme de integrações */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          icon={<FileText className="h-5 w-5" />}
          title="NF-e"
          description="Nota Fiscal Eletrônica (Modelo 55) — emissão automática nos pedidos faturados."
          status={conectado ? (provider === "brasilnfe" ? "Brasil NFe" : "nfe.io") : null}
          onClick={() => setChooserOpen(true)}
        />
        <IntegrationPlaceholder icon={<Plug className="h-5 w-5" />} title="WhatsApp" />
        <IntegrationPlaceholder icon={<Plug className="h-5 w-5" />} title="E-mail (SMTP)" />
      </div>

      {/* Chooser modal */}
      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Conectar NF-e</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Selecione o provedor que sua empresa usa. Os dados ficam salvos para emissão automática.</p>
          <div className="mt-3 grid gap-2">
            <button onClick={() => { setChooserOpen(false); setNfeioOpen(true); }} className="flex items-center justify-between rounded-md border bg-card p-3 text-left hover:bg-muted">
              <div>
                <p className="text-sm font-semibold">nfe.io</p>
                <p className="text-[11px] text-muted-foreground">API Key + Company ID</p>
              </div>
              {isOk && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </button>
            <button onClick={() => { setChooserOpen(false); setBnOpen(true); }} className="flex items-center justify-between rounded-md border bg-card p-3 text-left hover:bg-muted">
              <div>
                <p className="text-sm font-semibold">Brasil NFe</p>
                <p className="text-[11px] text-muted-foreground">UserToken + Token da empresa · brasilnfe.com.br</p>
              </div>
              {bnOk && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Brasil NFe modal */}
      <Dialog open={bnOpen} onOpenChange={setBnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Conectar Brasil NFe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">UserToken *</label>
              <input value={bnUser} onChange={(e) => setBnUser(e.target.value)} placeholder="Token do usuário" className={inp + " font-mono"} />
              <p className="mt-1 text-[11px] text-muted-foreground">Painel Brasil NFe → Conta → Tokens.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Token da empresa *</label>
              <input value={bnCompany} onChange={(e) => setBnCompany(e.target.value)} placeholder="Token da empresa cadastrada" className={inp + " font-mono"} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Ambiente</label>
              <select value={bnEnv} onChange={(e) => setBnEnv(e.target.value as any)} className={inp}>
                <option value="Development">Homologação</option>
                <option value="Production">Produção</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBnOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={saveBrasilnfe} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar e validar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* nfe.io configuration modal */}
      <Dialog open={nfeioOpen} onOpenChange={setNfeioOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Conectar nfe.io
              {isOk && <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"><ShieldCheck className="h-3 w-3" /> Validado</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium">API Key (Authorization) *</label>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key gerada no painel nfe.io" className={inp + " font-mono"} />
                <p className="mt-1 text-[11px] text-muted-foreground">Painel nfe.io → Configurações → Chaves de API.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Company ID *</label>
                <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="Ex.: 5f8f8d8c8c8c8c8c8c8c8c8c" className={inp + " font-mono"} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Ambiente *</label>
                <select value={env} onChange={(e) => setEnv(e.target.value as any)} className={inp}>
                  <option value="Development">Development (homologação)</option>
                  <option value="Production">Production</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-semibold">Webhook</p>
              <div className="flex gap-2">
                <input readOnly value={webhookUrl} className={inp + " font-mono"} />
                <button type="button" onClick={() => copy(webhookUrl)} className="inline-flex h-9 items-center gap-1 rounded-md border bg-card px-3 text-sm hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex gap-2">
                <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="X-Webhook-Secret" className={inp + " font-mono"} />
                <button type="button" onClick={genSecret} className="inline-flex h-9 items-center gap-1 rounded-md border bg-card px-3 text-sm hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {NFEIO_EVENTOS.map((ev) => (
                  <label key={ev.key} className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1.5 text-[11px]">
                    <span>{ev.label}</span>
                    <Switch checked={events[ev.key] === true} onCheckedChange={(v) => setEvents({ ...events, [ev.key]: v })} />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNfeioOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Fechar</button>
              <button onClick={async () => { await salvar(); setNfeioOpen(false); }} disabled={busy || update.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                {(busy || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar e validar
              </button>
            </div>
            {isOk && (
              <p className="text-[11px] text-muted-foreground">Validado em {formatDateTime((settings as any).nfeio_validated_at)}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationCard({ icon, title, description, status, onClick }: { icon: React.ReactNode; title: string; description: string; status: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-subtle transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        {status ? (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">{status}</span>
        ) : (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Não conectado</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>
      <span className="text-[11px] font-medium text-primary group-hover:underline">Configurar →</span>
    </button>
  );
}

function IntegrationPlaceholder({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-dashed bg-muted/20 p-4 text-left opacity-60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Em breve</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Integração planejada para a próxima versão.</p>
      </div>
    </div>
  );
}

// ============================ Logs ============================
function LogsTab() {
  const [cat, setCat] = useState<LogCategoria | "all">("all");
  const [busca, setBusca] = useState("");
  const { data: logs = [], refetch } = useAppLogs({ categoria: cat, busca });
  const { data: webhooks = [], refetch: refetchWh } = useNfeWebhookEvents();

  // realtime quando filtro = webhook
  useEffect(() => {
    if (cat !== "webhook") return;
    const ch = supabase
      .channel("nfe_webhook_events_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "nfe_webhook_events" }, () => {
        refetchWh();
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cat, refetch, refetchWh]);

  return (
    <div className="space-y-3">
      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <button onClick={() => setCat("all")} className={`h-8 rounded-md px-3 text-xs font-medium ${cat === "all" ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-muted"}`}>Todos</button>
          {LOG_CATEGORIAS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`h-8 rounded-md px-3 text-xs font-medium capitalize ${cat === c ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-muted"}`}>{c}</button>
          ))}
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar mensagem..." className={inp + " ml-auto max-w-xs"} />
        </div>

        {cat === "webhook" ? (
          <div className="divide-y">
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> Tempo real ativo — recebendo eventos nfe.io
            </div>
            {webhooks.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum evento recebido ainda</p>}
            {webhooks.map((w: any) => (
              <details key={w.id} className="px-4 py-2 text-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-primary">{w.evento}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(w.recebido_em)}</span>
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-[10px] font-mono">{JSON.stringify(w.payload, null, 2)}</pre>
              </details>
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {logs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum log</p>}
            {logs.map((l: any) => (
              <div key={l.id} className="flex items-start gap-3 px-4 py-2 text-sm">
                <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${l.categoria === "erro" ? "bg-destructive" : l.categoria === "webhook" ? "bg-emerald-500" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{l.mensagem}</p>
                  {l.payload && <pre className="mt-1 max-h-32 overflow-auto text-[10px] font-mono text-muted-foreground">{typeof l.payload === "string" ? l.payload : JSON.stringify(l.payload).slice(0, 300)}</pre>}
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{l.categoria}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatDateTime(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}