import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Quick OS" }] }),
  component: () => {
    const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
    return (
      <div>
        <PageHeader title="Configurações" description="Preferências da empresa e do sistema" />
        <Tabs defaultValue="empresa">
          <TabsList><TabsTrigger value="empresa">Empresa</TabsTrigger><TabsTrigger value="pdv">PDV</TabsTrigger><TabsTrigger value="impressao">Impressão</TabsTrigger><TabsTrigger value="integracoes">Integrações</TabsTrigger><TabsTrigger value="backup">Backup</TabsTrigger><TabsTrigger value="tema">Tema</TabsTrigger></TabsList>
          <TabsContent value="empresa" className="mt-4">
            <SectionCard title="Dados da empresa">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-xs font-medium">Razão social</label><input defaultValue="Adega Quick Ltda" className={inp} /></div>
                <div><label className="mb-1.5 block text-xs font-medium">CNPJ</label><input defaultValue="12.345.678/0001-90" className={inp} /></div>
                <div><label className="mb-1.5 block text-xs font-medium">Telefone</label><input defaultValue="(11) 3214-5566" className={inp} /></div>
                <div><label className="mb-1.5 block text-xs font-medium">Email</label><input defaultValue="contato@adegaquick.com" className={inp} /></div>
                <div className="col-span-2"><label className="mb-1.5 block text-xs font-medium">Endereço</label><input defaultValue="Av. Paulista, 1820 — Bela Vista, São Paulo/SP" className={inp} /></div>
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="pdv" className="mt-4"><SectionCard title="Configurações do PDV"><div className="space-y-3 text-sm"><Toggle label="Permitir desconto manual" /><Toggle label="Exigir cliente em pagamento fiado" defaultOn /><Toggle label="Imprimir cupom automaticamente" defaultOn /><Toggle label="Som ao finalizar venda" /></div></SectionCard></TabsContent>
          <TabsContent value="impressao" className="mt-4"><SectionCard title="Impressora térmica"><div className="grid grid-cols-2 gap-4"><div><label className="mb-1.5 block text-xs font-medium">Modelo</label><select className={inp}><option>Bematech MP-4200 TH</option><option>Epson TM-T20</option></select></div><div><label className="mb-1.5 block text-xs font-medium">Largura</label><select className={inp}><option>80mm</option><option>58mm</option></select></div></div></SectionCard></TabsContent>
          <TabsContent value="integracoes" className="mt-4"><SectionCard title="Integrações ativas"><p className="text-sm text-muted-foreground">Configure integrações em Sistema → Integrações.</p></SectionCard></TabsContent>
          <TabsContent value="backup" className="mt-4"><SectionCard title="Backup automático"><Toggle label="Backup diário às 03:00" defaultOn /></SectionCard></TabsContent>
          <TabsContent value="tema" className="mt-4"><SectionCard title="Aparência"><Toggle label="Modo escuro" /></SectionCard></TabsContent>
        </Tabs>
      </div>
    );
  },
});

function Toggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return <label className="flex items-center justify-between rounded-md border bg-card px-4 py-2.5"><span>{label}</span><input type="checkbox" defaultChecked={defaultOn} className="h-4 w-4 rounded" /></label>;
}