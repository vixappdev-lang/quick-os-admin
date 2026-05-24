import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Download, Filter, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { produtos, type Produto, categorias } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Quick OS" }] }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const filtrados = useMemo(() => produtos.filter((p) =>
    (cat === "todas" || p.categoria === cat) &&
    (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku.toLowerCase().includes(busca.toLowerCase()))
  ), [busca, cat]);

  const columns: Column<Produto>[] = [
    { key: "img", header: "", render: () => <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-muted to-muted/30 text-base">🍾</div>, className: "w-12" },
    { key: "nome", header: "Produto", render: (p) => <div><p className="font-medium text-foreground">{p.nome}</p><p className="text-xs text-muted-foreground">{p.fornecedor}</p></div> },
    { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-xs text-muted-foreground">{p.sku}</span> },
    { key: "categoria", header: "Categoria", render: (p) => <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.categoria}</span> },
    { key: "estoque", header: "Estoque", align: "right", render: (p) => <span className={p.estoque < p.estoqueMin ? "text-destructive font-semibold" : ""}>{p.estoque} un</span> },
    { key: "custo", header: "Custo", align: "right", render: (p) => <span className="text-muted-foreground">{formatBRL(p.precoCusto)}</span> },
    { key: "preco", header: "Venda", align: "right", render: (p) => <span className="font-semibold">{formatBRL(p.preco)}</span> },
    { key: "margem", header: "Margem", align: "right", render: (p) => <span className="text-success">{(((p.preco - p.precoCusto) / p.preco) * 100).toFixed(1)}%</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} tone={statusTone(p.status)} /> },
  ];

  return (
    <div>
      <PageHeader title="Produtos" description={`${produtos.length} produtos cadastrados`} actions={
        <>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Exportar</button>
          <Link to="/produtos/novo" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Novo produto</Link>
        </>
      } />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          { l: "Total produtos", v: "294", c: "text-foreground" },
          { l: "Em estoque", v: "276", c: "text-success" },
          { l: "Estoque baixo", v: "12", c: "text-warning" },
          { l: "Ruptura", v: "6", c: "text-destructive" },
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
            {categorias.map((c) => <option key={c.id}>{c.nome}</option>)}
          </select>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground hover:bg-muted"><Filter className="h-3.5 w-3.5" /> Mais filtros</button>
        </div>
        <DataTable columns={columns} rows={filtrados} onRowClick={(p) => navigate({ to: "/produtos/$id", params: { id: p.id } })} />
      </SectionCard>
    </div>
  );
}