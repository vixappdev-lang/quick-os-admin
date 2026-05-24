import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { usuarios } from "@/data/mock";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Quick OS" }] }),
  component: () => {
    const cols: Column<typeof usuarios[number]>[] = [
      { key: "nome", header: "Usuário", render: (u) => <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{u.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div><p className="font-medium">{u.nome}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div> },
      { key: "role", header: "Função", render: (u) => <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{u.role}</span> },
      { key: "ultimoAcesso", header: "Último acesso", render: (u) => <span className="text-muted-foreground">{u.ultimoAcesso}</span> },
      { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} tone={statusTone(u.status)} /> },
    ];
    return (
      <div>
        <PageHeader title="Usuários" description={`${usuarios.length} usuários cadastrados`} actions={<button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Plus className="h-3.5 w-3.5" /> Novo usuário</button>} />
        <SectionCard padded={false}><DataTable columns={cols} rows={usuarios} /></SectionCard>
      </div>
    );
  },
});