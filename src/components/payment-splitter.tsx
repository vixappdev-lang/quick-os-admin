import { useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PAGAMENTO_LIST, pagamentoLabel, type PaymentMethod } from "@/lib/pagamento";
import { cn } from "@/lib/utils";

export type PagamentoLinha = {
  id?: string;
  forma: PaymentMethod | string;
  condicao?: string | null;
  vencimento?: string | null; // ISO date
  valor: number;
};

interface Props {
  total: number;
  pagamentos: PagamentoLinha[];
  onAdd: (p: PagamentoLinha) => void;
  onRemove: (index: number) => void;
  /** Mostra mensagem de bloqueio quando restante != 0 */
  warnOnDiff?: boolean;
}

const CONDICOES = ["À vista", "7 dias", "15 dias", "30 dias", "60 dias", "Parcelado 2x", "Parcelado 3x"];

export function PaymentSplitter({ total, pagamentos, onAdd, onRemove, warnOnDiff = true }: Props) {
  const [forma, setForma] = useState<string>("pix");
  const [condicao, setCondicao] = useState<string>("À vista");
  const [vencimento, setVencimento] = useState<string>("");
  const [valor, setValor] = useState<string>("");

  const totalPago = useMemo(() => pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0), [pagamentos]);
  const restante = Math.max(0, Number((total - totalPago).toFixed(2)));

  const aceitar = (override?: number) => {
    const v = Number(override ?? Number(String(valor).replace(",", ".")));
    if (!Number.isFinite(v) || v <= 0) return;
    onAdd({
      forma,
      condicao: condicao || null,
      vencimento: vencimento || null,
      valor: Math.round(v * 100) / 100,
    });
    setValor("");
  };

  const restanteOk = restante < 0.005;

  return (
    <div className="space-y-3">
      {/* Linha de adição — empilhada para evitar massacre em colunas estreitas */}
      <div className="space-y-2 rounded-md border bg-card/40 p-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground">Forma</label>
            <select value={forma} onChange={(e) => setForma(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              {PAGAMENTO_LIST.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground">Condição</label>
            <select value={condicao} onChange={(e) => setCondicao(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              {CONDICOES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground">Vencimento</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground">Valor</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder={restante > 0 ? restante.toFixed(2) : "0,00"}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aceitar(); } }}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => aceitar()}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar pagamento
        </button>
      </div>

      {restante > 0 && (
        <button
          type="button"
          onClick={() => aceitar(restante)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Adicionar restante ({formatBRL(restante)})
        </button>
      )}

      {/* Lista — tabela desktop, cards mobile */}
      {pagamentos.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-md border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">Forma</th>
                  <th className="px-3 py-2 text-left">Condição</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p, i) => (
                  <tr key={p.id ?? i} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{pagamentoLabel(p.forma)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.condicao || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular">{p.vencimento ? new Date(p.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{formatBRL(Number(p.valor))}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => onRemove(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 sm:hidden">
            {pagamentos.map((p, i) => (
              <div key={p.id ?? i} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{pagamentoLabel(p.forma)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.condicao || "—"} {p.vencimento ? `· venc. ${new Date(p.vencimento).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm font-semibold">{formatBRL(Number(p.valor))}</span>
                  <button type="button" onClick={() => onRemove(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rodapé totais — empilhado e legível */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground">Total da venda</p>
            <p className="tabular text-sm font-semibold">{formatBRL(total)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total pago</p>
            <p className="tabular text-sm font-semibold">{formatBRL(totalPago)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Restante</p>
            <p className={cn("tabular text-sm font-semibold", restanteOk ? "text-success" : "text-destructive")}>{formatBRL(restante)}</p>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          {restanteOk ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Pago</span>
          ) : warnOnDiff ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Em aberto</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}