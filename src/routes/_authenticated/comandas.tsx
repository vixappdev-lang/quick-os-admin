import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { comandas } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/comandas")({
  head: () => ({ meta: [{ title: "Comandas — Quick OS" }] }),
  component: () => (
    <div>
      <PageHeader title="Comandas" description={`${comandas.length} comandas abertas no salão`} actions={<button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Abrir comanda</button>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {comandas.map((c) => (
          <SectionCard key={c.id} className="hover:shadow-elegant transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comanda {c.numero}</p>
                <p className="mt-1 text-sm font-semibold">{c.cliente}</p>
              </div>
              <StatusBadge status={c.status} tone={statusTone(c.status)} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
              <div><p className="text-muted-foreground">Itens</p><p className="tabular font-semibold">{c.itens}</p></div>
              <div><p className="text-muted-foreground">Aberta</p><p className="tabular font-semibold">{c.abertura}</p></div>
              <div><p className="text-muted-foreground">Total</p><p className="tabular font-semibold text-primary">{formatBRL(c.total)}</p></div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  ),
});