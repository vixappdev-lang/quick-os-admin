import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { formatBRL } from "@/lib/format";
import { useCaixaAtual, useAbrirCaixa, useFecharCaixa, useCaixaMovimento } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({ meta: [{ title: "Caixa — Quick OS" }] }),
  component: CaixaPage,
});

function CaixaPage() {
  const { user } = useAuth();
  const { data: caixa, isLoading } = useCaixaAtual();
  const abrir = useAbrirCaixa();
  const fechar = useFecharCaixa();
  const mov = useCaixaMovimento();
  const [vi, setVi] = useState("0");
  const [vf, setVf] = useState("0");
  const [movValor, setMovValor] = useState("");

  const movs = (caixa?.movimentos ?? []) as any[];
  const entradas = movs.filter((m) => ["suprimento", "venda"].includes(m.tipo)).reduce((s, m) => s + Number(m.valor), 0);
  const saidas = movs.filter((m) => ["sangria", "despesa"].includes(m.tipo)).reduce((s, m) => s + Number(m.valor), 0);
  const total = caixa ? Number(caixa.valor_inicial) + entradas - saidas : 0;

  return (
    <div>
      <PageHeader
        title="Caixa"
        description={caixa ? "Sessão aberta" : "Nenhuma sessão aberta"}
        actions={
          caixa ? (
            <button
              onClick={() => fechar.mutateAsync({ id: caixa.id, valor_final: Number(vf) || total })
                .then(() => toast.success("Caixa fechado")).catch((e) => toast.error(e.message))}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:opacity-90"
            >
              <Lock className="h-3.5 w-3.5" /> Fechar caixa
            </button>
          ) : (
            <button
              onClick={() => abrir.mutateAsync({ valor_inicial: Number(vi) || 0, operador_id: user!.id })
                .then(() => toast.success("Caixa aberto")).catch((e) => toast.error(e.message))}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
            >
              <Unlock className="h-3.5 w-3.5" /> Abrir caixa
            </button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Caixa atual" value={isLoading ? "..." : caixa ? formatBRL(total) : "—"} icon={Wallet} accent="primary" />
        <KpiCard label="Entradas" value={formatBRL(entradas)} icon={ArrowDownToLine} accent="success" />
        <KpiCard label="Saídas" value={formatBRL(saidas)} icon={ArrowUpFromLine} accent="warning" />
        <KpiCard label="Inicial" value={caixa ? formatBRL(Number(caixa.valor_inicial)) : "—"} icon={Wallet} accent="info" />
      </div>

      {!caixa && (
        <SectionCard title="Abertura de caixa">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Valor inicial (fundo de troco)</label>
              <input value={vi} onChange={(e) => setVi(e.target.value)} type="number" step="0.01" className="input max-w-[200px]" />
            </div>
          </div>
        </SectionCard>
      )}

      {caixa && (
        <>
          <SectionCard title="Suprimento / Sangria">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Valor</label>
                <input value={movValor} onChange={(e) => setMovValor(e.target.value)} type="number" step="0.01" className="input max-w-[160px]" />
              </div>
              <button
                onClick={() => mov.mutateAsync({ sessao_id: caixa.id, tipo: "suprimento", valor: Number(movValor) || 0 })
                  .then(() => { setMovValor(""); toast.success("Suprimento adicionado"); })}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
              ><ArrowDownToLine className="h-3.5 w-3.5" /> Suprimento</button>
              <button
                onClick={() => mov.mutateAsync({ sessao_id: caixa.id, tipo: "sangria", valor: Number(movValor) || 0 })
                  .then(() => { setMovValor(""); toast.success("Sangria registrada"); })}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
              ><ArrowUpFromLine className="h-3.5 w-3.5" /> Sangria</button>
            </div>
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Movimentos da sessão" padded={false}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem movimentos</td></tr>
                  )}
                  {movs.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="px-4 py-3 capitalize">{m.tipo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.descricao ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular font-semibold">{formatBRL(Number(m.valor))}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>

          <div className="mt-4">
            <SectionCard title="Fechamento">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Valor conferido</label>
                  <input value={vf} onChange={(e) => setVf(e.target.value)} type="number" step="0.01" placeholder={String(total.toFixed(2))} className="input max-w-[200px]" />
                </div>
                <p className="text-xs text-muted-foreground">Esperado: <span className="tabular font-semibold text-foreground">{formatBRL(total)}</span></p>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
