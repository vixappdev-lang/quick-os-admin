import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, User, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pedidos/novo")({
  head: () => ({ meta: [{ title: "Novo pedido — Quick OS" }] }),
  component: NovoPedido,
});

function NovoPedido() {
  const navigate = useNavigate();
  return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <PageHeader title="Novo pedido" description="Crie um pedido manual fora do PDV" actions={
        <>
          <Link to="/pedidos" className="h-9 rounded-md border bg-card px-3 text-sm font-medium leading-9 hover:bg-muted">Cancelar</Link>
          <button onClick={() => { toast.success("Pedido criado"); navigate({ to: "/pedidos" }); }} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Salvar pedido</button>
        </>
      } />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SectionCard title="Dados do pedido">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Origem"><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option>Balcão</option><option>Delivery</option><option>PDV</option></select></Field>
              <Field label="Operador"><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option>Ana Lima</option><option>Bruno Souza</option><option>Carlos Silva</option></select></Field>
              <Field label="Cliente" full><div className="flex gap-2"><input placeholder="Buscar cliente..." className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /><button className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted"><User className="h-3.5 w-3.5" /></button></div></Field>
            </div>
          </SectionCard>

          <SectionCard title="Itens" actions={<button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="h-3 w-3" /> Adicionar produto</button>}>
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">Nenhum item adicionado</div>
          </SectionCard>

          <SectionCard title="Observações"><textarea rows={4} placeholder="Notas internas, observações de entrega..." className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Resumo">
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value="R$ 0,00" />
              <Row label="Desconto" value="- R$ 0,00" />
              <Row label="Frete" value="R$ 0,00" />
              <div className="border-t pt-2"><Row label="Total" value="R$ 0,00" bold /></div>
            </div>
          </SectionCard>
          <SectionCard title="Pagamento">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option>PIX</option><option>Crédito</option><option>Débito</option><option>Dinheiro</option><option>Fiado</option></select>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={`tabular ${bold ? "text-base font-semibold text-primary" : ""}`}>{value}</span></div>;
}