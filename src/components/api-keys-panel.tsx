import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2, KeyRound, Power, Check } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/section-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listApiKeys, createApiKey, toggleApiKey, deleteApiKey } from "@/lib/api-keys.functions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ApiKeysPanel() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const toggle = useServerFn(toggleApiKey);
  const remove = useServerFn(deleteApiKey);
  const qc = useQueryClient();

  const { data: keys = [], isLoading } = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [created, setCreated] = useState<{ key: string; nome: string } | null>(null);

  const baseUrl = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  const createMut = useMutation({
    mutationFn: async (n: string) => create({ data: { nome: n } }),
    onSuccess: (data: any) => {
      setCreated({ key: data.key, nome: data.nome });
      setNome("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: async (i: { id: string; ativo: boolean }) => toggle({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Chave revogada"); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Chaves de API"
        description="Use para integrar sistemas externos com o painel (criar pedidos, listar produtos, etc.)"
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">
            <Plus className="h-3.5 w-3.5" /> Nova chave
          </button>
        }
      >
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && keys.length === 0 && (
          <div className="rounded-md border border-dashed bg-card/60 p-8 text-center text-sm text-muted-foreground">
            Nenhuma chave criada. Clique em <strong>Nova chave</strong> para gerar uma.
          </div>
        )}
        {keys.length > 0 && (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Prefixo</th>
                  <th className="px-4 py-2">Criada em</th>
                  <th className="px-4 py-2">Último uso</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k: any) => (
                  <tr key={k.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">{k.nome}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{k.prefix}…</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(k.created_at)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{k.last_used_at ? formatDate(k.last_used_at) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", k.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {k.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleMut.mutate({ id: k.id, ativo: !k.ativo })} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" title={k.ativo ? "Desativar" : "Ativar"}>
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm("Revogar definitivamente esta chave?")) delMut.mutate(k.id); }} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Revogar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Documentação da API" description="Endpoints REST para integração externa">
        <div className="space-y-5 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base URL</p>
            <code className="block rounded-md bg-muted/50 px-3 py-2 font-mono text-xs">{baseUrl}/api/public/v1</code>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Autenticação</p>
            <p className="text-muted-foreground">Envie sua chave no header <code className="rounded bg-muted px-1 text-xs">Authorization: Bearer SUA_CHAVE</code> ou <code className="rounded bg-muted px-1 text-xs">X-Api-Key</code>.</p>
          </div>

          <Endpoint method="GET" path="/produtos" desc="Lista produtos. Suporta ?q=busca&limit=100" example={`curl -H "Authorization: Bearer SUA_CHAVE" \\\n  ${baseUrl}/api/public/v1/produtos?q=coca`} />
          <Endpoint method="GET" path="/pedidos" desc="Lista pedidos. Suporta ?status=pendente&limit=50" example={`curl -H "Authorization: Bearer SUA_CHAVE" \\\n  ${baseUrl}/api/public/v1/pedidos?status=pendente`} />
          <Endpoint
            method="POST"
            path="/pedidos"
            desc="Cria um novo pedido. Retorna 201 com {id, numero, total}."
            example={`curl -X POST -H "Authorization: Bearer SUA_CHAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "origem": "balcao",\n    "pagamento": "pix",\n    "itens": [\n      { "produto_id": "uuid-do-produto", "qtd": 2 }\n    ]\n  }' \\\n  ${baseUrl}/api/public/v1/pedidos`}
          />

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Códigos de erro</p>
            <ul className="ml-5 list-disc text-muted-foreground space-y-0.5">
              <li><strong>401</strong> — chave ausente, inválida ou inativa</li>
              <li><strong>422</strong> — corpo da requisição inválido (veja <code>details</code>)</li>
              <li><strong>500</strong> — erro interno</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Nova chave */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova chave de API</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="block text-xs font-medium">Nome (ex.: Integração ERP)</label>
            <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
              <button disabled={!nome.trim() || createMut.isPending} onClick={() => createMut.mutate(nome.trim())} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
                {createMut.isPending ? "Gerando..." : "Gerar chave"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mostrar chave gerada (única vez) */}
      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Chave gerada</DialogTitle>
          </DialogHeader>
          {created && (
            <div className="space-y-3">
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                Esta chave será exibida <strong>apenas uma vez</strong>. Copie e guarde em local seguro.
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{created.nome}</p>
                <code className="block break-all font-mono text-xs">{created.key}</code>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => copy(created.key)} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Copy className="h-3.5 w-3.5" /> Copiar</button>
                <button onClick={() => setCreated(null)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Check className="h-3.5 w-3.5" /> Pronto</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Endpoint({ method, path, desc, example }: { method: string; path: string; desc: string; example: string }) {
  const m: Record<string, string> = { GET: "bg-info/15 text-info", POST: "bg-success/15 text-success", DELETE: "bg-destructive/15 text-destructive" };
  return (
    <div className="rounded-md border bg-card/60 p-3">
      <div className="flex items-center gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", m[method])}>{method}</span>
        <code className="font-mono text-xs">{path}</code>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <pre className="mt-2 overflow-auto rounded bg-muted/50 p-2 text-[11px] leading-relaxed"><code>{example}</code></pre>
    </div>
  );
}