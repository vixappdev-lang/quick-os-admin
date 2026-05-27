import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload, Database, ShieldAlert, Loader2, FileDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/section-card";
import { activeSupabase } from "@/integrations/supabase/active-client";
import { supabase as centralSupabase } from "@/integrations/supabase/client";
import { ReauthDialog } from "@/components/reauth-dialog";
import { formatDateTime } from "@/lib/format";

// Tabelas exportadas/importadas no backup do tenant.
// Apenas tabelas de dados de negócio — sem auth/roles/tenants/api_keys/logs.
const TABLES = [
  "categorias",
  "fornecedores",
  "produtos",
  "clientes",
  "pedidos",
  "pedido_itens",
  "pedido_pagamentos",
  "estoque_movimentos",
  "caixa_sessoes",
  "caixa_movimentos",
  "contas",
  "despesas",
  "patrimonio",
  "app_settings",
] as const;

type BackupShape = {
  version: 1;
  exported_at: string;
  source: string;
  tables: Record<string, any[]>;
};

export function BackupTab() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "export" | "import">(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["backups_log"],
    queryFn: async () => {
      const { data, error } = await centralSupabase.from("backups_log").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Aviso de leave/abandono durante operação
  useEffect(() => {
    if (!exporting && !importing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [exporting, importing]);

  const doExport = async () => {
    setExporting(true);
    try {
      const payload: BackupShape = { version: 1, exported_at: new Date().toISOString(), source: window.location.host, tables: {} };
      for (const t of TABLES) {
        const { data, error } = await activeSupabase.from(t as any).select("*");
        if (error) throw new Error(`${t}: ${error.message}`);
        payload.tables[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${ts}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);

      // Sobe também ao bucket privado e registra no log
      try {
        const path = `${new Date().getFullYear()}/${filename}`;
        await centralSupabase.storage.from("backups").upload(path, blob, { contentType: "application/json", upsert: false });
        await centralSupabase.from("backups_log").insert({ storage_path: path, tamanho_bytes: blob.size, status: "success", observacao: `Backup manual — ${TABLES.length} tabelas, ${(blob.size / 1024).toFixed(1)} KB` } as any);
      } catch {/* upload best-effort */}

      toast.success("Backup gerado e baixado.");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  const doImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupShape;
      if (!parsed?.version || !parsed.tables) throw new Error("Arquivo de backup inválido.");
      let inserted = 0;
      for (const t of TABLES) {
        const rows = parsed.tables[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // upsert por id quando disponível; senão insert.
        const { error } = await (activeSupabase.from(t as any) as any).upsert(rows, { onConflict: "id" });
        if (error) throw new Error(`${t}: ${error.message}`);
        inserted += rows.length;
      }
      await centralSupabase.from("backups_log").insert({ storage_path: null, tamanho_bytes: file.size, status: "success", observacao: `Restore manual (${inserted} linhas)` } as any);
      toast.success(`Backup restaurado (${inserted} linhas).`);
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao importar.");
      try { await centralSupabase.from("backups_log").insert({ status: "error", observacao: String(e?.message ?? e) } as any); } catch {}
    } finally {
      setImporting(false);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Backup & restauração" description="Exporta os dados de negócio do banco ativo em JSON. Use o restore com cautela — sobrescreve registros com o mesmo ID.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-4">
            <div className="mb-2 flex items-center gap-2"><FileDown className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold">Exportar agora</h4></div>
            <p className="text-xs text-muted-foreground">Baixa um arquivo <code className="rounded bg-muted px-1">backup-AAAA-MM-DD.json</code> com {TABLES.length} tabelas.</p>
            <button
              onClick={() => setPendingAction("export")}
              disabled={exporting}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Gerar backup
            </button>
          </div>
          <div className="rounded-md border bg-card p-4">
            <div className="mb-2 flex items-center gap-2"><Upload className="h-4 w-4 text-amber-600" /><h4 className="text-sm font-semibold">Restaurar de arquivo</h4></div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />Use apenas para migrar ou recuperar — pede senha antes de aplicar.</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setPendingFile(f); setPendingAction("import"); }
              }}
              className="mt-3 block w-full text-xs file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium hover:file:bg-muted/70"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Histórico" description="Últimos 20 backups e restaurações" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tamanho</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observação</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm">Nenhum backup registrado ainda.</p>
                </td></tr>
              )}
              {logs.map((b: any) => (
                <tr key={b.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-xs">{formatDateTime(b.created_at)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {b.status === "success"
                      ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> ok</span>
                      : <span className="inline-flex items-center gap-1 text-destructive"><ShieldAlert className="h-3.5 w-3.5" /> {b.status}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.tamanho_bytes ? `${(b.tamanho_bytes / 1024).toFixed(1)} KB` : "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <ReauthDialog
        open={pendingAction !== null}
        onOpenChange={(o) => { if (!o) { setPendingAction(null); setPendingFile(null); if (inputRef.current) inputRef.current.value = ""; } }}
        reason={pendingAction === "export" ? "Confirme sua senha para gerar e baixar o backup completo." : "Confirme sua senha — o restore sobrescreve dados existentes pelo ID."}
        onConfirmed={() => {
          if (pendingAction === "export") doExport();
          else if (pendingAction === "import" && pendingFile) doImport(pendingFile);
          setPendingAction(null);
        }}
      />
    </div>
  );
}