import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useCategorias, useUpsertProduto } from "@/lib/queries";
import { generateProductImage } from "@/lib/product-image.functions";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo produto — Quick OS" }] }),
  component: NovoProduto,
});

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function NovoProduto() {
  const navigate = useNavigate();
  const { data: categorias = [] } = useCategorias();
  const upsert = useUpsertProduto();
  const genImage = useServerFn(generateProductImage);

  const [form, setForm] = useState({
    nome: "", sku: "", codigo_barras: "", categoria_id: "",
    preco_custo: "", preco_venda: "", estoque: "0", estoque_minimo: "0", unidade: "UN",
    ativo: true, imagem_url: "",
  });
  const [gerando, setGerando] = useState(false);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const margem = (() => {
    const c = Number(form.preco_custo), v = Number(form.preco_venda);
    if (!c || !v) return "—";
    return `${(((v - c) / v) * 100).toFixed(1)}%`;
  })();

  const gerarImagem = async () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do produto"); return; }
    setGerando(true);
    try {
      const r = await genImage({ data: { nome: form.nome } });
      set("imagem_url", r.imageUrl);
      toast.success("Imagem gerada");
    } catch (e: any) { toast.error(e.message ?? "Erro ao gerar imagem"); }
    finally { setGerando(false); }
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.sku.trim()) { toast.error("Nome e SKU são obrigatórios"); return; }
    try {
      await upsert.mutateAsync({
        nome: form.nome,
        sku: form.sku,
        codigo_barras: form.codigo_barras || null,
        categoria_id: form.categoria_id || null,
        preco_custo: Number(form.preco_custo) || 0,
        preco_venda: Number(form.preco_venda) || 0,
        estoque: Number(form.estoque) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        unidade: form.unidade,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
      });
      toast.success("Produto cadastrado");
      navigate({ to: "/produtos" });
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  return (
    <div>
      <Link to="/produtos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
      <PageHeader title="Novo produto" description="Cadastre um novo item no catálogo" actions={
        <>
          <Link to="/produtos" className="h-9 rounded-md border bg-card px-3 text-sm font-medium leading-9 hover:bg-muted">Cancelar</Link>
          <button onClick={salvar} disabled={upsert.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">{upsert.isPending ? "Salvando..." : "Salvar produto"}</button>
        </>
      } />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <SectionCard title="Identificação">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome do produto" full><input value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inputCls} placeholder="Ex.: Heineken Long Neck 330ml" /></Field>
              <Field label="SKU"><input value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} placeholder="BEB-HEI-330" /></Field>
              <Field label="Código de barras (EAN)"><input value={form.codigo_barras} onChange={(e) => set("codigo_barras", e.target.value)} className={inputCls} placeholder="7896045506019" /></Field>
              <Field label="Categoria" full>
                <select value={form.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} className={inputCls}>
                  <option value="">— sem categoria —</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Preços e margem">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Preço de custo"><input type="number" step="0.01" value={form.preco_custo} onChange={(e) => set("preco_custo", e.target.value)} className={inputCls} placeholder="0,00" /></Field>
              <Field label="Preço de venda"><input type="number" step="0.01" value={form.preco_venda} onChange={(e) => set("preco_venda", e.target.value)} className={inputCls} placeholder="0,00" /></Field>
              <Field label="Margem"><input disabled value={margem} className={`${inputCls} bg-muted/40`} /></Field>
            </div>
          </SectionCard>

          <SectionCard title="Estoque">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Estoque atual"><input type="number" value={form.estoque} onChange={(e) => set("estoque", e.target.value)} className={inputCls} placeholder="0" /></Field>
              <Field label="Estoque mínimo"><input type="number" value={form.estoque_minimo} onChange={(e) => set("estoque_minimo", e.target.value)} className={inputCls} placeholder="0" /></Field>
              <Field label="Unidade">
                <select value={form.unidade} onChange={(e) => set("unidade", e.target.value)} className={inputCls}>
                  <option>UN</option><option>CX</option><option>KG</option><option>L</option><option>ML</option>
                </select>
              </Field>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Imagem">
            <div className="aspect-square w-full overflow-hidden rounded-md border border-dashed bg-muted/30">
              {form.imagem_url ? (
                <img src={form.imagem_url} alt={form.nome} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <p className="mt-2 text-xs font-medium">Gere uma imagem com IA</p>
                  <p className="text-[11px]">a partir do nome do produto</p>
                </div>
              )}
            </div>
            <button onClick={gerarImagem} disabled={gerando} type="button" className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary/10 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {gerando ? "Gerando..." : "Gerar imagem com IA"}
            </button>
            <input value={form.imagem_url} onChange={(e) => set("imagem_url", e.target.value)} placeholder="ou cole uma URL" className={`${inputCls} mt-2`} />
            <div className="mt-2">
              <ProductImageGallery nome={form.nome} onPick={(url) => set("imagem_url", url)} />
            </div>
          </SectionCard>
          <SectionCard title="Status">
            <label className="flex items-center justify-between"><span className="text-sm">Produto ativo</span><input type="checkbox" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} className="h-4 w-4 rounded" /></label>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}