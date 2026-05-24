import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { formatBRL } from "@/lib/format";
import { TrendingUp, TrendingDown, CircleDollarSign, Wallet } from "lucide-react";
import { usePedidos, useDespesas, useCaixaAtual } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Fluxo financeiro — Quick OS" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { data: pedidos = [] } = usePedidos();
  const { data: despesas = [] } = useDespesas();
  const { data: caixa } = useCaixaAtual();

  const { entradas, saidas, dias } = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0);
    const arr: { dia: string; entradas: number; saidas: number }[] = [];
    let totalIn = 0, totalOut = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const e = pedidos
        .filter((p: any) => p.status !== "cancelado" && new Date(p.created_at) >= d && new Date(p.created_at) < next)
        .reduce((s: number, p: any) => s + Number(p.total), 0);
      const s = despesas
        .filter((x: any) => x.pago && x.pago_em && new Date(x.pago_em) >= d && new Date(x.pago_em) < next)
        .reduce((acc: number, x: any) => acc + Number(x.valor), 0);
      totalIn += e; totalOut += s;
      arr.push({ dia: d.toLocaleDateString("pt-BR", { day: "2-digit" }), entradas: e, saidas: s });
    }
    return { entradas: totalIn, saidas: totalOut, dias: arr };
  }, [pedidos, despesas]);

  const caixaTotal = caixa
    ? Number(caixa.valor_inicial) + (caixa.movimentos ?? []).reduce(
        (s: number, m: any) => s + (m.tipo === "suprimento" || m.tipo === "venda" ? Number(m.valor) : -Number(m.valor)), 0)
    : 0;

  return (
    <div>
      <PageHeader title="Fluxo Financeiro" description="Entradas e saídas — últimos 30 dias" />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Entradas" value={formatBRL(entradas)} icon={TrendingUp} accent="success" />
        <KpiCard label="Saídas" value={formatBRL(saidas)} icon={TrendingDown} accent="warning" />
        <KpiCard label="Saldo líquido" value={formatBRL(entradas - saidas)} icon={CircleDollarSign} accent="primary" />
        <KpiCard label="Caixa" value={caixa ? formatBRL(caixaTotal) : "Fechado"} icon={Wallet} accent="info" />
      </div>
      <SectionCard title="Movimentação diária" padded={false}>
        <div className="h-80 p-4">
          <ResponsiveContainer>
            <AreaChart data={dias}>
              <defs>
                <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--success)" stopOpacity={0} /></linearGradient>
                <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
              <Area type="monotone" dataKey="entradas" stroke="var(--success)" strokeWidth={2} fill="url(#ge)" />
              <Area type="monotone" dataKey="saidas" stroke="var(--destructive)" strokeWidth={2} fill="url(#gs)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
