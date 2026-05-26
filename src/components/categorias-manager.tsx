import { useState } from "react";
import { Loader2, Plus, Tag, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategorias, useUpsertCategoria, useDeleteCategoria } from "@/lib/queries";
import { toast } from "sonner";

const PRESET_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

export function CategoriasManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: categorias = [] } = useCategorias();
  const upsert = useUpsertCategoria();
  const del = useDeleteCategoria();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PRESET_COLORS[0]);

  const adicionar = async () => {
    const n = nome.trim();
    if (!n) return toast.error("Informe o nome da categoria");
    try {
      await upsert.mutateAsync({ nome: n, cor, ativo: true });
      setNome("");
      toast.success("Categoria adicionada");
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  const excluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir categoria "${nome}"?`)) return;
    try { await del.mutateAsync(id); toast.success("Categoria excluída"); }
    catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:!w-screen max-sm:!max-w-none max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!top-0 max-sm:!left-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nova categoria</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionar()}
                placeholder="Ex: Bebidas, Limpeza..."
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button onClick={adicionar} disabled={upsert.isPending} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setCor(c)} aria-label={`Cor ${c}`}
                  className={`h-7 w-7 rounded-full border-2 transition ${cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {categorias.length} categoria{categorias.length === 1 ? "" : "s"}
            </p>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border divide-y">
              {categorias.length === 0 && (
                <p className="p-6 text-center text-xs text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
              )}
              {categorias.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.cor ?? "#94a3b8" }} />
                  <span className="flex-1 truncate text-sm">{c.nome}</span>
                  <button onClick={() => excluir(c.id, c.nome)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => onOpenChange(false)} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}