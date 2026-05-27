import { useMemo, useState } from "react";
import { X, PackagePlus, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProdutos, useFornecedores, useNovaEntradaEstoque } from "@/lib/queries";
import { toast } from "sonner";

const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NovaEntradaDialog({ open, onClose }: Props) {
  const { data: produtos = [] } = useProdutos();
  const { data: fornecedores = [] } = useFornecedores();
  const entrada = useNovaEntradaEstoque();

  const [busca, setBusca] = useState("");
  const [produtoId, setProdutoId] = useState<string>("");
  const [qtd, setQtd] = useState<string>("1");
  const [fator, setFator] = useState<string>("1");
  const [precoCusto, setPrecoCusto] = useState<string>("");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [temNF, setTemNF] = useState(true);
  const [obs, setObs] = useState("");

  const produto = useMemo(() => produtos.find((p: any) => p.id === produtoId), [produtos, produtoId]);

  const filtrados = useMemo(() => {
    if (!busca) return produtos.slice(0, 8);
    const t = busca.toLowerCase();
    return produtos.filter((p: any) =>
      p.nome.toLowerCase().includes(t) ||
      p.sku?.toLowerCase().includes(t) ||
      p.codigo_barras?.toLowerCase().includes(t),
    ).slice(0, 12);
  }, [produtos, busca]);

  const qtdUn = (Number(qtd) || 0) * (Number(fator) || 1);

  const reset = () => {
    setBusca(""); setProdutoId(""); setQtd("1"); setFator("1");
    setPrecoCusto(""); setFornecedorId(""); setTemNF(true); setObs("");
  };

  const salvar = async () => {
    if (!produtoId) return toast.error("Selecione um produto");
    if (qtdUn <= 0) return toast.error("Quantidade inválida");
    if (!fornecedorId) return toast.error("Fornecedor é obrigatório");
    try {
      await entrada.mutateAsync({
        produto_id: produtoId,
        qtd_un: qtdUn,
        preco_custo: precoCusto ? Number(precoCusto) : null,
        fornecedor_id: fornecedorId,
        tem_nota_fiscal: temNF,
        observacao: obs || null,
      });
      toast.success(`+${qtdUn} UN em ${produto?.nome}`);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar entrada");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Nova entrada de estoque</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produto</label>
            {produto ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{produto.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{produto.sku} · estoque {Number(produto.estoque)} UN</p>
                </div>
                <button onClick={() => setProdutoId("")} className="text-xs text-muted-foreground hover:text-destructive">Trocar</button>
              </div>
            ) : (
              <>
                <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, SKU ou EAN..." className={inp} />
                {filtrados.length > 0 && (
                  <div className="mt-1 max-h-56 overflow-y-auto rounded-md border bg-card">
                    {filtrados.map((p: any) => (
                      <button key={p.id} onClick={() => { setProdutoId(p.id); setBusca(""); if (p.fornecedor_id) setFornecedorId(p.fornecedor_id); if (p.preco_custo) setPrecoCusto(String(p.preco_custo)); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                        <p className="font-medium">{p.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{p.sku || "sem SKU"} · {Number(p.estoque)} UN</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quantidade</label>
              <input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">UN por embalagem</label>
              <input type="number" min={1} value={fator} onChange={(e) => setFator(e.target.value)} className={inp} />
              <p className="mt-1 text-[10px] text-muted-foreground">Ex.: CX com 12 UN → fator 12. Total: <b>{qtdUn} UN</b></p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor <span className="text-destructive">*</span></label>
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className={inp}>
              <option value="">— selecione —</option>
              {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.razao_social}{f.nome_fantasia ? ` (${f.nome_fantasia})` : ""}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preço de custo (opcional)</label>
            <input type="number" step="0.01" min={0} value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} placeholder="Atualiza o preço de custo do produto" className={inp} />
          </div>

          <label className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
            <span>Esta entrada tem nota fiscal?</span>
            <input type="checkbox" checked={temNF} onChange={(e) => setTemNF(e.target.checked)} className="h-4 w-4" />
          </label>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observação</label>
            <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Nº NF, lote, etc." className={inp + " h-auto py-2"} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="h-10 flex-1 rounded-md border bg-card text-sm font-medium hover:bg-muted">Cancelar</button>
            <button onClick={salvar} disabled={entrada.isPending} className="inline-flex h-10 flex-[2] items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
              {entrada.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              {entrada.isPending ? "Salvando..." : "Registrar entrada"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}