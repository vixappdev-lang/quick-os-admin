import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ClienteForm } from "@/components/cliente-form";

export const Route = createFileRoute("/_authenticated/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — LyneCloud" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    return: typeof s.return === "string" ? s.return : undefined,
    prefill: typeof s.prefill === "string" ? s.prefill : undefined,
  }) as { return?: string; prefill?: string },
  component: NovoCliente,
});

function NovoCliente() {
  const navigate = useNavigate();
  const { return: ret, prefill } = Route.useSearch();

  const backToReturn = (clienteId?: string) => {
    if (ret === "/pedidos/novo") {
      navigate({ to: "/pedidos/novo", search: clienteId ? ({ cliente: clienteId } as any) : ({} as any) });
      return true;
    }
    return false;
  };

  return (
    <div>
      <Link to={ret === "/pedidos/novo" ? "/pedidos/novo" : "/clientes"} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <ClienteForm
        initialNome={prefill}
        onSaved={(c) => {
          if (!backToReturn(c.id)) navigate({ to: "/clientes/$id", params: { id: c.id } });
        }}
        onCancel={() => {
          if (!backToReturn()) navigate({ to: "/clientes" });
        }}
      />
    </div>
  );
}