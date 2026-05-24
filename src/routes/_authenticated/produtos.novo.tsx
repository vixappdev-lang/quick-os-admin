import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo produto — Quick OS" }] }),
  component: NovoProduto,
});

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function NovoProduto() {
  const navigate = useNavigate();
  return (
    <div>
      <Link to="/produtos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
      <PageHeader title="Novo produto" description="Cadastre um novo item no catálogo" actions={
        <>
          <Link to="/produtos" className="h-9 rounded-md border bg-card px-3 text-sm font-medium leading-9 hover:bg-muted">Cancelar</Link>
          <button onClick={() => { toast.success("Produto cadastrado"); navigate({ to: "/produtos" }); }} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Salvar produto</button>
        </>
      } />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <SectionCard title="Identificação">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome do produto" full><input className={inputCls} placeholder="Ex.: Heineken Long Neck 330ml" /></Field>
              <Field label="Descrição" full><textarea rows={3} className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Descrição comercial..." /></Field>
              <Field label="SKU"><input className={inputCls} placeholder="BEB-HEI-330" /></Field>
              <Field label="Código de barras (EAN)"><input className={inputCls} placeholder="7896045506019" /></Field>
              <Field label="Categoria"><select className={inputCls}><option>Cervejas</option><option>Vinhos</option><option>Destilados</option></select></Field>
              <Field label="Fornecedor"><select className={inputCls}><option>Heineken Brasil</option><option>Ambev</option><option>Diageo</option></select></Field>
            </div>
          </SectionCard>

          <SectionCard title="Preços e margem">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Preço de custo"><input type="number" className={inputCls} placeholder="0,00" /></Field>
              <Field label="Preço de venda"><input type="number" className={inputCls} placeholder="0,00" /></Field>
              <Field label="Margem calculada"><input disabled value="—" className={`${inputCls} bg-muted/40`} /></Field>
            </div>
          </SectionCard>

          <SectionCard title="Estoque">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Estoque atual"><input type="number" className={inputCls} placeholder="0" /></Field>
              <Field label="Estoque mínimo"><input type="number" className={inputCls} placeholder="0" /></Field>
              <Field label="Unidade"><select className={inputCls}><option>UN</option><option>CX</option><option>KG</option></select></Field>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Imagem">
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium">Arraste ou clique para enviar</p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG até 4MB</p>
            </div>
          </SectionCard>
          <SectionCard title="Status">
            <label className="flex items-center justify-between"><span className="text-sm">Produto ativo</span><input type="checkbox" defaultChecked className="h-4 w-4 rounded" /></label>
            <label className="mt-2 flex items-center justify-between"><span className="text-sm">Vender no PDV</span><input type="checkbox" defaultChecked className="h-4 w-4 rounded" /></label>
            <label className="mt-2 flex items-center justify-between"><span className="text-sm">Disponível no delivery</span><input type="checkbox" defaultChecked className="h-4 w-4 rounded" /></label>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}