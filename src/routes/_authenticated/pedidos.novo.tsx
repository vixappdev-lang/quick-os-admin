import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PedidoForm } from "@/components/pedido-form";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/pedidos/novo")({
  head: () => ({ meta: [{ title: "Novo pedido — LyneCloud" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    cliente: typeof s.cliente === "string" ? s.cliente : undefined,
  }) as { cliente?: string },
  component: NovoPedido,
});

function NovoPedido() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cliente } = Route.useSearch();
  return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <PedidoForm
        vendedorId={user?.id}
        origem="balcao"
        initialClienteId={cliente ?? null}
        onCreated={(id) => navigate({ to: "/pedidos/$id", params: { id } })}
        onCancel={() => navigate({ to: "/pedidos" })}
      />
    </div>
  );
}