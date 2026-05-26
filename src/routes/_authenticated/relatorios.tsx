import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download, Calendar, DollarSign, ShoppingBag, TrendingUp, Package2, FileBarChart2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { formatBRL } from "@/lib/format";
import { usePedidos } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Quick OS" }] }),
  component: RelatoriosPage,
});

const PAGAMENTO_LABEL: Record<string, string> = {
  pix: "PIX", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro", fiado: "Fiado",
};

function RelatoriosPage() {
  const { data: pedidos = [] } = usePedidos();

  const { faturamento, itens, ticket, qtdPedidos, vendasDia, formas, topProdutos } = useMemo(() => {
    const validos = pedidos.filter((p: any) => p.status !== "cancelado");
    const fat = validos.reduce((s: number, p: any) => s + Number(p.total), 0);
    const itensTotal = validos.reduce((s: number, p: any) => s + (p.itens ?? []).reduce((ss: number, i: any) => ss + Number(i.qtd), 0), 0);

    // vendas dos últimos 30 dias
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0);
    const arr: { dia: string; vendas: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const v = validos.filter((p: any) => new Date(p.created_at) >= d && new Date(p.created_at) < next)
        .reduce((s: number, p: any) => s + Number(p.total), 0);
      arr.push({ dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), vendas: v });
    }

    // formas de pagamento
    const fmap: Record<string, number> = {};
    validos.filter((p: any) => p.pagamento).forEach((p: any) => {
      fmap[p.pagamento] = (fmap[p.pagamento] ?? 0) + Number(p.total);
    });
    const formasArr = Object.entries(fmap).map(([k, v]) => ({ nome: PAGAMENTO_LABEL[k] ?? k, valor: v }));

    // top produtos
    const pmap = new Map<string, { id: string; nome: string; qtd: number; receita: number }>();
    validos.forEach((p: any) => (p.itens ?? []).forEach((i: any) => {
      const id = i.produto?.id ?? i.produto_id;
      if (!id) return;
      const cur = pmap.get(id) ?? { id, nome: i.produto?.nome ?? "—", qtd: 0, receita: 0 };
      cur.qtd += Number(i.qtd);
      cur.receita += Number(i.total);
      pmap.set(id, cur);
    }));
    const top = Array.from(pmap.values()).sort((a, b) => b.receita - a.receita).slice(0, 8);

    return {
      faturamento: fat,
      itens: itensTotal,
      ticket: validos.length ? fat / validos.length : 0,
      qtdPedidos: validos.length,
      vendasDia: arr,
      formas: formasArr,
      topProdutos: top,
    };
  }, [pedidos]);

  return (
    <div>
      <PageHeader title="Relatórios" description="Análise consolidada de performance" actions={
        <>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Calendar className="h-3.5 w-3.5" /> Últimos 30 dias</button>
          <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Exportar</button>
          <Link
            to="/relatorios/catalogo"
            preload="intent"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] shadow-sm"
          >
            <FileBarChart2 className="h-3.5 w-3.5" /> Catálogo de Relatórios
          </Link>
        </>
      } />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento" value={formatBRL(faturamento)} icon={DollarSign} accent="primary" />
        <KpiCard label="Pedidos" value={String(qtdPedidos)} icon={ShoppingBag} accent="info" />
        <KpiCard label="Ticket médio" value={formatBRL(ticket)} icon={TrendingUp} accent="success" />
        <KpiCard label="Itens vendidos" value={String(itens)} icon={Package2} accent="warning" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Vendas por dia" description="Receita diária — últimos 30 dias" className="lg:col-span-2" padded={false}>
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <BarChart data={vendasDia} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" fontSize={10} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} interval={3} />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }} contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="vendas" fill="url(#gBar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Métodos de pagamento" padded={false}>
          <div className="h-72 p-4">
            {formas.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem dados ainda</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={formas} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {formas.map((_, i) => <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>
      <div className="mt-4">
        <SectionCard title="Top produtos" padded={false}>
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qtd</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Receita</th>
              </tr>
            </thead>
            <tbody>
              {topProdutos.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem vendas ainda</td></tr>
              )}
              {topProdutos.map((p) => (
                <tr key={p.id} className="border-b"><td className="px-4 py-3 font-medium">{p.nome}</td><td className="px-4 py-3 text-right tabular">{p.qtd}</td><td className="px-4 py-3 text-right tabular font-semibold">{formatBRL(p.receita)}</td></tr>
              ))}
            </tbody>
          </table></div>
        </SectionCard>
      </div>
    </div>
  );
}
