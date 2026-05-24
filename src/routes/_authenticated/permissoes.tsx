import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({ meta: [{ title: "Permissões — Quick OS" }] }),
  component: () => {
    const roles = ["Administrador", "Gerente", "Operador PDV", "Financeiro"];
    const modulos = ["Dashboard", "PDV", "Pedidos", "Produtos", "Estoque", "Financeiro", "Relatórios", "Usuários", "Configurações"];
    const grant = (m: string, r: string) => r === "Administrador" || (r === "Gerente" && m !== "Configurações") || (r === "Operador PDV" && ["Dashboard", "PDV", "Pedidos"].includes(m)) || (r === "Financeiro" && ["Dashboard", "Financeiro", "Relatórios"].includes(m));
    return (
      <div>
        <PageHeader title="Permissões" description="Matriz de acesso por função e módulo" />
        <SectionCard padded={false}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Módulo</th>{roles.map((r) => <th key={r} className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r}</th>)}</tr></thead>
            <tbody>{modulos.map((m) => (
              <tr key={m} className="border-b">
                <td className="px-4 py-3 font-medium">{m}</td>
                {roles.map((r) => <td key={r} className="px-4 py-3 text-center">{grant(m, r) ? <Check className="mx-auto h-4 w-4 text-success" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" />}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </SectionCard>
      </div>
    );
  },
});