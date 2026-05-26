import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Phone, Mail, Printer, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { ClienteForm } from "@/components/cliente-form";
import { printCliente } from "@/components/cliente-print";
import { useAppSettings, useCliente, usePedidos } from "@/lib/queries";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Quick OS" }] }),
  component: ClienteDetalhe,
});

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: cliente, isLoading } = useCliente(id);
  const { data: settings } = useAppSettings();
  const { data: pedidos = [] } = usePedidos();
  const [editing, setEditing] = useState(false);
  const meusPedidos = pedidos.filter((p) => p.cliente_id === id);
  const totalGasto = meusPedidos.filter((p) => p.status === "concluido").reduce((s, p) => s + Number(p.total), 0);

  if (isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (!cliente) return <div className="p-10 text-center text-sm text-muted-foreground">Cliente não encontrado</div>;

  if (editing) {
    return (
      <div>
        <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
        <ClienteForm cliente={cliente as any} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  const imprimir = () => printCliente(cliente, {
    razao: settings?.empresa_razao,
    cnpj: settings?.empresa_cnpj,
    endereco: settings?.empresa_endereco,
    telefone: settings?.empresa_telefone,
    email: settings?.empresa_email,
  });

  return (
    <div>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
      <PageHeader
        title={cliente.nome}
        description={`${meusPedidos.length} pedidos · cadastrado em ${new Date(cliente.created_at).toLocaleDateString("pt-BR")}`}
        actions={
          <>
            <button onClick={imprimir} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
            <button onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Histórico de pedidos" padded={false}>
          {meusPedidos.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">Nenhum pedido registrado</div>}
          <ul className="divide-y">
            {meusPedidos.slice(0, 20).map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{p.numero}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-sm font-semibold">{formatBRL(Number(p.total))}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">{cliente.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}</div>
              <p className="mt-3 text-base font-semibold">{cliente.nome}</p>
            </div>
            <div className="mt-4 space-y-2 border-t pt-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{cliente.telefone ?? "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{cliente.email ?? "—"}</div>
            </div>
          </SectionCard>
          <SectionCard title="Resumo">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total gasto</span><span className="tabular font-semibold">{formatBRL(totalGasto)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pedidos</span><span className="tabular font-semibold">{meusPedidos.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo fiado</span><span className="tabular font-semibold text-destructive">{formatBRL(Number(cliente.saldo_fiado))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Limite crédito</span><span className="tabular font-semibold">{formatBRL(Number(cliente.limite_credito))}</span></div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}