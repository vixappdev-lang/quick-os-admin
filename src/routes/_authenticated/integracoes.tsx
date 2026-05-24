import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Quick OS" }] }),
  component: () => {
    const items = [
      { nome: "iFood", desc: "Receba pedidos de delivery diretamente no PDV", on: true, cor: "bg-red-500" },
      { nome: "WhatsApp Business", desc: "Notifique clientes sobre pedidos e promoções", on: true, cor: "bg-green-500" },
      { nome: "Mercado Pago", desc: "Maquininha e pagamentos online", on: true, cor: "bg-cyan-500" },
      { nome: "SEFAZ NF-e", desc: "Importação automática de notas fiscais", on: true, cor: "bg-blue-500" },
      { nome: "Bling ERP", desc: "Sincronização de produtos e estoque", on: false, cor: "bg-orange-500" },
      { nome: "Google Drive", desc: "Backup automático em nuvem", on: false, cor: "bg-yellow-500" },
    ];
    return (
      <div>
        <PageHeader title="Integrações" description="Conecte serviços externos ao Quick OS" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <SectionCard key={i.nome}>
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${i.cor} text-sm font-semibold text-white`}>{i.nome[0]}</div>
                {i.on ? <StatusBadge status="ativa" tone="success" /> : <StatusBadge status="inativa" tone="neutral" />}
              </div>
              <p className="mt-3 text-sm font-semibold">{i.nome}</p>
              <p className="mt-1 text-xs text-muted-foreground">{i.desc}</p>
              <button className="mt-4 h-8 w-full rounded-md border bg-card text-xs font-medium hover:bg-muted">{i.on ? "Configurar" : "Conectar"}</button>
            </SectionCard>
          ))}
        </div>
      </div>
    );
  },
});