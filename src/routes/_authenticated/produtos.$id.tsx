import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ImagePlus, Sparkles, Loader2, Trash2, Copy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useCategorias, useProduto, useUpsertProduto, useDeleteProduto } from "@/lib/queries";
import { generateProductImage } from "@/lib/product-image.functions";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos/$id")({
  head: () => ({ meta: [{ title: "Produto — LyneCloud" }] }),
  component: ProdutoDetail,
});

const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className={`tabular font-medium ${accent ?? ""}`}>{value}</span></div>;
}

function ProdutoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: produto, isLoading } = useProduto(id);
  const { data: categorias = [] } = useCategorias();
  const upsert = useUpsertProduto();
  const del = useDeleteProduto();
  const genImage = useServerFn(generateProductImage);

  const [form, setForm] = useState({
    nome: "", sku: "", codigo_barras: "", categoria_id: "",
    preco_custo: "0", preco_venda: "0", estoque: "0", estoque_minimo: "0", unidade: "UN",
    ativo: true, imagem_url: "",
  });
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!produto) return;
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
    });
  }, [produto]);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const custo = Number(form.preco_custo) || 0;
  const venda = Number(form.preco_venda) || 0;
  const estoque = Number(form.estoque) || 0;
  const margem = venda > 0 ? `${(((venda - custo) / venda) * 100).toFixed(1)}%` : "—";

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
        id,
        nome: form.nome,
        sku: form.sku,
        codigo_barras: form.codigo_barras || null,
        categoria_id: form.categoria_id || null,
        preco_custo: custo,
        preco_venda: venda,
        estoque,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        unidade: form.unidade,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
      });
      toast.success("Alterações salvas");
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  const duplicar = async () => {
    try {
      const novo = await upsert.mutateAsync({
        nome: `${form.nome} (cópia)`,
        sku: `${form.sku}-COPIA`,
        codigo_barras: null,
        categoria_id: form.categoria_id || null,
        preco_custo: custo,
        preco_venda: venda,
        estoque: 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        unidade: form.unidade,
        ativo: form.ativo,
        imagem_url: form.imagem_url || null,
      });
      toast.success("Produto duplicado");
      if (novo?.id) navigate({ to: "/produtos/$id", params: { id: novo.id } });
    } catch (e: any) { toast.error(e.message ?? "Erro ao duplicar"); }
  };

  const excluir = async () => {
    if (!confirm(`Excluir o produto "${form.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Produto excluído");
      navigate({ to: "/produtos" });
    } catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando produto...</div>;
  }
  if (!produto) {
    return (
      <div>
        <Link to="/produtos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
        <div className="rounded-xl border border-dashed bg-card/60 p-10 text-center text-sm text-muted-foreground">Produto não encontrado</div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/produtos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
      <PageHeader title={form.nome || "Produto"} description={`SKU ${form.sku}${form.codigo_barras ? ` · EAN ${form.codigo_barras}` : ""}`} actions={
        <>
          <button onClick={excluir} disabled={del.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
          <button onClick={duplicar} disabled={upsert.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-60"><Copy className="h-3.5 w-3.5" /> Duplicar</button>
          <button onClick={salvar} disabled={upsert.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">{upsert.isPending ? "Salvando..." : "Salvar alterações"}</button>
        </>
      } />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SectionCard title="Identificação">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome do produto" full><input value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inputCls} /></Field>
              <Field label="SKU"><input value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} /></Field>
              <Field label="Código de barras (EAN)"><input value={form.codigo_barras} onChange={(e) => set("codigo_barras", e.target.value)} className={inputCls} /></Field>
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
              <Field label="Preço de custo"><input type="number" step="0.01" value={form.preco_custo} onChange={(e) => set("preco_custo", e.target.value)} className={inputCls} /></Field>
              <Field label="Preço de venda"><input type="number" step="0.01" value={form.preco_venda} onChange={(e) => set("preco_venda", e.target.value)} className={inputCls} /></Field>
              <Field label="Margem"><input disabled value={margem} className={`${inputCls} bg-muted/40`} /></Field>
            </div>
          </SectionCard>

          <SectionCard title="Estoque">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Estoque atual"><input type="number" value={form.estoque} onChange={(e) => set("estoque", e.target.value)} className={inputCls} /></Field>
              <Field label="Estoque mínimo"><input type="number" value={form.estoque_minimo} onChange={(e) => set("estoque_minimo", e.target.value)} className={inputCls} /></Field>
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
                  <p className="mt-2 text-xs font-medium">Sem imagem</p>
                  <p className="text-[11px]">Gere com IA ou cole uma URL</p>
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

          <SectionCard title="Resumo">
            <div className="space-y-2">
              <Row label="Margem" value={margem} accent="text-success" />
              <Row label="Lucro unitário" value={formatBRL(venda - custo)} />
              <Row label="Valor em estoque" value={formatBRL(venda * estoque)} />
              <Row label="Custo total estocado" value={formatBRL(custo * estoque)} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}