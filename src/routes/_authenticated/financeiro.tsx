import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { fluxoMes } from "@/data/mock";
import { formatBRL } from "@/lib/format";
import { TrendingUp, TrendingDown, CircleDollarSign, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Fluxo financeiro — Quick OS" }] }),
  component: () => {
    const entradas = fluxoMes.reduce((s, d) => s + d.entradas, 0);
    const saidas = fluxoMes.reduce((s, d) => s + d.saidas, 0);
    return (
      <div>
        <PageHeader title="Fluxo Financeiro" description="Visão consolidada de entradas e saídas" />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Entradas (30d)" value={formatBRL(entradas)} icon={TrendingUp} accent="success" delta={18.4} />
          <KpiCard label="Saídas (30d)" value={formatBRL(saidas)} icon={TrendingDown} accent="warning" delta={9.2} />
          <KpiCard label="Saldo líquido" value={formatBRL(entradas - saidas)} icon={CircleDollarSign} accent="primary" delta={24.1} />
          <KpiCard label="Caixa" value={formatBRL(7240.9)} icon={Wallet} accent="info" />
        </div>
        <SectionCard title="Movimentação mensal" padded={false}>
          <div className="h-80 p-4">
            <ResponsiveContainer>
              <AreaChart data={fluxoMes}>
                <defs>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--success)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                <Area type="monotone" dataKey="entradas" stroke="var(--success)" strokeWidth={2} fill="url(#ge)" />
                <Area type="monotone" dataKey="saidas" stroke="var(--destructive)" strokeWidth={2} fill="url(#gs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    );
  },
});