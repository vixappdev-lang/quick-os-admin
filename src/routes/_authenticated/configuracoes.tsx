import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { useAppSettings, useUpdateAppSettings } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | Quick OS" }] }),
  component: ConfiguracoesPage,
});

const PAYMENT_LABELS: Record<string, string> = { pix: "PIX", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", nota_promissoria: "Nota promissória", cheque: "Cheque", outro: "Outro" };

function ConfiguracoesPage() {
  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const inp = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const [empresa, setEmpresa] = useState({ razao: "", cnpj: "", telefone: "", email: "", endereco: "" });

  const paymentMap = useMemo<Record<string, boolean>>(() => ({ pix: true, credito: true, debito: true, dinheiro: true, fiado: true, outro: false, ...((settings?.metodos_pagamento ?? {}) as Record<string, boolean>) }), [settings]);

  const saveEmpresa = async () => {
    try {
      await updateSettings.mutateAsync({
        empresa_razao: empresa.razao || settings?.empresa_razao || null,
        empresa_cnpj: empresa.cnpj || settings?.empresa_cnpj || null,
        empresa_telefone: empresa.telefone || settings?.empresa_telefone || null,
        empresa_email: empresa.email || settings?.empresa_email || null,
        empresa_endereco: empresa.endereco || settings?.empresa_endereco || null,
      } as any);
      toast.success("Dados da empresa salvos");
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  const patchSettings = async (patch: any, msg = "Configuração salva") => {
    try { await updateSettings.mutateAsync(patch); toast.success(msg); }
    catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências da empresa e do sistema" />
      <Tabs defaultValue="empresa">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="pdv">PDV</TabsTrigger>
          <TabsTrigger value="impressao">Impressão</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="tema">Tema</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa" className="mt-4">
          <SectionCard title="Dados da empresa" actions={<button onClick={saveEmpresa} disabled={updateSettings.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">Salvar</button>}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-medium">Razão social</label><input defaultValue={settings?.empresa_razao ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, razao: e.target.value }))} className={inp} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">CNPJ</label><input defaultValue={settings?.empresa_cnpj ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, cnpj: e.target.value }))} className={inp} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Telefone</label><input defaultValue={settings?.empresa_telefone ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, telefone: e.target.value }))} className={inp} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Email</label><input defaultValue={settings?.empresa_email ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, email: e.target.value }))} className={inp} /></div>
              <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-medium">Endereço</label><input defaultValue={settings?.empresa_endereco ?? ""} onChange={(e) => setEmpresa((s) => ({ ...s, endereco: e.target.value }))} className={inp} /></div>
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="pdv" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <SectionCard title="Status do PDV" description="Controla se a tela de vendas pode ser usada">
              <ToggleRow label="PDV ativo" description="Quando desativado, a tela fica bloqueada com aviso em vidro." checked={settings?.pdv_ativo !== false} onCheckedChange={(checked) => patchSettings({ pdv_ativo: checked }, checked ? "PDV ativado" : "PDV desativado")} />
            </SectionCard>
            <SectionCard title="Métodos de pagamento" description="Afeta Novo pedido e PDV">
              <div className="space-y-2">
                {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                  <ToggleRow key={key} label={label} checked={paymentMap[key] !== false} onCheckedChange={(checked) => patchSettings({ metodos_pagamento: { ...paymentMap, [key]: checked } }, `${label} ${checked ? "ativado" : "desativado"}`)} />
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="impressao" className="mt-4"><SectionCard title="Impressora térmica"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-xs font-medium">Modelo</label><select className={inp}><option>Bematech MP-4200 TH</option><option>Epson TM-T20</option></select></div><div><label className="mb-1.5 block text-xs font-medium">Largura</label><select className={inp}><option>80mm</option><option>58mm</option></select></div></div></SectionCard></TabsContent>
        <TabsContent value="api" className="mt-4"><ApiKeysPanel /></TabsContent>
        <TabsContent value="tema" className="mt-4"><SectionCard title="Aparência"><ToggleRow label="Modo escuro" /></SectionCard></TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }: { label: string; description?: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-md border bg-card px-4 py-3"><span><span className="block text-sm font-medium">{label}</span>{description && <span className="block text-xs text-muted-foreground">{description}</span>}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>;
}