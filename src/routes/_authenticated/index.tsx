import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DollarSign, ShoppingBag, TrendingUp, CircleDollarSign, Package2, Wallet,
  AlertTriangle, ArrowRight, FileText, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { formatBRL, formatTime } from "@/lib/format";
import { kpis, vendasSemana, formasPagamento, horariosPico, fluxoMes, pedidos, produtos, movimentacoes, nfes } from "@/data/mock";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — Quick OS" }] }),
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
  const estoqueBaixo = produtos.filter((p) => p.estoque < p.estoqueMin).slice(0, 5);
  const ultimosPedidos = pedidos.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        description="Centro operacional · domingo, 24 de maio · 19:42"
        actions={
          <>
            <button className="h-9 rounded-md border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">Exportar</button>
            <Link to="/relatorios" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              Ver relatórios <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Vendas hoje" value={formatBRL(kpis.vendasHoje)} delta={kpis.vendasDelta} icon={DollarSign} accent="primary" />
        <KpiCard label="Pedidos" value={String(kpis.pedidosHoje)} delta={kpis.pedidosDelta} icon={ShoppingBag} accent="info" />
        <KpiCard label="Ticket médio" value={formatBRL(kpis.ticketMedio)} delta={kpis.ticketDelta} icon={TrendingUp} accent="success" />
        <KpiCard label="Lucro" value={formatBRL(kpis.lucroHoje)} delta={kpis.lucroDelta} icon={CircleDollarSign} accent="success" />
        <KpiCard label="Produtos vendidos" value={String(kpis.produtosVendidos)} delta={kpis.produtosDelta} icon={Package2} accent="warning" />
        <KpiCard label="Caixa atual" value={formatBRL(kpis.caixaAtual)} icon={Wallet} accent="primary" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Vendas da semana" description="Receita e lucro por dia" className="lg:col-span-2" padded={false}>
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <AreaChart data={vendasSemana}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Area type="monotone" dataKey="vendas" stroke="var(--primary)" strokeWidth={2} fill="url(#gv)" />
                <Line type="monotone" dataKey="lucro" stroke="var(--success)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Formas de pagamento" description="Hoje · R$ 18.432,50" padded={false}>
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={formasPagamento} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {formasPagamento.map((e, i) => <Cell key={i} fill={`var(--chart-${i + 1})`} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t p-4 text-xs">
            {formasPagamento.map((f, i) => (
              <div key={f.nome} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: `var(--chart-${i + 1})` }} />
                <span className="text-muted-foreground">{f.nome}</span>
                <span className="ml-auto tabular font-medium">{formatBRL(f.valor)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Horários de pico" padded={false}>
          <div className="h-56 p-4">
            <ResponsiveContainer>
              <BarChart data={horariosPico}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hora" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="vendas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Fluxo financeiro" description="Últimos 30 dias" className="lg:col-span-2" padded={false}>
          <div className="h-56 p-4">
            <ResponsiveContainer>
              <LineChart data={fluxoMes}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="entradas" stroke="var(--success)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saidas" stroke="var(--destructive)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Estoque baixo" description="Reposição prioritária" actions={<Link to="/estoque" className="text-xs font-medium text-primary hover:underline">Ver estoque</Link>} padded={false}>
          <ul className="divide-y">
            {estoqueBaixo.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold text-destructive">{p.estoque} un</p>
                  <p className="text-[11px] text-muted-foreground">min {p.estoqueMin}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Pedidos recentes" actions={<Link to="/pedidos" className="text-xs font-medium text-primary hover:underline">Ver todos</Link>} padded={false}>
          <ul className="divide-y">
            {ultimosPedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.numero}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.cliente} · {formatTime(p.data)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm font-semibold">{formatBRL(p.total)}</span>
                  <StatusBadge status={p.status} tone={statusTone(p.status)} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Alertas operacionais" padded={false}>
          <ul className="divide-y">
            <li className="flex items-start gap-3 px-5 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">3 produtos críticos</p>
                <p className="text-xs text-muted-foreground">Vodka, Red Bull, Whisky JW</p>
              </div>
            </li>
            <li className="flex items-start gap-3 px-5 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">NF-e 00012340 com divergência</p>
                <p className="text-xs text-muted-foreground">Diageo Brasil — 2 itens</p>
              </div>
            </li>
            <li className="flex items-start gap-3 px-5 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                <CircleDollarSign className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">2 contas vencem em 48h</p>
                <p className="text-xs text-muted-foreground">Total R$ 13.400,00</p>
              </div>
            </li>
            <li className="flex items-start gap-3 px-5 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Meta diária 92% atingida</p>
                <p className="text-xs text-muted-foreground">Restam R$ 1.567 para 100%</p>
              </div>
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Movimentações recentes" actions={<Link to="/movimentacoes" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>} padded={false}>
          <ul className="divide-y">
            {movimentacoes.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${m.tipo === "entrada" ? "bg-success/10 text-success" : m.tipo === "saída" ? "bg-info/10 text-info" : m.tipo === "perda" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    {m.qtd > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.produto}</p>
                    <p className="text-xs text-muted-foreground">{m.origem} · {m.operador}</p>
                  </div>
                </div>
                <span className={`tabular text-sm font-semibold ${m.qtd > 0 ? "text-success" : "text-destructive"}`}>{m.qtd > 0 ? "+" : ""}{m.qtd}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Entradas NF-e recentes" actions={<Link to="/nfe" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>} padded={false}>
          <ul className="divide-y">
            {nfes.map((n) => (
              <li key={n.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">NF {n.numero}</p>
                  <p className="text-xs text-muted-foreground">{n.emissor} · {n.itens} itens</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-sm font-semibold">{formatBRL(n.valor)}</span>
                  <StatusBadge status={n.status} tone={statusTone(n.status)} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}