import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, CheckCircle2, Clock, Receipt, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { usePedido, useUpdatePedidoStatus, type Pedido } from "@/lib/queries";
import { formatBRL, formatDateTime, formatTime } from "@/lib/format";
import { printRomaneio } from "@/components/romaneio-print";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({ meta: [{ title: "Detalhes do pedido — Quick OS" }] }),
  component: PedidoDetail,
});

const FLOW: Pedido["status"][] = ["pendente", "autorizado", "separacao", "conferencia", "concluido"];

function PedidoDetail() {
  const { id } = Route.useParams();
  const { data: pedido, isLoading } = usePedido(id);
  const updateStatus = useUpdatePedidoStatus();

  if (isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando pedido...</div>;
  if (!pedido) return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <div className="rounded-xl border border-dashed bg-card/60 p-10 text-center text-sm text-muted-foreground">Pedido não encontrado</div>
    </div>
  );

  const itens = pedido.itens ?? [];
  const ix = FLOW.indexOf(pedido.status);
  const nextStatus: Pedido["status"] | null = ix >= 0 && ix < FLOW.length - 1 ? FLOW[ix + 1] : null;

  const avancar = async () => {
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ id: pedido.id, status: nextStatus });
      toast.success(`Pedido movido para ${nextStatus}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const imprimir = () => printRomaneio(pedido);

  const timeline = [
    { icon: Receipt, label: "Pedido criado", time: formatTime(pedido.created_at), done: true },
    { icon: CheckCircle2, label: "Autorizado", time: ix >= 1 ? formatTime(pedido.updated_at) : "—", done: ix >= 1 },
    { icon: Truck, label: "Em separação", time: ix >= 2 ? formatTime(pedido.updated_at) : "—", done: ix >= 2 },
    { icon: CheckCircle2, label: "Conferência", time: ix >= 3 ? formatTime(pedido.updated_at) : "—", done: ix >= 3 },
    { icon: CheckCircle2, label: "Finalizado", time: ix >= 4 ? formatTime(pedido.updated_at) : "—", done: ix >= 4 },
  ];

  return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para pedidos
      </Link>
      <PageHeader
        title={`Pedido ${pedido.numero}`}
        description={`Criado em ${formatDateTime(pedido.created_at)}${pedido.vendedor?.nome ? ` · Vendedor ${pedido.vendedor.nome}` : ""}`}
        actions={
          <>
            <button onClick={imprimir} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
            {nextStatus && (
              <button onClick={avancar} disabled={updateStatus.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                Avançar para {nextStatus}
              </button>
            )}
            <StatusBadge status={pedido.status} tone={statusTone(pedido.status)} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SectionCard title={`Itens do pedido (${itens.length})`} padded={false}>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qtd</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unitário</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr></thead>
              <tbody>
                {itens.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem itens</td></tr>}
                {itens.map((i: any) => (
                  <tr key={i.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{i.produto?.nome ?? "—"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{i.produto?.sku ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{Number(i.qtd)} {i.produto?.unidade ?? ""}</td>
                    <td className="px-4 py-3 text-right tabular">{formatBRL(Number(i.preco_unit))}</td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{formatBRL(Number(i.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular">{formatBRL(Number(pedido.subtotal))}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Desconto</span><span className="tabular">- {formatBRL(Number(pedido.desconto))}</span></div>
              <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Total</span><span className="tabular text-base text-primary">{formatBRL(Number(pedido.total))}</span></div>
            </div>
          </SectionCard>

          {pedido.observacoes && (
            <SectionCard title="Observações"><p className="whitespace-pre-line text-sm text-muted-foreground">{pedido.observacoes}</p></SectionCard>
          )}

          <SectionCard title="Timeline" padded={false}>
            <ul className="px-5 py-4">
              {timeline.map((t, i) => (
                <li key={i} className="relative flex items-start gap-3 pb-5 last:pb-0">
                  {i < timeline.length - 1 && <span className="absolute left-3.5 top-7 h-full w-px bg-border" />}
                  <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                    <t.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Cliente">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold">{pedido.cliente?.nome ?? "Balcão"}</p>
                {pedido.cliente?.telefone && <p className="text-xs text-muted-foreground">{pedido.cliente.telefone}</p>}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pagamento">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span className="font-medium capitalize">{pedido.pagamento ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={pedido.status} tone={statusTone(pedido.status)} /></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Valor</span><span className="tabular font-semibold">{formatBRL(Number(pedido.total))}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Origem">
            <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium capitalize">{pedido.origem}</p><p className="text-xs text-muted-foreground">{formatDateTime(pedido.created_at)}</p></div></div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}