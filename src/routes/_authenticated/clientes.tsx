import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useClientes } from "@/lib/queries";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Quick OS" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() =>
    clientes.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca)),
    [clientes, busca]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
        actions={
          <button onClick={() => navigate({ to: "/clientes/novo" })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
            <Plus className="h-3.5 w-3.5" /> Novo cliente
          </button>
        }
      />
      <SectionCard padded={false}>
        <div className="flex items-center gap-3 border-b px-3 py-3 sm:px-5">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        {isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>}
        {!isLoading && filtrados.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado</div>}
        {!isLoading && filtrados.length > 0 && (<>
          {/* Mobile: cards empilhados */}
          <ul className="divide-y md:hidden">
            {filtrados.map((c) => (
              <li key={c.id} onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })} className="cursor-pointer px-4 py-3 active:bg-muted/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.telefone ?? c.email ?? "—"}</p>
                  </div>
                  {Number(c.saldo_fiado) > 0 && (
                    <span className="shrink-0 text-xs font-semibold text-destructive">{formatBRL(Number(c.saldo_fiado))}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {/* Desktop: tabela */}
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Telefone</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fiado</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Limite</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })} className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}</div>
                      <p className="font-medium">{c.nome}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.telefone ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-5 py-3 text-right tabular">{Number(c.saldo_fiado) > 0 ? <span className="font-semibold text-destructive">{formatBRL(Number(c.saldo_fiado))}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-3 text-right tabular text-muted-foreground">{formatBRL(Number(c.limite_credito))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}
      </SectionCard>
    </div>
  );
}