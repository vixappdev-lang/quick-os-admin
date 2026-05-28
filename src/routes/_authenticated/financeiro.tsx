import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { formatBRL, formatDate } from "@/lib/format";
import { TrendingUp, TrendingDown, CircleDollarSign, Wallet, Plus, Trash2, Check } from "lucide-react";
import {
  usePedidos, useDespesas, useCaixaAtual,
  usePatrimonio, useUpsertPatrimonio, useDeletePatrimonio,
  useContas, useUpsertConta, useDeleteConta,
  useUpsertDespesa,
  useFaturamentos,
} from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — LyneCloud" }] }),
  component: FinanceiroPage,
});

type Tab = "fluxo" | "contas" | "patrimonio" | "despesas";

function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("fluxo");
  return (
    <div>
      <PageHeader title="Financeiro" description="Fluxo de caixa, contas a pagar, patrimônio e despesas" />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-subtle w-fit">
        {([
          ["fluxo", "Fluxo de caixa"],
          ["contas", "Contas a pagar"],
          ["patrimonio", "Patrimônio"],
          ["despesas", "Despesas"],
        ] as [Tab, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`h-8 rounded-md px-3 text-xs font-medium transition ${
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >{l}</button>
        ))}
      </div>
      {tab === "fluxo" && <Fluxo />}
      {tab === "contas" && <Contas />}
      {tab === "patrimonio" && <Patrimonio />}
      {tab === "despesas" && <Despesas />}
    </div>
  );
}

function Fluxo() {
  const { data: pedidos = [] } = usePedidos();
  const { data: despesas = [] } = useDespesas();
  const { data: caixa } = useCaixaAtual();
  const { data: faturamentos = [] } = useFaturamentos();
  const [range, setRange] = useState<7 | 15 | 30 | 60 | 90>(30);
  const { entradas, saidas, dias, fatTotal } = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - (range - 1)); start.setHours(0, 0, 0, 0);
    const arr: { dia: string; entradas: number; saidas: number }[] = [];
    let totalIn = 0, totalOut = 0;
    for (let i = 0; i < range; i++) {
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
    const fatTotal = faturamentos
      .filter((f: any) => new Date(f.created_at) >= start)
      .reduce((s: number, f: any) => s + Number(f.total ?? 0), 0);
    return { entradas: totalIn, saidas: totalOut, dias: arr, fatTotal };
  }, [pedidos, despesas, range, faturamentos]);
  const caixaTotal = caixa
    ? Number(caixa.valor_inicial) + (caixa.movimentos ?? []).reduce(
        (s: number, m: any) => s + (m.tipo === "suprimento" || m.tipo === "venda" ? Number(m.valor) : -Number(m.valor)), 0)
    : 0;
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Entradas" value={formatBRL(entradas)} icon={TrendingUp} accent="success" />
        <KpiCard label="Saídas" value={formatBRL(saidas)} icon={TrendingDown} accent="warning" />
        <KpiCard label="Saldo líquido" value={formatBRL(entradas - saidas)} icon={CircleDollarSign} accent="primary" />
        <KpiCard label="Faturamento" value={formatBRL(fatTotal)} icon={CircleDollarSign} accent="info" />
        <KpiCard label="Caixa" value={caixa ? formatBRL(caixaTotal) : "Fechado"} icon={Wallet} accent="info" />
      </div>
      <SectionCard
        title="Movimentação diária"
        padded={false}
        actions={
          <div className="flex gap-1 rounded-md border bg-card p-0.5">
            {([7, 15, 30, 60, 90] as const).map((d) => (
              <button key={d} onClick={() => setRange(d)}
                className={`h-7 rounded px-2.5 text-[11px] font-medium transition ${range === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {d}d
              </button>
            ))}
          </div>
        }
      >
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

const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Contas() {
  const { data: contas = [], isLoading } = useContas();
  const up = useUpsertConta();
  const del = useDeleteConta();
  const [f, setF] = useState({ descricao: "", valor: "", vencimento: "", categoria: "", tipo: "pagar" as "pagar" | "receber" });
  const submit = async () => {
    if (!f.descricao || !f.valor || !f.vencimento) return toast.error("Preencha descrição, valor e vencimento");
    try {
      await up.mutateAsync({ descricao: f.descricao, valor: Number(f.valor), vencimento: f.vencimento, categoria: f.categoria || null, tipo: f.tipo, status: "pendente" });
      setF({ descricao: "", valor: "", vencimento: "", categoria: "", tipo: "pagar" });
      toast.success("Conta registrada");
    } catch (e: any) { toast.error(e.message); }
  };
  const pagar = async (c: any) => { try { await up.mutateAsync({ id: c.id, status: "pago" }); toast.success("Conta quitada"); } catch (e: any) { toast.error(e.message); } };
  const totalPagar = contas.filter((c: any) => c.tipo === "pagar" && c.status !== "pago").reduce((s: number, c: any) => s + Number(c.valor), 0);
  const totalReceber = contas.filter((c: any) => c.tipo === "receber" && c.status !== "pago").reduce((s: number, c: any) => s + Number(c.valor), 0);
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Total a pagar" value={formatBRL(totalPagar)} icon={TrendingDown} accent="warning" />
        <KpiCard label="Total a receber" value={formatBRL(totalReceber)} icon={TrendingUp} accent="success" />
      </div>
      <SectionCard title="Nova conta">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} className={inp + " md:col-span-2"} />
          <input type="number" step="0.01" placeholder="Valor" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className={inp} />
          <input type="date" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} className={inp} />
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as any })} className={inp}>
            <option value="pagar">A pagar</option>
            <option value="receber">A receber</option>
          </select>
          <button onClick={submit} disabled={up.isPending} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Adicionar</button>
        </div>
      </SectionCard>
      <SectionCard padded={false} className="mt-4">
        {isLoading ? <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40"><tr>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Descrição</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Tipo</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Vencimento</th>
              <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground">Valor</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="w-24" />
            </tr></thead>
            <tbody>
              {contas.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">Nenhuma conta registrada</td></tr>}
              {contas.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{c.descricao}</td>
                  <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${c.tipo === "pagar" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{c.tipo}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(c.vencimento)}</td>
                  <td className="px-4 py-2.5 text-right tabular font-semibold">{formatBRL(Number(c.valor))}</td>
                  <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${c.status === "pago" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{c.status}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      {c.status !== "pago" && <button onClick={() => pagar(c)} title="Quitar" className="flex h-7 w-7 items-center justify-center rounded text-success hover:bg-success/10"><Check className="h-3.5 w-3.5" /></button>}
                      <button onClick={async () => { if (confirm("Excluir conta?")) { await del.mutateAsync(c.id); toast.success("Removida"); } }} title="Excluir" className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

function Patrimonio() {
  const { data: itens = [], isLoading } = usePatrimonio();
  const up = useUpsertPatrimonio();
  const del = useDeletePatrimonio();
  const [f, setF] = useState({ nome: "", valor: "", categoria: "", data_aquisicao: "" });
  const submit = async () => {
    if (!f.nome || !f.valor) return toast.error("Preencha nome e valor");
    try {
      await up.mutateAsync({ nome: f.nome, valor: Number(f.valor), categoria: f.categoria || null, data_aquisicao: f.data_aquisicao || null });
      setF({ nome: "", valor: "", categoria: "", data_aquisicao: "" });
      toast.success("Patrimônio cadastrado");
    } catch (e: any) { toast.error(e.message); }
  };
  const total = itens.reduce((s: number, i: any) => s + Number(i.valor ?? 0), 0);
  return (
    <div>
      <div className="mb-4">
        <KpiCard label="Patrimônio total" value={formatBRL(total)} icon={Wallet} accent="primary" />
      </div>
      <SectionCard title="Novo item">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input placeholder="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inp + " md:col-span-2"} />
          <input type="number" step="0.01" placeholder="Valor" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className={inp} />
          <input placeholder="Categoria" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={inp} />
          <input type="date" value={f.data_aquisicao} onChange={(e) => setF({ ...f, data_aquisicao: e.target.value })} className={inp} />
        </div>
        <button onClick={submit} disabled={up.isPending} className="mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Adicionar</button>
      </SectionCard>
      <SectionCard padded={false} className="mt-4">
        {isLoading ? <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40"><tr>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Item</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Categoria</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Aquisição</th>
              <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground">Valor</th>
              <th className="w-16" />
            </tr></thead>
            <tbody>
              {itens.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">Nenhum item cadastrado</td></tr>}
              {itens.map((i: any) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{i.nome}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.categoria ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.data_aquisicao ? formatDate(i.data_aquisicao) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular font-semibold">{formatBRL(Number(i.valor))}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={async () => { if (confirm("Excluir item?")) { await del.mutateAsync(i.id); toast.success("Removido"); } }} className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

function Despesas() {
  const { data: despesas = [], isLoading } = useDespesas();
  const up = useUpsertDespesa();
  const [f, setF] = useState({ descricao: "", valor: "", categoria: "", vencimento: "" });
  const submit = async () => {
    if (!f.descricao || !f.valor) return toast.error("Preencha descrição e valor");
    try {
      await up.mutateAsync({ descricao: f.descricao, valor: Number(f.valor), categoria: f.categoria || null, vencimento: f.vencimento || null });
      setF({ descricao: "", valor: "", categoria: "", vencimento: "" });
      toast.success("Despesa registrada");
    } catch (e: any) { toast.error(e.message); }
  };
  const pagar = async (d: any) => { try { await up.mutateAsync({ id: d.id, descricao: d.descricao, valor: d.valor, pago: true, pago_em: new Date().toISOString() } as any); toast.success("Despesa paga"); } catch (e: any) { toast.error(e.message); } };
  return (
    <div>
      <SectionCard title="Nova despesa">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} className={inp + " md:col-span-2"} />
          <input type="number" step="0.01" placeholder="Valor" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className={inp} />
          <input placeholder="Categoria" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={inp} />
          <input type="date" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} className={inp} />
        </div>
        <button onClick={submit} disabled={up.isPending} className="mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Adicionar</button>
      </SectionCard>
      <SectionCard padded={false} className="mt-4">
        {isLoading ? <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40"><tr>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Descrição</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Categoria</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Vencimento</th>
              <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted-foreground">Valor</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="w-16" />
            </tr></thead>
            <tbody>
              {despesas.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">Nenhuma despesa</td></tr>}
              {despesas.map((d: any) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{d.descricao}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.categoria ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.vencimento ? formatDate(d.vencimento) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular font-semibold">{formatBRL(Number(d.valor))}</td>
                  <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${d.pago ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{d.pago ? "pago" : "pendente"}</span></td>
                  <td className="px-4 py-2.5 text-right">{!d.pago && <button onClick={() => pagar(d)} title="Pagar" className="flex h-7 w-7 items-center justify-center rounded text-success hover:bg-success/10"><Check className="h-3.5 w-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
