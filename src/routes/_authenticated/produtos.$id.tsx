import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { produtos } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos/$id")({
  head: () => ({ meta: [{ title: "Produto — Quick OS" }] }),
  component: ProdutoDetail,
});

const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function ProdutoDetail() {
  const { id } = Route.useParams();
  const p = produtos.find((x) => x.id === id) ?? produtos[0];
  const margem = (((p.preco - p.precoCusto) / p.preco) * 100).toFixed(1);
  return (
    <div>
      <Link to="/produtos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
      <PageHeader title={p.nome} description={`SKU ${p.sku} · EAN ${p.ean}`} actions={
        <>
          <button className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Duplicar</button>
          <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Salvar alterações</button>
        </>
      } />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <SectionCard title="Dados do produto">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" full><input defaultValue={p.nome} className={inputCls} /></Field>
              <Field label="SKU"><input defaultValue={p.sku} className={inputCls} /></Field>
              <Field label="EAN"><input defaultValue={p.ean} className={inputCls} /></Field>
              <Field label="Categoria"><input defaultValue={p.categoria} className={inputCls} /></Field>
              <Field label="Fornecedor"><input defaultValue={p.fornecedor} className={inputCls} /></Field>
            </div>
          </SectionCard>
          <SectionCard title="Preço & estoque">
            <div className="grid grid-cols-4 gap-4">
              <Field label="Custo"><input defaultValue={p.precoCusto} className={inputCls} /></Field>
              <Field label="Venda"><input defaultValue={p.preco} className={inputCls} /></Field>
              <Field label="Estoque"><input defaultValue={p.estoque} className={inputCls} /></Field>
              <Field label="Mínimo"><input defaultValue={p.estoqueMin} className={inputCls} /></Field>
            </div>
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Resumo">
            <div className="space-y-2 text-sm">
              <Row label="Margem" value={`${margem}%`} accent="text-success" />
              <Row label="Lucro unitário" value={formatBRL(p.preco - p.precoCusto)} />
              <Row label="Valor em estoque" value={formatBRL(p.preco * p.estoque)} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={`tabular font-medium ${accent ?? ""}`}>{value}</span></div>;
}