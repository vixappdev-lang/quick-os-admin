import { createFileRoute } from "@tanstack/react-router";
import { Download, Calendar } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { DataTable, type Column } from "@/components/data-table";
import { formasPagamento, vendasSemana, produtos } from "@/data/mock";
import { formatBRL } from "@/lib/format";
import { DollarSign, ShoppingBag, TrendingUp, Package2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Quick OS" }] }),
  component: () => {
    const topProdutos = [...produtos].sort((a, b) => b.preco * 50 - a.preco * 50).slice(0, 6);
    const cols: Column<typeof produtos[number]>[] = [
      { key: "nome", header: "Produto", render: (p) => <span className="font-medium">{p.nome}</span> },
      { key: "categoria", header: "Categoria" },
      { key: "vendas", header: "Vendidos", align: "right", render: () => <span className="tabular">{Math.floor(Math.random() * 80 + 20)}</span> },
      { key: "preco", header: "Receita", align: "right", render: (p) => formatBRL(p.preco * 40) },
    ];
    return (
      <div>
        <PageHeader title="Relatórios" description="Análise consolidada de performance" actions={
          <>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Calendar className="h-3.5 w-3.5" /> Últimos 30 dias</button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Download className="h-3.5 w-3.5" /> Exportar PDF</button>
          </>
        } />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Faturamento" value={formatBRL(486200)} icon={DollarSign} accent="primary" delta={14.2} />
          <KpiCard label="Lucro" value={formatBRL(148900)} icon={TrendingUp} accent="success" delta={11.8} />
          <KpiCard label="Ticket médio" value={formatBRL(132.4)} icon={ShoppingBag} accent="info" delta={4.1} />
          <KpiCard label="Itens vendidos" value="3.842" icon={Package2} accent="warning" delta={6.7} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title="Vendas por dia" className="lg:col-span-2" padded={false}>
            <div className="h-64 p-4">
              <ResponsiveContainer><BarChart data={vendasSemana}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="vendas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer>
            </div>
          </SectionCard>
          <SectionCard title="Métodos de pagamento" padded={false}>
            <div className="h-64 p-4">
              <ResponsiveContainer><PieChart>
                <Pie data={formasPagamento} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {formasPagamento.map((_, i) => <Cell key={i} fill={`var(--chart-${i + 1})`} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
              </PieChart></ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
        <div className="mt-4">
          <SectionCard title="Top produtos do período" padded={false}><DataTable columns={cols} rows={topProdutos} /></SectionCard>
        </div>
      </div>
    );
  },
});