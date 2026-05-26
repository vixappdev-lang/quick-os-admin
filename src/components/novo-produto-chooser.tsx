import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScanBarcode, Pencil, Loader2, AlertTriangle, Package, Plus, PackageX } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { lookupProductByEan } from "@/lib/produto-scan.functions";
import { toast } from "sonner";
import { beepError } from "@/lib/sounds";

type Stage = "chooser" | "scanner" | "processing" | "duplicate" | "not_found";
type ResultProduto = {
  id: string;
  nome: string;
  sku: string;
  codigo_barras: string | null;
  imagem_url: string | null;
  estoque: number;
  preco_venda: number;
  unidade: string;
};
export type ScanSugestao = {
  nome: string | null;
  marca: string | null;
  unidade: string | null;
  categoria_sugerida: string | null;
  imagem_url: string | null;
} | null;
export type ManualPrefill = { ean?: string; sugestao?: ScanSugestao };

interface Props {
  open: boolean;
  onClose: () => void;
  onPickManual: (preFill?: ManualPrefill) => void;
  onPickEdit?: (produtoId: string) => void;
}

export function NovoProdutoChooser({ open, onClose, onPickManual, onPickEdit }: Props) {
  const [stage, setStage] = useState<Stage>("chooser");
  const [result, setResult] = useState<ResultProduto | null>(null);
  const [sugestao, setSugestao] = useState<ScanSugestao>(null);
  const [lastEan, setLastEan] = useState<string>("");
  const playedRef = useRef<Stage | null>(null);
  const lookup = useServerFn(lookupProductByEan);
  const qc = useQueryClient();

  useEffect(() => {
    if (playedRef.current === stage) return;
    if (stage === "duplicate" || stage === "not_found") { beepError(); playedRef.current = stage; }
    else if (stage === "chooser" || stage === "scanner") { playedRef.current = null; }
  }, [stage]);

  const reset = () => { setStage("chooser"); setResult(null); setSugestao(null); setLastEan(""); };
  const close = () => { reset(); onClose(); };

  useEffect(() => {
    if (!open) { setStage("chooser"); setResult(null); setSugestao(null); setLastEan(""); playedRef.current = null; }
  }, [open]);

  const handleDetected = async (code: string) => {
    const ean = String(code).trim().replace(/\D+/g, "") || String(code).trim();
    if (!ean) return;
    setLastEan(ean);
    setStage("processing");
    try {
      const r = await lookup({ data: { ean } });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      if (r.found && r.produto) {
        setResult(r.produto as ResultProduto);
        setSugestao(null);
        setStage("duplicate");
      } else {
        setResult(null);
        setSugestao(r.sugestao ?? null);
        setStage("not_found");
      }
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao consultar produto";
      console.error("[lookupProductByEan]", e);
      toast.error(msg);
      setStage("chooser");
    }
  };

  const goManualWithEan = () => {
    onPickManual({ ean: lastEan, sugestao });
    close();
  };

  return (
    <>
      <Dialog open={open && (stage === "chooser" || stage === "processing" || stage === "duplicate" || stage === "not_found")}
        onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="sm:max-w-md">
          {stage === "chooser" && (
            <>
              <DialogHeader>
                <DialogTitle>Como deseja cadastrar?</DialogTitle>
                <DialogDescription>
                  Escolha entre cadastro manual ou identificação automática pelo código de barras.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <button
                  onClick={() => { onPickManual(); close(); }}
                  className="group flex flex-col items-center gap-2 rounded-lg border bg-card p-5 text-center transition hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10">
                    <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Manual</span>
                  <span className="text-[11px] text-muted-foreground">Preencher o formulário completo</span>
                </button>
                <button
                  onClick={() => setStage("scanner")}
                  className="group flex flex-col items-center gap-2 rounded-lg border bg-card p-5 text-center transition hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <ScanBarcode className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Scanner</span>
                  <span className="text-[11px] text-muted-foreground">Procurar pelo código de barras</span>
                </button>
              </div>
            </>
          )}

          {stage === "processing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Consultando produto...</p>
              <p className="text-xs text-muted-foreground">Código: <span className="font-mono">{lastEan}</span></p>
            </div>
          )}

          {stage === "not_found" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-warning">
                  <PackageX className="h-5 w-5" /> Produto não cadastrado
                </DialogTitle>
                <DialogDescription>
                  Este código não está no catálogo. Cadastre manualmente — depois ele ficará disponível no PDV.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Código lido</p>
                <p className="mt-1 font-mono text-base font-semibold">{lastEan}</p>
                {sugestao?.nome && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sugestão da base global:{" "}
                    <span className="font-medium text-foreground">{sugestao.nome}</span>
                    {sugestao.marca ? ` · ${sugestao.marca}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button onClick={() => { setResult(null); setSugestao(null); setLastEan(""); setStage("scanner"); }}
                  className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                  Escanear outro
                </button>
                <button onClick={goManualWithEan}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
                  <Pencil className="h-3.5 w-3.5" /> Cadastrar manualmente
                </button>
              </div>
            </>
          )}

          {stage === "duplicate" && result && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" /> Já cadastrado
                </DialogTitle>
                <DialogDescription>Este código já existe no catálogo.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {result.imagem_url ? (
                    <img src={result.imagem_url} alt={result.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{result.nome}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">EAN: {result.codigo_barras ?? result.sku}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Estoque atual: <strong>{Number(result.estoque)} {result.unidade}</strong></p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                {onPickEdit && (
                  <button onClick={() => { onPickEdit(result.id); close(); }}
                    className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                    Adicionar estoque
                  </button>
                )}
                <button onClick={() => { setResult(null); setSugestao(null); setLastEan(""); setStage("scanner"); }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
                  <Plus className="h-3.5 w-3.5" /> Novo
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={open && stage === "scanner"}
        onClose={() => setStage("chooser")}
        onDetected={handleDetected}
      />
    </>
  );
}