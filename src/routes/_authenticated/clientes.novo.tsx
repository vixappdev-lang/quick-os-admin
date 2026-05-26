import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ClienteForm } from "@/components/cliente-form";

export const Route = createFileRoute("/_authenticated/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — Quick OS" }] }),
  component: NovoCliente,
});

function NovoCliente() {
  const navigate = useNavigate();
  return (
    <div>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <ClienteForm
        onSaved={(c) => navigate({ to: "/clientes/$id", params: { id: c.id } })}
        onCancel={() => navigate({ to: "/clientes" })}
      />
    </div>
  );
}