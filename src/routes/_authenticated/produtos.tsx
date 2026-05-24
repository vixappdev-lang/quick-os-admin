import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Package, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProdutos, useCategorias } from "@/lib/queries";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Quick OS" }] }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const { data: produtos = [], isLoading } = useProdutos();
  const { data: categorias = [] } = useCategorias();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const [selected, setSelected] = useState<any | null>(null);

  const filtrados = useMemo(() => produtos.filter((p: any) =>
    (cat === "todas" || p.categoria_id === cat) &&
    (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku?.toLowerCase().includes(busca.toLowerCase()))
  ), [produtos, busca, cat]);

  const baixo = produtos.filter((p: any) => Number(p.estoque) < Number(p.estoque_minimo ?? 0)).length;
  const ruptura = produtos.filter((p: any) => Number(p.estoque) <= 0).length;

  const columns: Column<any>[] = [
    { key: "img", header: "", render: (p) => (
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
        {p.imagem_url
          ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" />
          : <Package className="h-4 w-4 text-muted-foreground" />}
      </div>
    ), className: "w-14" },
    { key: "nome", header: "Produto", render: (p) => <div><p className="font-medium text-foreground">{p.nome}</p><p className="text-xs text-muted-foreground">{p.categoria?.nome ?? "—"}</p></div> },
    { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-xs text-muted-foreground">{p.sku}</span> },
    { key: "estoque", header: "Estoque", align: "right", render: (p) => <span className={Number(p.estoque) < Number(p.estoque_minimo ?? 0) ? "text-destructive font-semibold" : ""}>{Number(p.estoque)} {p.unidade}</span> },
    { key: "custo", header: "Custo", align: "right", render: (p) => <span className="text-muted-foreground">{formatBRL(Number(p.preco_custo ?? 0))}</span> },
    { key: "preco", header: "Venda", align: "right", render: (p) => <span className="font-semibold">{formatBRL(Number(p.preco_venda))}</span> },
  ];

  return (
    <div>
      <PageHeader title="Produtos" description={`${produtos.length} produto${produtos.length === 1 ? "" : "s"} cadastrado${produtos.length === 1 ? "" : "s"}`} actions={
        <Link to="/produtos/novo" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Novo produto</Link>
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
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto, SKU..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="todas">Todas as categorias</option>
            {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Carregando produtos...</div> : <DataTable columns={columns} rows={filtrados} onRowClick={(p) => setSelected(p)} />}
      </SectionCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span className="truncate">{selected?.nome}</span>
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {selected.imagem_url
                  ? <img src={selected.imagem_url} alt={selected.nome} className="h-full w-full object-cover" />
                  : <Package className="h-12 w-12 text-muted-foreground" />}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="SKU" value={selected.sku} mono />
                <Info label="EAN" value={selected.codigo_barras ?? "—"} mono />
                <Info label="Categoria" value={selected.categoria?.nome ?? "—"} />
                <Info label="Unidade" value={selected.unidade} />
                <Info label="Custo" value={formatBRL(Number(selected.preco_custo ?? 0))} />
                <Info label="Venda" value={formatBRL(Number(selected.preco_venda))} />
                <Info label="Estoque" value={`${Number(selected.estoque)} ${selected.unidade}`} />
                <Info label="Mínimo" value={String(Number(selected.estoque_minimo ?? 0))} />
              </dl>
              <div className="flex gap-2">
                <Link to="/produtos/$id" params={{ id: selected.id }} className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Editar produto</Link>
                <button onClick={() => setSelected(null)} className="inline-flex h-9 items-center justify-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Fechar</button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "font-medium"}>{value}</dd>
    </div>
  );
}