import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Package, Eye, Pencil, Trash2, MoreHorizontal, Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProdutos, useCategorias, useDeleteProduto } from "@/lib/queries";
import { generateMissingProductImages } from "@/lib/product-image.functions";
import { formatBRL } from "@/lib/format";
import { ProductFormPanel, type PanelMode } from "@/components/product-form-panel";
import { Pagination } from "@/components/pagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Quick OS" }] }),
  component: ProdutosPage,
});

const PAGE_SIZE = 12;

function ProdutosPage() {
  const { data: produtos = [], isLoading } = useProdutos();
  const { data: categorias = [] } = useCategorias();
  const del = useDeleteProduto();
  const qc = useQueryClient();
  const genMissing = useServerFn(generateMissingProductImages);
  const [gerando, setGerando] = useState(false);
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<{ open: boolean; mode: PanelMode; produto: any | null }>({ open: false, mode: "view", produto: null });

  const filtrados = useMemo(() => produtos.filter((p: any) =>
    (cat === "todas" || p.categoria_id === cat) &&
    (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku?.toLowerCase().includes(busca.toLowerCase()))
  ), [produtos, busca, cat]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtrados.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const baixo = produtos.filter((p: any) => Number(p.estoque) < Number(p.estoque_minimo ?? 0)).length;
  const ruptura = produtos.filter((p: any) => Number(p.estoque) <= 0).length;
  const semImagem = produtos.filter((p: any) => !p.imagem_url).length;

  const openCreate = () => setPanel({ open: true, mode: "create", produto: null });
  const openView = (p: any) => setPanel({ open: true, mode: "view", produto: p });
  const openEdit = (p: any) => setPanel({ open: true, mode: "edit", produto: p });
  const excluir = async (p: any) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await del.mutateAsync(p.id); toast.success("Produto excluído"); }
    catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  const gerarFaltantes = async () => {
    if (gerando) return;
    setGerando(true);
    let totalGerado = 0;
    let restante = semImagem;
    try {
      // Lote loop: até 5 rodadas de 12 = 60 produtos por clique
      for (let i = 0; i < 5 && restante > 0; i++) {
        const r: any = await genMissing();
        totalGerado += r?.processed ?? 0;
        restante = (r?.total ?? 0) - (r?.processed ?? 0);
        if (!r?.total) break;
        await qc.invalidateQueries({ queryKey: ["produtos"] });
      }
      toast.success(`${totalGerado} imagem(ns) gerada(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar imagens");
    } finally {
      setGerando(false);
      qc.invalidateQueries({ queryKey: ["produtos"] });
    }
  };

  return (
    <div>
      <PageHeader title="Produtos" description={`${produtos.length} produto${produtos.length === 1 ? "" : "s"} cadastrado${produtos.length === 1 ? "" : "s"}`} actions={
        <div className="flex flex-wrap gap-2">
          {semImagem > 0 && (
            <button onClick={gerarFaltantes} disabled={gerando} title={`${semImagem} produto(s) sem imagem`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60">
              {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {gerando ? "Gerando..." : `Gerar imagens (${semImagem})`}
            </button>
          )}
          <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Novo produto</button>
        </div>
      } />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          { l: "Total produtos", v: String(produtos.length), c: "text-foreground" },
          { l: "Em estoque", v: String(produtos.length - ruptura), c: "text-success" },
          { l: "Estoque baixo", v: String(baixo), c: "text-warning" },
          { l: "Ruptura", v: String(ruptura), c: "text-destructive" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border bg-card p-4 shadow-subtle">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.l}</p>
            <p className={`tabular mt-1 text-xl font-semibold ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Buscar produto, SKU..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="todas">Todas as categorias</option>
            {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando produtos...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-14 px-4 py-2.5"></th>
                    <th className="px-4 py-2.5 text-left">Produto</th>
                    <th className="px-4 py-2.5 text-left">SKU</th>
                    <th className="px-4 py-2.5 text-right">Estoque</th>
                    <th className="px-4 py-2.5 text-right">Custo</th>
                    <th className="px-4 py-2.5 text-right">Venda</th>
                    <th className="w-24 px-4 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum produto encontrado</td></tr>
                  )}
                  {pageRows.map((p: any) => (
                    <tr key={p.id} className="group cursor-pointer border-b hover:bg-muted/40" onClick={() => openView(p)}>
                      <td className="px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {p.imagem_url
                            ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" />
                            : <Package className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{p.categoria?.nome ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{p.sku}</span></td>
                      <td className="px-4 py-3 text-right tabular">
                        <span className={Number(p.estoque) < Number(p.estoque_minimo ?? 0) ? "text-destructive font-semibold" : ""}>{Number(p.estoque)} {p.unidade}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">{formatBRL(Number(p.preco_custo ?? 0))}</td>
                      <td className="px-4 py-3 text-right tabular font-semibold">{formatBRL(Number(p.preco_venda))}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openView(p)} title="Ver" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => openEdit(p)} title="Editar" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button title="Mais" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-40 p-1">
                              <button onClick={() => excluir(p)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtrados.length} onPageChange={setPage} />
          </>
        )}
      </SectionCard>

      <ProductFormPanel
        open={panel.open}
        mode={panel.mode}
        produto={panel.produto}
        onClose={() => setPanel((p) => ({ ...p, open: false }))}
        onModeChange={(m) => setPanel((p) => ({ ...p, mode: m }))}
      />
    </div>
  );
}