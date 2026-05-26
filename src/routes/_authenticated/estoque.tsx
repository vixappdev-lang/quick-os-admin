import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes, AlertTriangle, TrendingDown, PackageCheck, Pencil, Trash2, Eye, Tag, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { useProdutos, useDeleteProduto } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { ProductFormPanel, type PanelMode } from "@/components/product-form-panel";
import { CategoriasManager } from "@/components/categorias-manager";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Quick OS" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const { data: produtos = [], isLoading } = useProdutos();
  const del = useDeleteProduto();
  const valorTotal = produtos.reduce((s, p) => s + Number(p.preco_venda) * Number(p.estoque), 0);
  const baixo = produtos.filter((p) => Number(p.estoque) < Number(p.estoque_minimo ?? 0));
  const totalUn = produtos.reduce((s, p) => s + Number(p.estoque), 0);
  const [panel, setPanel] = useState<{ open: boolean; mode: PanelMode; produto: any | null }>({ open: false, mode: "view", produto: null });
  const [catOpen, setCatOpen] = useState(false);

  const openView = (p: any) => setPanel({ open: true, mode: "view", produto: p });
  const openEdit = (p: any) => setPanel({ open: true, mode: "edit", produto: p });
  const excluir = async (p: any) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await del.mutateAsync(p.id); toast.success("Produto excluído"); }
    catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Controle de inventário em tempo real"
        actions={
          <>
            <button onClick={() => setCatOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Tag className="h-3.5 w-3.5" /> Categorias
            </button>
            <Link to="/estoque/movimentacoes" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              Ver movimentações
            </Link>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Itens em estoque" value={String(totalUn)} icon={Boxes} accent="primary" />
        <KpiCard label="Valor total" value={formatBRL(valorTotal)} icon={PackageCheck} accent="success" />
        <KpiCard label="Estoque baixo" value={String(baixo.length)} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Em ruptura" value={String(produtos.filter(p => Number(p.estoque) <= 0).length)} icon={TrendingDown} accent="info" />
      </div>
      <SectionCard title="Inventário" description="Todos os produtos com saldo monitorado" padded={false}>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum produto cadastrado</div>
        ) : (
          <>
            {/* Desktop: tabela com ações */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-14 px-4 py-2.5"></th>
                    <th className="px-4 py-2.5 text-left">Produto</th>
                    <th className="px-4 py-2.5 text-left">Categoria</th>
                    <th className="px-4 py-2.5 text-right">Atual</th>
                    <th className="px-4 py-2.5 text-right">Mínimo</th>
                    <th className="px-4 py-2.5 text-right">Valor em estoque</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="w-28 px-4 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p: any) => {
                    const baixo = Number(p.estoque) < Number(p.estoque_minimo ?? 0);
                    return (
                      <tr key={p.id} className="border-b cursor-pointer hover:bg-muted/40" onClick={() => openView(p)}>
                        <td className="px-4 py-2.5">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                            {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{p.nome}</p>
                          <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.categoria?.nome ?? "—"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular">
                          <span className={baixo ? "font-semibold text-destructive" : "font-medium"}>{Number(p.estoque)} {p.unidade}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{Number(p.estoque_minimo ?? 0)}</td>
                        <td className="px-4 py-2.5 text-right tabular">{formatBRL(Number(p.preco_venda) * Number(p.estoque))}</td>
                        <td className="px-4 py-2.5">
                          {baixo ? <StatusBadge status="crítico" tone="danger" /> : <StatusBadge status="ok" tone="success" />}
                        </td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => openView(p)} title="Ver" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye className="h-3.5 w-3.5" /></button>
                            <button onClick={() => openEdit(p)} title="Editar" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => excluir(p)} title="Excluir" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile: cards */}
            <div className="md:hidden divide-y">
              {produtos.map((p: any) => {
                const baixo = Number(p.estoque) < Number(p.estoque_minimo ?? 0);
                return (
                  <div key={p.id} className="flex items-start gap-3 p-3">
                    <button onClick={() => openView(p)} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => openView(p)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{p.sku} · {p.categoria?.nome ?? "sem categoria"}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className={baixo ? "font-semibold text-destructive tabular" : "tabular"}>{Number(p.estoque)} {p.unidade}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="tabular">{formatBRL(Number(p.preco_venda))}</span>
                        {baixo && <StatusBadge status="baixo" tone="danger" />}
                      </div>
                    </button>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => openEdit(p)} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => excluir(p)} title="Excluir" className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      <ProductFormPanel
        open={panel.open}
        mode={panel.mode}
        produto={panel.produto}
        onClose={() => setPanel((s) => ({ ...s, open: false }))}
        onModeChange={(m) => setPanel((s) => ({ ...s, mode: m }))}
      />
      <CategoriasManager open={catOpen} onOpenChange={setCatOpen} />
    </div>
  );
}