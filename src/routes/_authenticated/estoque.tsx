import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, AlertTriangle, TrendingDown, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { produtos, type Produto } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Quick OS" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const valorTotal = produtos.reduce((s, p) => s + p.preco * p.estoque, 0);
  const baixo = produtos.filter((p) => p.estoque < p.estoqueMin);

  const cols: Column<Produto>[] = [
    { key: "nome", header: "Produto", render: (p) => <div><p className="font-medium">{p.nome}</p><p className="text-xs text-muted-foreground">{p.sku}</p></div> },
    { key: "categoria", header: "Categoria", render: (p) => <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.categoria}</span> },
    { key: "estoque", header: "Atual", align: "right", render: (p) => <span className={p.estoque < p.estoqueMin ? "font-semibold text-destructive" : "font-medium"}>{p.estoque}</span> },
    { key: "min", header: "Mínimo", align: "right", render: (p) => <span className="text-muted-foreground">{p.estoqueMin}</span> },
    { key: "valor", header: "Valor em estoque", align: "right", render: (p) => <span>{formatBRL(p.preco * p.estoque)}</span> },
    { key: "status", header: "Status", render: (p) => p.estoque < p.estoqueMin ? <StatusBadge status="crítico" tone="danger" /> : <StatusBadge status="ok" tone="success" /> },
  ];
  return (
    <div>
      <PageHeader title="Estoque" description="Controle de inventário em tempo real" actions={<Link to="/estoque/movimentacoes" className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground leading-9 hover:bg-[var(--primary-hover)]">Ver movimentações</Link>} />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Itens em estoque" value={String(produtos.reduce((s, p) => s + p.estoque, 0))} icon={Boxes} accent="primary" />
        <KpiCard label="Valor total" value={formatBRL(valorTotal)} icon={PackageCheck} accent="success" />
        <KpiCard label="Estoque baixo" value={String(baixo.length)} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Em ruptura" value="0" icon={TrendingDown} accent="info" />
      </div>
      <SectionCard title="Inventário" description="Todos os produtos com saldo monitorado" padded={false}>
        <DataTable columns={cols} rows={produtos} />
      </SectionCard>
    </div>
  );
}