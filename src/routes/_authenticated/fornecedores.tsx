import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useFornecedores, useUpsertFornecedor, useDeleteFornecedor } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — LyneCloud" }] }),
  component: FornecedoresPage,
});

const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const EMPTY = {
  razao_social: "", nome_fantasia: "", cpf_cnpj: "", ie: "",
  cep: "", endereco: "", numero: "", bairro: "", complemento: "",
  cidade: "", estado: "",
  telefone: "", whatsapp: "", email: "", site: "", contato_nome: "",
  condicoes: "",
  observacoes: "",
};

function FornecedoresPage() {
  const { data: forn = [], isLoading } = useFornecedores();
  const upsert = useUpsertFornecedor();
  const del = useDeleteFornecedor();
  const [busca, setBusca] = useState("");
  const [panel, setPanel] = useState<{ open: boolean; data: any }>({ open: false, data: null });

  const list = useMemo(() => forn.filter((f: any) =>
    !busca || [f.razao_social, f.nome_fantasia, f.cpf_cnpj, f.cidade].some((v: any) => String(v ?? "").toLowerCase().includes(busca.toLowerCase()))
  ), [forn, busca]);

  const openNovo = () => setPanel({ open: true, data: { ...EMPTY } });
  const openEdit = (f: any) => setPanel({ open: true, data: { ...f } });
  const remover = async (f: any) => {
    if (!confirm(`Remover fornecedor "${f.razao_social}"?`)) return;
    try { await del.mutateAsync(f.id); toast.success("Removido"); }
    catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  return (
    <div>
      <PageHeader title="Fornecedores" description={`${forn.length} fornecedor(es) cadastrado(s)`} actions={
        <button onClick={openNovo} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
          <Plus className="h-3.5 w-3.5" /> Novo fornecedor
        </button>
      } />
      <SectionCard padded={false}>
        <div className="flex items-center gap-3 border-b px-5 py-3">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por razão social, CNPJ, cidade..." className={inp + " pl-9"} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-left">Razão social</th>
                <th className="px-4 py-2.5 text-left">CPF/CNPJ</th>
                <th className="px-4 py-2.5 text-left">IE</th>
                <th className="px-4 py-2.5 text-left">Cidade/UF</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>}
              {!isLoading && list.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Truck className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Nenhum fornecedor encontrado
                </td></tr>
              )}
              {list.map((f: any) => (
                <tr key={f.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => openEdit(f)}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{f.razao_social}</p>
                    {f.nome_fantasia && <p className="text-xs text-muted-foreground">{f.nome_fantasia}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.cpf_cnpj ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{f.ie ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{[f.cidade, f.estado].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(f)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remover(f)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Remover"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Sheet open={panel.open} onOpenChange={(o) => !o && setPanel({ open: false, data: null })}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{panel.data?.id ? "Editar fornecedor" : "Novo fornecedor"}</SheetTitle></SheetHeader>
          {panel.data && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!panel.data.razao_social?.trim()) return toast.error("Razão social obrigatória");
                try {
                  await upsert.mutateAsync({ ...panel.data, razao_social: panel.data.razao_social.trim() });
                  toast.success("Fornecedor salvo");
                  setPanel({ open: false, data: null });
                } catch (err: any) { toast.error(err.message ?? "Erro ao salvar"); }
              }}
              className="mt-4 space-y-3"
            >
              <Field label="Razão social *"><input required value={panel.data.razao_social ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, razao_social: e.target.value } })} className={inp} /></Field>
              <Field label="Nome fantasia"><input value={panel.data.nome_fantasia ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, nome_fantasia: e.target.value } })} className={inp} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPF/CNPJ"><input value={panel.data.cpf_cnpj ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, cpf_cnpj: e.target.value } })} className={inp} /></Field>
                <Field label="Inscrição Estadual"><input value={panel.data.ie ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, ie: e.target.value } })} className={inp} /></Field>
              </div>
              <div className="grid grid-cols-[100px_1fr_80px] gap-3">
                <Field label="CEP"><input value={panel.data.cep ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, cep: e.target.value } })} className={inp} /></Field>
                <Field label="Endereço"><input value={panel.data.endereco ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, endereco: e.target.value } })} className={inp} /></Field>
                <Field label="Nº"><input value={panel.data.numero ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, numero: e.target.value } })} className={inp} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro"><input value={panel.data.bairro ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, bairro: e.target.value } })} className={inp} /></Field>
                <Field label="Complemento"><input value={panel.data.complemento ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, complemento: e.target.value } })} className={inp} /></Field>
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <Field label="Cidade"><input value={panel.data.cidade ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, cidade: e.target.value } })} className={inp} /></Field>
                <Field label="UF"><input maxLength={2} value={panel.data.estado ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, estado: e.target.value.toUpperCase() } })} className={inp} /></Field>
              </div>
              <Field label="Contato (nome)"><input value={panel.data.contato_nome ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, contato_nome: e.target.value } })} className={inp} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone"><input value={panel.data.telefone ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, telefone: e.target.value } })} className={inp} /></Field>
                <Field label="WhatsApp"><input value={panel.data.whatsapp ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, whatsapp: e.target.value } })} className={inp} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail"><input type="email" value={panel.data.email ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, email: e.target.value } })} className={inp} /></Field>
                <Field label="Site"><input value={panel.data.site ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, site: e.target.value } })} className={inp} /></Field>
              </div>
              <Field label="Condições"><input placeholder="Ex.: à vista 5%" value={panel.data.condicoes ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, condicoes: e.target.value } })} className={inp} /></Field>
              <Field label="Observações"><textarea value={panel.data.observacoes ?? ""} onChange={(e) => setPanel({ ...panel, data: { ...panel.data, observacoes: e.target.value } })} className={inp + " min-h-[80px] py-2"} /></Field>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPanel({ open: false, data: null })} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
                <button type="submit" disabled={upsert.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                  {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>{children}</div>;
}