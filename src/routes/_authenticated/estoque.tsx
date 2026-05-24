import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, AlertTriangle, TrendingDown, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { useProdutos, type Produto } from "@/lib/queries";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Quick OS" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const { data: produtos = [], isLoading } = useProdutos();
  const valorTotal = produtos.reduce((s, p) => s + Number(p.preco_venda) * Number(p.estoque), 0);
  const baixo = produtos.filter((p) => Number(p.estoque) < Number(p.estoque_minimo ?? 0));
  const totalUn = produtos.reduce((s, p) => s + Number(p.estoque), 0);

  const cols: Column<any>[] = [
    { key: "nome", header: "Produto", render: (p) => <div><p className="font-medium">{p.nome}</p><p className="text-xs text-muted-foreground">{p.sku}</p></div> },
    { key: "categoria", header: "Categoria", render: (p) => <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.categoria?.nome ?? "—"}</span> },
    { key: "estoque", header: "Atual", align: "right", render: (p) => <span className={Number(p.estoque) < Number(p.estoque_minimo ?? 0) ? "font-semibold text-destructive" : "font-medium"}>{Number(p.estoque)}</span> },
    { key: "min", header: "Mínimo", align: "right", render: (p) => <span className="text-muted-foreground">{Number(p.estoque_minimo ?? 0)}</span> },
    { key: "valor", header: "Valor em estoque", align: "right", render: (p) => <span>{formatBRL(Number(p.preco_venda) * Number(p.estoque))}</span> },
    { key: "status", header: "Status", render: (p) => Number(p.estoque) < Number(p.estoque_minimo ?? 0) ? <StatusBadge status="crítico" tone="danger" /> : <StatusBadge status="ok" tone="success" /> },
  ];
  return (
    <div>
      <PageHeader title="Estoque" description="Controle de inventário em tempo real" actions={<Link to="/estoque/movimentacoes" className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground leading-9 hover:bg-[var(--primary-hover)]">Ver movimentações</Link>} />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Itens em estoque" value={String(totalUn)} icon={Boxes} accent="primary" />
        <KpiCard label="Valor total" value={formatBRL(valorTotal)} icon={PackageCheck} accent="success" />
        <KpiCard label="Estoque baixo" value={String(baixo.length)} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Em ruptura" value={String(produtos.filter(p => Number(p.estoque) <= 0).length)} icon={TrendingDown} accent="info" />
      </div>
      <SectionCard title="Inventário" description="Todos os produtos com saldo monitorado" padded={false}>
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div> : <DataTable columns={cols} rows={produtos as any} />}
      </SectionCard>
    </div>
  );
}