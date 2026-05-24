import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, RotateCcw, CheckCircle2, Clock, Receipt, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { pedidos, produtos } from "@/data/mock";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({ meta: [{ title: "Detalhes do pedido — Quick OS" }] }),
  component: PedidoDetail,
});

function PedidoDetail() {
  const { id } = Route.useParams();
  const pedido = pedidos.find((p) => p.id === id) ?? pedidos[0];
  const itensMock = [
    { p: produtos[0], qtd: 3 },
    { p: produtos[3], qtd: 2 },
    { p: produtos[5], qtd: 6 },
    { p: produtos[8], qtd: 1 },
  ];
  const subtotal = itensMock.reduce((s, i) => s + i.p.preco * i.qtd, 0);

  const timeline = [
    { icon: Receipt, label: "Pedido criado", time: "19:42", done: true },
    { icon: CheckCircle2, label: "Pagamento confirmado", time: "19:43", done: true },
    { icon: Truck, label: "Em preparação", time: "19:45", done: pedido.status !== "cancelado" },
    { icon: CheckCircle2, label: "Pedido concluído", time: pedido.status === "concluído" ? "19:51" : "—", done: pedido.status === "concluído" || pedido.status === "entregue" },
  ];

  return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para pedidos
      </Link>
      <PageHeader
        title={`Pedido ${pedido.numero}`}
        description={`Criado em ${formatDateTime(pedido.data)} · Operador ${pedido.operador}`}
        actions={
          <>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Printer className="h-3.5 w-3.5" /> Imprimir</button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> Reabrir</button>
            <StatusBadge status={pedido.status} tone={statusTone(pedido.status)} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SectionCard title="Itens do pedido" padded={false}>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qtd</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unitário</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr></thead>
              <tbody>
                {itensMock.map((i) => (
                  <tr key={i.p.id} className="border-b">
                    <td className="px-4 py-3">
                      <p className="font-medium">{i.p.nome}</p>
                      <p className="text-xs text-muted-foreground">{i.p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{i.qtd}</td>
                    <td className="px-4 py-3 text-right tabular">{formatBRL(i.p.preco)}</td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{formatBRL(i.p.preco * i.qtd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular">{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Desconto</span><span className="tabular">- {formatBRL(0)}</span></div>
              <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Total</span><span className="tabular text-base text-primary">{formatBRL(pedido.total)}</span></div>
            </div>
          </SectionCard>

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
                <p className="text-sm font-semibold">{pedido.cliente}</p>
                <p className="text-xs text-muted-foreground">(11) 98421-3320</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pagamento">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span className="font-medium">{pedido.pagamento}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status="pago" tone="success" /></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Valor</span><span className="tabular font-semibold">{formatBRL(pedido.total)}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Origem">
            <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{pedido.origem}</p><p className="text-xs text-muted-foreground">{formatDateTime(pedido.data)}</p></div></div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}