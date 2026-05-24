import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PedidoBuilder } from "@/components/pedido-builder";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/pedidos/novo")({
  head: () => ({ meta: [{ title: "Novo pedido — Quick OS" }] }),
  component: NovoPedido,
});

function NovoPedido() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <PageHeader title="Novo pedido" description="Selecione produtos, cliente e forma de pagamento" />
      <PedidoBuilder
        vendedorId={user?.id}
        origem="balcao"
        onCreated={(id) => navigate({ to: "/pedidos/$id", params: { id } })}
        onCancel={() => navigate({ to: "/pedidos" })}
      />
    </div>
  );
}