import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { clientes, pedidos } from "@/data/mock";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Quick OS" }] }),
  component: () => {
    const { id } = Route.useParams();
    const c = clientes.find((x) => x.id === id) ?? clientes[0];
    return (
      <div>
        <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Link>
        <PageHeader title={c.nome} description={`${c.compras} compras · cliente desde 2024`} actions={
          <>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><MessageCircle className="h-3.5 w-3.5 text-success" /> WhatsApp</button>
            <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">Editar</button>
          </>
        } />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Tabs defaultValue="dados">
            <TabsList><TabsTrigger value="dados">Dados</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger><TabsTrigger value="fiado">Fiado</TabsTrigger><TabsTrigger value="fidelidade">Fidelidade</TabsTrigger><TabsTrigger value="obs">Observações</TabsTrigger></TabsList>
            <TabsContent value="dados" className="mt-4">
              <SectionCard title="Dados cadastrais">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{c.email}</p></div>
                  <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{c.telefone}</p></div>
                </div>
              </SectionCard>
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              <SectionCard padded={false}>
                <ul className="divide-y">
                  {pedidos.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div><p className="text-sm font-medium">{p.numero}</p><p className="text-xs text-muted-foreground">{formatDateTime(p.data)}</p></div>
                      <div className="flex items-center gap-2"><span className="tabular text-sm font-semibold">{formatBRL(p.total)}</span><StatusBadge status={p.status} tone={statusTone(p.status)} /></div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </TabsContent>
            <TabsContent value="fiado" className="mt-4"><SectionCard><p className="text-sm text-muted-foreground">Saldo de fiado: <span className="font-semibold text-foreground">{formatBRL(c.fiado)}</span></p></SectionCard></TabsContent>
            <TabsContent value="fidelidade" className="mt-4"><SectionCard><p className="text-sm">Pontos acumulados: <span className="font-semibold text-primary tabular">{c.pontos}</span></p></SectionCard></TabsContent>
            <TabsContent value="obs" className="mt-4"><SectionCard><textarea rows={4} placeholder="Anotações internas sobre o cliente..." className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></SectionCard></TabsContent>
          </Tabs>

          <div className="space-y-4">
            <SectionCard>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                <p className="mt-3 text-base font-semibold">{c.nome}</p>
                <StatusBadge status={c.status} tone={statusTone(c.status)} />
              </div>
              <div className="mt-4 space-y-2 border-t pt-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.telefone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</div>
              </div>
            </SectionCard>
            <SectionCard title="Resumo">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total gasto</span><span className="tabular font-semibold">{formatBRL(c.totalGasto)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Compras</span><span className="tabular font-semibold">{c.compras}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ticket médio</span><span className="tabular font-semibold">{formatBRL(c.totalGasto / c.compras)}</span></div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  },
});