import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Sparkles, Loader2, Trash2, Pencil, X, Save, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCategorias, useUpsertProduto, useDeleteProduto } from "@/lib/queries";
import { generateProductImage } from "@/lib/product-image.functions";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export type PanelMode = "view" | "edit" | "create";

interface Props {
  open: boolean;
  mode: PanelMode;
  produto: any | null;
  onClose: () => void;
  onModeChange: (m: PanelMode) => void;
}

const EMPTY: any = {
  nome: "", sku: "", codigo_barras: "", categoria_id: "",
  preco_custo: "0", preco_venda: "0", estoque: "0", estoque_minimo: "0", unidade: "UN",
  ativo: true, imagem_url: "", peso_kg: "0",
  embalagens: [] as { tipo: string; qtd: number }[],
};

export function ProductFormPanel({ open, mode, produto, onClose, onModeChange }: Props) {
  const { data: categorias = [] } = useCategorias();
  const upsert = useUpsertProduto();
  const del = useDeleteProduto();
  const genImage = useServerFn(generateProductImage);
  const [form, setForm] = useState(EMPTY);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "create" || !produto) {
      setForm(EMPTY);
    } else {
      setForm({
        nome: produto.nome ?? "",
        sku: produto.sku ?? "",
        codigo_barras: produto.codigo_barras ?? "",
        categoria_id: produto.categoria_id ?? "",
        preco_custo: String(produto.preco_custo ?? 0),
        preco_venda: String(produto.preco_venda ?? 0),
        estoque: String(produto.estoque ?? 0),
        estoque_minimo: String(produto.estoque_minimo ?? 0),
        unidade: produto.unidade ?? "UN",
        ativo: produto.ativo ?? true,
        imagem_url: produto.imagem_url ?? "",
        peso_kg: String(produto.peso_kg ?? 0),
        embalagens: Array.isArray(produto.embalagens) ? produto.embalagens : [],
      });
    }
  }, [open, mode, produto]);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const ro = mode === "view";

  const custo = Number(form.preco_custo) || 0;
  const venda = Number(form.preco_venda) || 0;
  const margem = venda > 0 ? `${(((venda - custo) / venda) * 100).toFixed(1)}%` : "—";

  const gerar = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome do produto");
    setGerando(true);
    try {
      const r = await genImage({ data: { nome: form.nome } });
      set("imagem_url", r.imageUrl);
      toast.success("Imagem gerada");
    } catch (e: any) { toast.error(e.message ?? "Erro ao gerar imagem"); }
    finally { setGerando(false); }
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.sku.trim()) return toast.error("Nome e SKU são obrigatórios");
    try {
      const payload: any = {
        nome: form.nome.trim(),
        sku: form.sku.trim(),
        codigo_barras: form.codigo_barras || null,
        categoria_id: form.categoria_id || null,
        preco_custo: custo,
        preco_venda: venda,
        estoque: Number(form.estoque) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        unidade: form.unidade,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
        peso_kg: Number(form.peso_kg) || 0,
        embalagens: form.embalagens ?? [],
      };
      if (mode === "edit" && produto?.id) payload.id = produto.id;
      await upsert.mutateAsync(payload);
      toast.success(mode === "edit" ? "Produto atualizado" : "Produto cadastrado");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  const excluir = async () => {
    if (!produto?.id) return;
    if (!confirm(`Excluir "${form.nome || produto?.nome}"?`)) return;
    try {
      await del.mutateAsync(produto.id);
      toast.success("Produto excluído");
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  const title =
    mode === "create" ? "Novo produto" :
    mode === "edit" ? `Editar · ${produto?.nome ?? ""}` :
    produto?.nome ?? "Produto";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur px-5 py-3">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{title}</span>
              <div className="flex items-center gap-1.5">
                {mode === "view" && produto && (
                  <>
                    <button onClick={() => onModeChange("edit")} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                    <button onClick={excluir} disabled={del.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                  </>
                )}
                {(mode === "edit" || mode === "create") && (
                  <>
                    {mode === "edit" && <button onClick={() => onModeChange("view")} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-muted"><Eye className="h-3.5 w-3.5" /> Ver</button>}
                    <button onClick={salvar} disabled={upsert.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                      {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {upsert.isPending ? "Salvando" : "Salvar"}
                    </button>
                  </>
                )}
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="space-y-4 p-5">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-dashed bg-muted/30">
            {form.imagem_url ? (
              <img src={form.imagem_url} alt={form.nome} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <p className="mt-2 text-xs">Sem imagem</p>
              </div>
            )}
          </div>
          {!ro && (
            <div className="flex gap-2">
              <button onClick={gerar} disabled={gerando} type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-primary/10 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60">
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {gerando ? "Gerando..." : "Gerar com IA"}
              </button>
              <input value={form.imagem_url} onChange={(e) => set("imagem_url", e.target.value)} placeholder="ou cole URL" className={inp + " flex-1"} />
            </div>
          )}
          {!ro && <ProductImageGallery nome={form.nome} onPick={(url) => set("imagem_url", url)} />}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do produto" full>
              <input disabled={ro} value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inp} />
            </Field>
            <Field label="SKU"><input disabled={ro} value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inp} /></Field>
            <Field label="Cód. de barras (EAN)"><input disabled={ro} value={form.codigo_barras} onChange={(e) => set("codigo_barras", e.target.value)} className={inp} /></Field>
            <Field label="Categoria" full>
              <select disabled={ro} value={form.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} className={inp}>
                <option value="">— sem categoria —</option>
                {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Preço de custo"><input disabled={ro} type="number" step="0.01" value={form.preco_custo} onChange={(e) => set("preco_custo", e.target.value)} className={inp} /></Field>
            <Field label="Preço de venda"><input disabled={ro} type="number" step="0.01" value={form.preco_venda} onChange={(e) => set("preco_venda", e.target.value)} className={inp} /></Field>
            <Field label="Margem"><input disabled value={margem} className={inp + " bg-muted/40"} /></Field>
            <Field label="Unidade">
              <select disabled={ro} value={form.unidade} onChange={(e) => set("unidade", e.target.value)} className={inp}>
                <option>UN</option><option>CX</option><option>KG</option><option>L</option><option>ML</option>
              </select>
            </Field>
            <Field label="Estoque atual"><input disabled={ro} type="number" value={form.estoque} onChange={(e) => set("estoque", e.target.value)} className={inp} /></Field>
            <Field label="Estoque mínimo"><input disabled={ro} type="number" value={form.estoque_minimo} onChange={(e) => set("estoque_minimo", e.target.value)} className={inp} /></Field>
            <Field label="Status" full>
              <label className="flex h-9 items-center justify-between rounded-md border bg-card px-3 text-sm">
                <span>Produto ativo</span>
                <input disabled={ro} type="checkbox" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} className="h-4 w-4" />
              </label>
            </Field>
          </div>

          {ro && produto && (
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <Row label="Margem" value={margem} />
              <Row label="Valor em estoque" value={formatBRL(venda * (Number(form.estoque) || 0))} />
              <Row label="Lucro unitário" value={formatBRL(venda - custo)} />
              <Row label="Custo estocado" value={formatBRL(custo * (Number(form.estoque) || 0))} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground text-xs">{label}</span><span className="tabular text-xs font-medium">{value}</span></div>;
}