import { useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, X, User, Package } from "lucide-react";
import { useProdutos, useClientes, useCreatePedido, type Produto, type Cliente } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHidScanner } from "@/lib/hid-scanner";
import { normalizeEan } from "@/lib/ean";
import { beepError, beepScan } from "@/lib/sounds";

type Item = { produto: Produto; qtd: number };

interface Props {
  vendedorId?: string;
  origem?: "balcao" | "delivery" | "pdv";
  onCreated: (pedidoId: string) => void;
  onCancel: () => void;
  compact?: boolean;
}

export function PedidoBuilder({ vendedorId, origem = "balcao", onCreated, onCancel, compact }: Props) {
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const createPedido = useCreatePedido();

  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [pagamento, setPagamento] = useState<"pix" | "credito" | "debito" | "dinheiro" | "fiado">("pix");
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState(0);

  const indexByCode = useMemo(() => {
    const m = new Map<string, Produto>();
    produtos.forEach((p: any) => {
      if (p.ativo === false) return;
      const cb = normalizeEan(String(p.codigo_barras ?? ""));
      const sku = String(p.sku ?? "").trim().toLowerCase();
      if (cb) m.set(cb, p);
      if (sku) m.set(sku, p);
    });
    return m;
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    if (!busca) return produtos.slice(0, 24);
    const t = busca.toLowerCase();
    return produtos.filter((p) =>
      p.nome.toLowerCase().includes(t) ||
      p.sku?.toLowerCase().includes(t) ||
      p.codigo_barras?.toLowerCase().includes(t),
    ).slice(0, 60);
  }, [produtos, busca]);

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return [];
    const t = buscaCliente.toLowerCase();
    return clientes.filter((c) => c.nome.toLowerCase().includes(t) || c.telefone?.includes(t)).slice(0, 8);
  }, [clientes, buscaCliente]);

  const subtotal = itens.reduce((s, i) => s + i.qtd * Number(i.produto.preco_venda), 0);
  const total = Math.max(0, subtotal - desconto);

  const addItem = (p: Produto) => {
    setItens((prev) => {
      const ix = prev.findIndex((x) => x.produto.id === p.id);
      if (ix >= 0) {
        const cp = [...prev]; cp[ix] = { ...cp[ix], qtd: cp[ix].qtd + 1 }; return cp;
      }
      return [...prev, { produto: p, qtd: 1 }];
    });
  };
  const updateQtd = (id: string, d: number) => setItens((prev) => prev.map((i) => i.produto.id === id ? { ...i, qtd: Math.max(1, i.qtd + d) } : i));
  const removeItem = (id: string) => setItens((prev) => prev.filter((i) => i.produto.id !== id));

  useHidScanner((code) => {
    const p = indexByCode.get(normalizeEan(code)) ?? indexByCode.get(code.trim().toLowerCase());
    if (!p) { beepError(); toast.error(`Código não cadastrado: ${code}`); return; }
    beepScan(); addItem(p); toast.success(p.nome);
  });

  const salvar = async () => {
    if (itens.length === 0) { toast.error("Adicione ao menos um item"); return; }
    try {
      const pedido = await createPedido.mutateAsync({
        cliente_id: cliente?.id ?? null,
        vendedor_id: vendedorId ?? null,
        origem,
        pagamento,
        desconto,
        observacoes: observacoes || null,
        itens: itens.map((i) => ({ produto_id: i.produto.id, qtd: i.qtd, preco_unit: Number(i.produto.preco_venda) })),
      });
      toast.success(`Pedido ${pedido.numero} criado`);
      onCreated(pedido.id);
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
  };

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-[1fr_380px]")}>
      {/* CATÁLOGO */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome, SKU ou código de barras..." className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {produtosFiltrados.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed bg-card/60 p-8 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-6 w-6 opacity-50" />
              Nenhum produto encontrado
            </div>
          )}
          {produtosFiltrados.map((p) => (
            <button key={p.id} type="button" onClick={() => addItem(p)} className="rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-md">
              <p className="line-clamp-2 text-xs font-medium leading-tight">{p.nome}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{p.sku}</p>
              <p className="mt-2 text-sm font-semibold text-primary tabular">{formatBRL(Number(p.preco_venda))}</p>
              <p className="text-[10px] text-muted-foreground">Estoque: {Number(p.estoque)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CARRINHO */}
      <div className="space-y-3">
        {/* Cliente */}
        <div className="rounded-xl border bg-card p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</p>
          {cliente ? (
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5 text-primary" /> {cliente.nome}</div>
              <button type="button" onClick={() => setCliente(null)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="relative">
              <input value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} placeholder="Buscar cliente (opcional)..." className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {clientesFiltrados.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-card shadow-lg">
                  {clientesFiltrados.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCliente(c); setBuscaCliente(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                      <p className="font-medium">{c.nome}</p>
                      {c.telefone && <p className="text-[11px] text-muted-foreground">{c.telefone}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Itens */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Carrinho · {itens.length} {itens.length === 1 ? "item" : "itens"}</p>
          </div>
          <div className="max-h-72 overflow-auto">
            {itens.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted-foreground">Toque em um produto para adicionar</div>}
            {itens.map((i) => (
              <div key={i.produto.id} className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{i.produto.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{formatBRL(Number(i.produto.preco_venda))} × {i.qtd}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateQtd(i.produto.id, -1)} className="flex h-7 w-7 items-center justify-center rounded border hover:bg-muted"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-xs tabular font-semibold">{i.qtd}</span>
                  <button type="button" onClick={() => updateQtd(i.produto.id, 1)} className="flex h-7 w-7 items-center justify-center rounded border hover:bg-muted"><Plus className="h-3 w-3" /></button>
                </div>
                <p className="w-16 text-right text-xs font-semibold tabular">{formatBRL(i.qtd * Number(i.produto.preco_venda))}</p>
                <button type="button" onClick={() => removeItem(i.produto.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular font-medium">{formatBRL(subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Desconto</span>
            <input type="number" min={0} value={desconto} onChange={(e) => setDesconto(Math.max(0, Number(e.target.value) || 0))} className="h-7 w-24 rounded-md border border-input bg-background px-2 text-right text-xs tabular focus:border-primary focus:outline-none" />
          </div>
          <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">Total</span><span className="tabular font-bold text-primary">{formatBRL(total)}</span></div>
        </div>

        {/* Pagamento */}
        <div className="rounded-xl border bg-card p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(["pix", "credito", "debito", "dinheiro", "fiado"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPagamento(p)} className={cn("h-9 rounded-md border text-xs font-medium capitalize transition", pagamento === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>{p}</button>
            ))}
          </div>
        </div>

        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Observações (opcional)" className="w-full resize-none rounded-xl border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl border bg-card text-sm font-medium hover:bg-muted">Cancelar</button>
          <button type="button" onClick={salvar} disabled={createPedido.isPending || itens.length === 0} className="h-11 flex-[2] rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50">
            {createPedido.isPending ? "Salvando..." : `Finalizar · ${formatBRL(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}