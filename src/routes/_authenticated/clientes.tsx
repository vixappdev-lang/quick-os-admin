import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientes, useUpsertCliente } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Quick OS" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const upsert = useUpsertCliente();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", documento: "" });

  const filtrados = useMemo(() =>
    clientes.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca)),
    [clientes, busca]);

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      await upsert.mutateAsync({ nome: form.nome.trim(), telefone: form.telefone || null, email: form.email || null, documento: form.documento || null });
      toast.success("Cliente cadastrado");
      setOpen(false);
      setForm({ nome: "", telefone: "", email: "", documento: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
            <Plus className="h-3.5 w-3.5" /> Novo cliente
          </button>
        }
      />
      <SectionCard padded={false}>
        <div className="flex items-center gap-3 border-b px-5 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        {isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>}
        {!isLoading && filtrados.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado</div>}
        {!isLoading && filtrados.length > 0 && (
          <table className="w-full text-sm">
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
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome *"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></Field>
            <Field label="Telefone"><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></Field>
            <Field label="CPF / CNPJ"><input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
            <button onClick={salvar} disabled={upsert.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">{upsert.isPending ? "Salvando..." : "Salvar"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}