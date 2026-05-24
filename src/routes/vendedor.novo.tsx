import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PedidoBuilder } from "@/components/pedido-builder";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/vendedor/novo")({
  head: () => ({ meta: [{ title: "Novo pedido | Quick OS" }] }),
  component: VendedorNovo,
});

function VendedorNovo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-surface pb-6">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <Link to="/vendedor" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-sm font-semibold">Novo pedido</p>
            <p className="text-[11px] text-muted-foreground">Vendedor: {user?.name}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-10">
        <PedidoBuilder
          vendedorId={user?.id}
          origem="balcao"
          onCreated={() => navigate({ to: "/vendedor" })}
          onCancel={() => navigate({ to: "/vendedor" })}
        />
      </div>
    </div>
  );
}