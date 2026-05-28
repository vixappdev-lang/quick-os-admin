import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { formatBRL } from "@/lib/format";
import { useCaixaAtual, useAbrirCaixa, useFecharCaixa, useCaixaMovimento, useCaixaHistorico, useCaixaSessaoDetalhe } from "@/lib/queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({ meta: [{ title: "Caixa — Quick OS" }] }),
  component: CaixaPage,
});

function CaixaPage() {
  const { user } = useAuth();
  const { data: caixa, isLoading } = useCaixaAtual();
  const { data: historico = [] } = useCaixaHistorico(8);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const abrir = useAbrirCaixa();
  const fechar = useFecharCaixa();
  const mov = useCaixaMovimento();
  const [vi, setVi] = useState("0");
  const [vf, setVf] = useState("0");
  const [movValor, setMovValor] = useState("");
  const [movDesc, setMovDesc] = useState("");

  const movs = (caixa?.movimentos ?? []) as any[];
  const entradas = movs.filter((m) => ["suprimento", "venda"].includes(m.tipo)).reduce((s, m) => s + Number(m.valor), 0);
  const saidas = movs.filter((m) => ["sangria", "despesa"].includes(m.tipo)).reduce((s, m) => s + Number(m.valor), 0);
  const total = caixa ? Number(caixa.valor_inicial) + entradas - saidas : 0;
  const diferenca = caixa && vf ? Number(vf) - total : 0;

  const onAbrir = async () => {
    const val = Number(vi);
    if (!Number.isFinite(val) || val < 0) return toast.error("Valor inicial inválido");
    try {
      await abrir.mutateAsync({ valor_inicial: val, operador_id: user!.id });
      setVi("0");
      toast.success("Caixa aberto");
    } catch (e: any) { toast.error(e.message); }
  };

  const onFechar = async () => {
    if (!caixa) return;
    const val = vf ? Number(vf) : total;
    if (!Number.isFinite(val)) return toast.error("Valor de fechamento inválido");
    try {
      await fechar.mutateAsync({ id: caixa.id, valor_final: val });
      setVf("0"); setVi("0"); setMovValor(""); setMovDesc("");
      toast.success("Caixa fechado");
    } catch (e: any) { toast.error(e.message); }
  };

  const lancarMov = async (tipo: "suprimento" | "sangria") => {
    if (!caixa) return;
    const val = Number(movValor);
    if (!Number.isFinite(val) || val <= 0) return toast.error("Informe um valor maior que zero");
    try {
      await mov.mutateAsync({ sessao_id: caixa.id, tipo, valor: val, descricao: movDesc || undefined });
      setMovValor(""); setMovDesc("");
      toast.success(tipo === "suprimento" ? "Suprimento adicionado" : "Sangria registrada");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader
        title="Caixa"
        description={caixa ? "Sessão aberta" : "Nenhuma sessão aberta"}
        actions={
          caixa ? (
            <button onClick={onFechar} disabled={fechar.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
              <Lock className="h-3.5 w-3.5" /> Fechar caixa
            </button>
          ) : (
            <button onClick={onAbrir} disabled={abrir.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_auto_auto] sm:items-end">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Valor</label>
                <input value={movValor} onChange={(e) => setMovValor(e.target.value)} type="number" step="0.01" min="0" className="input w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Descrição (opcional)</label>
                <input value={movDesc} onChange={(e) => setMovDesc(e.target.value)} placeholder="Ex: troco, retirada..." className="input w-full" />
              </div>
              <button onClick={() => lancarMov("suprimento")} disabled={mov.isPending} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Suprimento
              </button>
              <button onClick={() => lancarMov("sangria")} disabled={mov.isPending} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
                <ArrowUpFromLine className="h-3.5 w-3.5" /> Sangria
              </button>
            </div>
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Movimentos da sessão" padded={false}>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
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
                      <td className={"px-4 py-3 text-right tabular font-semibold " + (["sangria","despesa"].includes(m.tipo) ? "text-destructive" : "text-success")}>{["sangria","despesa"].includes(m.tipo) ? "- " : "+ "}{formatBRL(Number(m.valor))}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </SectionCard>
          </div>

          <div className="mt-4">
            <SectionCard title="Fechamento">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Valor conferido</label>
                  <input value={vf} onChange={(e) => setVf(e.target.value)} type="number" step="0.01" placeholder={String(total.toFixed(2))} className="input w-full sm:max-w-[200px]" />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Esperado: <span className="tabular font-semibold text-foreground">{formatBRL(total)}</span></p>
                  {vf && Number(vf) > 0 && (
                    <p>Diferença: <span className={"tabular font-semibold " + (diferenca === 0 ? "text-success" : diferenca > 0 ? "text-info" : "text-destructive")}>{diferenca >= 0 ? "+ " : "- "}{formatBRL(Math.abs(diferenca))}</span></p>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      )}

      <div className="mt-4">
        <SectionCard title="Histórico de sessões" description="Últimas 8 sessões de caixa" padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abertura</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fechamento</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inicial</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Final</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {historico.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma sessão registrada</td></tr>}
                {historico.map((s: any) => (
                  <tr key={s.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-3 text-xs">{new Date(s.abertura).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs">{s.fechamento ? new Date(s.fechamento).toLocaleString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-right tabular">{formatBRL(Number(s.valor_inicial))}</td>
                    <td className="px-4 py-3 text-right tabular">{s.valor_final != null ? formatBRL(Number(s.valor_final)) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={"rounded px-2 py-0.5 text-[11px] font-medium capitalize " + (s.status === "aberto" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{s.status}</span>
                        <button onClick={() => setDetalheId(s.id)} className="inline-flex h-7 items-center gap-1 rounded-md border bg-card px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                          <Eye className="h-3 w-3" /> Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SessaoDetalheDialog id={detalheId} onClose={() => setDetalheId(null)} />
    </div>
  );
}

function SessaoDetalheDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useCaixaSessaoDetalhe(id);
  const movs = (data?.movimentos ?? []) as any[];
  const vendas = movs.filter((m) => m.tipo === "venda");
  const suprimentos = movs.filter((m) => m.tipo === "suprimento");
  const sangrias = movs.filter((m) => m.tipo === "sangria");
  const totalVendas = vendas.reduce((s, m) => s + Number(m.valor), 0);
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da sessão de caixa</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Abertura" value={new Date(data.abertura).toLocaleString("pt-BR")} />
              <Stat label="Fechamento" value={data.fechamento ? new Date(data.fechamento).toLocaleString("pt-BR") : "—"} />
              <Stat label="Inicial" value={formatBRL(Number(data.valor_inicial))} />
              <Stat label="Final" value={data.valor_final != null ? formatBRL(Number(data.valor_final)) : "—"} />
            </div>
            <div className="rounded-md border bg-info/5 p-3 text-sm">
              <p className="font-semibold text-info">Faturamento da sessão: {formatBRL(totalVendas)}</p>
              <p className="text-xs text-muted-foreground">{vendas.length} venda(s) • {suprimentos.length} suprimento(s) • {sangrias.length} sangria(s)</p>
            </div>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-left">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">Sem movimentos</td></tr>
                  )}
                  {movs.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 capitalize">{m.tipo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.descricao ?? "—"}</td>
                      <td className={"px-3 py-2 text-right tabular font-semibold " + (["sangria","despesa"].includes(m.tipo) ? "text-destructive" : "text-success")}>
                        {["sangria","despesa"].includes(m.tipo) ? "- " : "+ "}{formatBRL(Number(m.valor))}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
