import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DollarSign, ShoppingBag, TrendingUp, Package2, Wallet, AlertTriangle,
  ArrowRight, ArrowUpRight,
} from "lucide-react";
import {
  Area, AreaChart, Cell, CartesianGrid, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMemo } from "react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { formatBRL, formatTime } from "@/lib/format";
import { usePedidos, useProdutos, useCaixaAtual } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — LyneCloud" }] }),
  component: Dashboard,
});

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "var(--shadow-md)",
};

function Dashboard() {
  const { data: pedidos = [] } = usePedidos();
  const { data: produtos = [] } = useProdutos();
  const { data: caixa } = useCaixaAtual();

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const pedidosHoje = pedidos.filter((p) => new Date(p.created_at) >= hoje);
  const vendasHoje = pedidosHoje.filter((p) => p.status !== "cancelado").reduce((s, p) => s + Number(p.total), 0);
  const ticket = pedidosHoje.length ? vendasHoje / pedidosHoje.length : 0;
  const produtosVendidos = pedidosHoje.reduce(
    (s, p) => s + (p.itens ?? []).reduce((ss: number, i: any) => ss + Number(i.qtd), 0),
    0,
  );

  const caixaTotal = caixa
    ? Number(caixa.valor_inicial) +
      (caixa.movimentos ?? []).reduce(
        (s: number, m: any) =>
          s + (m.tipo === "suprimento" || m.tipo === "venda" ? Number(m.valor) : -Number(m.valor)),
        0,
      )
    : 0;

  const semana = useMemo(() => {
    const arr: { dia: string; vendas: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const total = pedidos
        .filter((p) => p.status !== "cancelado" && new Date(p.created_at) >= d && new Date(p.created_at) < next)
        .reduce((s, p) => s + Number(p.total), 0);
      arr.push({ dia: d.toLocaleDateString("pt-BR", { weekday: "short" }), vendas: total });
    }
    return arr;
  }, [pedidos]);

  const formas = useMemo(() => {
    const map: Record<string, number> = {};
    pedidos.filter((p) => p.pagamento && p.status !== "cancelado").forEach((p) => {
      const k = p.pagamento as string;
      map[k] = (map[k] ?? 0) + Number(p.total);
    });
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor }));
  }, [pedidos]);

  const estoqueBaixo = produtos
    .filter((p) => Number(p.estoque) < Number(p.estoque_minimo ?? 0))
    .slice(0, 5);
  const ultimosPedidos = pedidos.slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        description={`Centro operacional · ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}`}
        actions={
          <Link to="/relatorios" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
            Ver relatórios <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <KpiCard label="Vendas hoje" value={formatBRL(vendasHoje)} icon={DollarSign} accent="primary" />
        <KpiCard label="Pedidos hoje" value={String(pedidosHoje.length)} icon={ShoppingBag} accent="info" />
        <KpiCard label="Ticket médio" value={formatBRL(ticket)} icon={TrendingUp} accent="success" />
        <KpiCard label="Itens vendidos" value={String(produtosVendidos)} icon={Package2} accent="warning" />
        <KpiCard label="Caixa" value={caixa ? formatBRL(caixaTotal) : "Fechado"} icon={Wallet} accent="primary" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Vendas da semana" description="Receita por dia · últimos 7 dias" className="lg:col-span-2" padded={false}>
          <div className="h-64 p-4">
            <ResponsiveContainer>
              <AreaChart data={semana}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Area type="monotone" dataKey="vendas" stroke="var(--primary)" strokeWidth={2} fill="url(#gv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Formas de pagamento" description="Distribuição por método" padded={false}>
          <div className="h-64 p-4">
            {formas.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem pedidos ainda</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={formas} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {formas.map((_, i) => <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Estoque baixo"
          description="Reposição prioritária"
          actions={<Link to="/estoque" className="text-xs font-medium text-primary hover:underline">Ver estoque</Link>}
          padded={false}
        >
          <ul className="divide-y">
            {estoqueBaixo.length === 0 && (
              <li className="px-5 py-6 text-center text-xs text-muted-foreground">Estoque saudável</li>
            )}
            {estoqueBaixo.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold text-destructive">{p.estoque} un</p>
                  <p className="text-[11px] text-muted-foreground">min {p.estoque_minimo}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Pedidos recentes"
          actions={<Link to="/pedidos" className="text-xs font-medium text-primary hover:underline">Ver todos</Link>}
          padded={false}
        >
          <ul className="divide-y">
            {ultimosPedidos.length === 0 && (
              <li className="px-5 py-6 text-center text-xs text-muted-foreground">Nenhum pedido</li>
            )}
            {ultimosPedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.numero}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.cliente?.nome ?? "—"} · {formatTime(p.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm font-semibold">{formatBRL(Number(p.total))}</span>
                  <StatusBadge status={p.status} tone={statusTone(p.status)} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Alertas" padded={false}>
          <ul className="divide-y">
            {estoqueBaixo.length > 0 && (
              <li className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{estoqueBaixo.length} produto(s) abaixo do mínimo</p>
                  <p className="text-xs text-muted-foreground">Repor o quanto antes</p>
                </div>
              </li>
            )}
            {!caixa && (
              <li className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Caixa fechado</p>
                  <Link to="/caixa" className="text-xs text-primary hover:underline">Abrir caixa</Link>
                </div>
              </li>
            )}
            {estoqueBaixo.length === 0 && caixa && (
              <li className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Tudo nos conformes</p>
                  <p className="text-xs text-muted-foreground">Operação saudável</p>
                </div>
              </li>
            )}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
