import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useMemo } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Search, Trash2, ChevronRight, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNfes, useNfe } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatBRL, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/nfe")({
  head: () => ({ meta: [{ title: "Entradas NF-e — Quick OS" }] }),
  component: NfePage,
});

interface ParsedItem {
  codigo: string | null;
  ean: string | null;
  descricao: string;
  unidade: string | null;
  qtd: number;
  valor_unit: number;
  valor_total: number;
}
interface ParsedNfe {
  chave: string | null;
  numero: string | null;
  fornecedor: string | null;
  valor_total: number;
  itens: ParsedItem[];
}

function parseXmlNfe(xmlText: string): ParsedNfe {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const get = (tag: string, root: Element | Document = doc) =>
    root.getElementsByTagName(tag)[0]?.textContent?.trim() ?? null;

  const chave = doc.getElementsByTagName("infNFe")[0]?.getAttribute("Id")?.replace(/^NFe/, "") ?? null;
  const numero = get("nNF");
  const fornecedor = get("xNome");
  const valor_total = Number(get("vNF") ?? 0);

  const itens: ParsedItem[] = [];
  const dets = doc.getElementsByTagName("det");
  for (let i = 0; i < dets.length; i++) {
    const d = dets[i];
    const prod = d.getElementsByTagName("prod")[0];
    if (!prod) continue;
    itens.push({
      codigo: get("cProd", prod),
      ean: (get("cEAN", prod) === "SEM GTIN" ? null : get("cEAN", prod)),
      descricao: get("xProd", prod) ?? "Sem descrição",
      unidade: get("uCom", prod),
      qtd: Number(get("qCom", prod) ?? 0),
      valor_unit: Number(get("vUnCom", prod) ?? 0),
      valor_total: Number(get("vProd", prod) ?? 0),
    });
  }
  return { chave, numero, fornecedor, valor_total, itens };
}

function NfePage() {
  const { data: nfes = [], isLoading } = useNfes();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedNfe | null>(null);
  const [importing, setImporting] = useState(false);

  const filtradas = useMemo(() => {
    if (!busca) return nfes;
    const t = busca.toLowerCase();
    return nfes.filter((n: any) =>
      n.numero?.toLowerCase().includes(t) ||
      n.fornecedor?.toLowerCase().includes(t) ||
      n.chave?.toLowerCase().includes(t),
    );
  }, [nfes, busca]);

  const [duplicateInfo, setDuplicateInfo] = useState<{ numero: string; fornecedor: string | null; created_at: string } | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    // SEMPRE limpa o input para permitir re-selecionar o mesmo arquivo depois
    if (fileRef.current) fileRef.current.value = "";
    if (!file.name.toLowerCase().endsWith(".xml")) { toast.error("Selecione um arquivo XML"); return; }
    try {
      const text = await file.text();
      const p = parseXmlNfe(text);
      if (!p.numero) { toast.error("XML inválido: número não encontrado"); return; }
      // Detecta duplicada imediatamente
      if (p.chave) {
        const { data: dup } = await supabase
          .from("nfe_entradas")
          .select("numero, fornecedor, created_at")
          .eq("chave", p.chave)
          .maybeSingle();
        if (dup) {
          setDuplicateInfo({ numero: dup.numero ?? p.numero, fornecedor: dup.fornecedor, created_at: dup.created_at });
          return;
        }
      }
      setParsed(p);
    } catch (e: any) { toast.error("Falha ao ler XML: " + e.message); }
  };

  const confirmar = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      // verifica duplicada
      if (parsed.chave) {
        const { data: dup } = await supabase.from("nfe_entradas").select("id").eq("chave", parsed.chave).maybeSingle();
        if (dup) { toast.error("Esta NF-e já foi importada"); setImporting(false); return; }
      }
      const { data: nfe, error } = await supabase.from("nfe_entradas").insert({
        chave: parsed.chave,
        numero: parsed.numero,
        fornecedor: parsed.fornecedor,
        valor_total: parsed.valor_total,
        status: "importado",
      }).select().single();
      if (error) throw error;

      // vincula produtos por EAN
      const eans = parsed.itens.map((i) => i.ean).filter(Boolean) as string[];
      const { data: prods } = eans.length
        ? await supabase.from("produtos").select("id, codigo_barras, preco_custo").in("codigo_barras", eans)
        : { data: [] as any[] };
      const prodMap = new Map((prods ?? []).map((p) => [p.codigo_barras, p]));

      const itensInsert = parsed.itens.map((it) => {
        const prod = it.ean ? prodMap.get(it.ean) : null;
        const div: string[] = [];
        if (!prod) div.push("produto não cadastrado");
        else if (prod.preco_custo && Math.abs(Number(prod.preco_custo) - it.valor_unit) > 0.01) div.push("custo divergente");
        return {
          nfe_id: nfe.id,
          codigo_xml: it.codigo,
          ean_xml: it.ean,
          descricao_xml: it.descricao,
          unidade: it.unidade,
          qtd: it.qtd,
          valor_unit: it.valor_unit,
          valor_total: it.valor_total,
          produto_id: prod?.id ?? null,
          divergencia: div.length ? div.join(", ") : null,
        };
      });
      const { error: ie } = await supabase.from("nfe_itens").insert(itensInsert);
      if (ie) throw ie;

      toast.success(`NF-e ${parsed.numero} importada com ${parsed.itens.length} itens`);
      setParsed(null);
      qc.invalidateQueries({ queryKey: ["nfes"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta NF-e?")) return;
    await supabase.from("nfe_itens").delete().eq("nfe_id", id);
    const { error } = await supabase.from("nfe_entradas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("NF-e removida");
    qc.invalidateQueries({ queryKey: ["nfes"] });
  };

  return (
    <div>
      <PageHeader title="Entradas NF-e" description="Importação, conferência e busca de notas fiscais" />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <SectionCard>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">Arraste o XML da NF-e aqui</p>
            <p className="mt-1 text-xs text-muted-foreground">ou clique para selecionar um arquivo .xml</p>
            <input ref={fileRef} type="file" accept=".xml,text/xml" hidden onChange={(e) => onFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} className="mt-4 h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Selecionar XML</button>
          </div>
        </SectionCard>
        <div className="space-y-2">
          {[
            { i: CheckCircle2, c: "text-success bg-success/10", t: "Vínculo automático por EAN", d: "Itens com código de barras cadastrado são reconhecidos" },
            { i: AlertTriangle, c: "text-warning bg-warning/15", t: "Detecção de divergências", d: "Preço, código não cadastrado, EAN inválido" },
            { i: FileText, c: "text-info bg-info/10", t: "Histórico completo", d: "Busca por nº de pedido, chave de acesso ou fornecedor" },
          ].map((s) => (
            <div key={s.t} className="flex gap-3 rounded-xl border bg-card p-3.5 shadow-subtle">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", s.c)}><s.i className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium">{s.t}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard padded={false}>
        <div className="flex items-center gap-3 border-b px-5 py-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, fornecedor ou chave de acesso..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <span className="text-xs text-muted-foreground">{filtradas.length} de {nfes.length}</span>
        </div>
        {isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>}
        {!isLoading && filtradas.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Nenhuma NF-e importada</div>}
        {!isLoading && filtradas.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Número</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Itens</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((n: any) => (
                <tr key={n.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-mono text-xs font-semibold">{n.numero ?? "—"}</td>
                  <td className="px-5 py-3">{n.fornecedor ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(n.created_at)}</td>
                  <td className="px-5 py-3 text-right tabular">{n.itens?.length ?? 0}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{formatBRL(Number(n.valor_total ?? 0))}</td>
                  <td className="px-5 py-3"><StatusBadge status={n.status} tone={statusTone(n.status)} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPreviewId(n.id)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" title="Ver"><ChevronRight className="h-3.5 w-3.5" /></button>
                      <button onClick={() => excluir(n.id)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Preview da NF-e parseada (antes de importar) */}
      <Dialog open={!!parsed} onOpenChange={(o) => !o && setParsed(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Conferir NF-e antes de importar</DialogTitle>
          </DialogHeader>
          {parsed && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Info label="Número" value={parsed.numero} />
                <Info label="Fornecedor" value={parsed.fornecedor} />
                <Info label="Valor total" value={formatBRL(parsed.valor_total)} />
                <Info label="Chave" value={parsed.chave} mono full />
              </div>
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-left">EAN</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Unit.</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.itens.map((it, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-3 py-1.5">{it.descricao}</td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{it.ean ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular">{it.qtd}</td>
                        <td className="px-3 py-1.5 text-right tabular">{formatBRL(it.valor_unit)}</td>
                        <td className="px-3 py-1.5 text-right tabular font-semibold">{formatBRL(it.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setParsed(null)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
                <button onClick={confirmar} disabled={importing} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">{importing ? "Importando..." : "Confirmar importação"}</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview de NF-e já importada */}
      <NfeDetailDialog id={previewId} onClose={() => setPreviewId(null)} />

      {/* Aviso de duplicada */}
      <Dialog open={!!duplicateInfo} onOpenChange={(o) => !o && setDuplicateInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" /> NF-e já importada
            </DialogTitle>
          </DialogHeader>
          {duplicateInfo && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Você já importou esta nota fiscal anteriormente. Confira os dados abaixo:
              </p>
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p><span className="text-muted-foreground">Número:</span> <strong>{duplicateInfo.numero}</strong></p>
                <p><span className="text-muted-foreground">Fornecedor:</span> {duplicateInfo.fornecedor ?? "—"}</p>
                <p><span className="text-muted-foreground">Importada em:</span> {formatDate(duplicateInfo.created_at)}</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setDuplicateInfo(null)} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Entendi</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono, full }: { label: string; value: string | null; mono?: boolean; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-3")}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("truncate text-sm font-medium", mono && "font-mono text-xs")}>{value ?? "—"}</p>
    </div>
  );
}

function NfeDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: nfe } = useNfe(id ?? "");
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>NF-e {nfe?.numero}</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </DialogTitle>
        </DialogHeader>
        {nfe && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Info label="Fornecedor" value={nfe.fornecedor} />
              <Info label="Valor total" value={formatBRL(Number(nfe.valor_total ?? 0))} />
              <Info label="Status" value={nfe.status} />
              <Info label="Chave" value={nfe.chave} mono full />
            </div>
            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Divergência</th>
                  </tr>
                </thead>
                <tbody>
                  {(nfe.itens ?? []).map((it: any) => (
                    <tr key={it.id} className="border-b last:border-b-0">
                      <td className="px-3 py-1.5">{it.descricao_xml}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{it.produto?.nome ?? <span className="text-warning">não vinculado</span>}</td>
                      <td className="px-3 py-1.5 text-right tabular">{it.qtd}</td>
                      <td className="px-3 py-1.5 text-right tabular font-semibold">{formatBRL(Number(it.valor_total))}</td>
                      <td className="px-3 py-1.5 text-[10px]">{it.divergencia ? <span className="text-warning">{it.divergencia}</span> : <span className="text-success">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}