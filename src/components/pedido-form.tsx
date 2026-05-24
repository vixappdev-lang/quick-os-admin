import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Trash2, X, User as UserIcon, Save, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import {
  useProdutos,
  useClientes,
  useCreatePedido,
  useUpsertCliente,
  type Produto,
  type Cliente,
} from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Item = { produto: Produto; qtd: number; preco: number; desconto: number };

interface Props {
  vendedorId?: string;
  origem?: "balcao" | "delivery" | "pdv";
  onCreated: (pedidoId: string) => void;
  onCancel: () => void;
}

const inp =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const inpRight =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function PedidoForm({ vendedorId, origem = "balcao", onCreated, onCancel }: Props) {
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const createPedido = useCreatePedido();
  const upsertCliente = useUpsertCliente();

  const [data, setData] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [tipo, setTipo] = useState<"pedido" | "orcamento">("pedido");
  const [operacao, setOperacao] = useState<"venda" | "devolucao">("venda");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [pagamento, setPagamento] = useState<"pix" | "credito" | "debito" | "dinheiro" | "fiado">("pix");
  const [observacoes, setObservacoes] = useState("");
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [itens, setItens] = useState<Item[]>([]);
  const [buscaProd, setBuscaProd] = useState("");
  const [showProdList, setShowProdList] = useState(false);
  const [novoCliOpen, setNovoCliOpen] = useState(false);
  const [novoCli, setNovoCli] = useState({ nome: "", telefone: "", documento: "" });
  const buscaRef = useRef<HTMLInputElement>(null);

  const clientesFilt = useMemo(() => {
    if (buscaCliente.length < 2) return [];
    const t = buscaCliente.toLowerCase();
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(t) || c.telefone?.includes(t) || c.documento?.includes(t))
      .slice(0, 8);
  }, [clientes, buscaCliente]);

  const prodFilt = useMemo(() => {
    if (buscaProd.length < 1) return [];
    const t = buscaProd.toLowerCase();
    return produtos
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(t) ||
          p.sku?.toLowerCase().includes(t) ||
          p.codigo_barras?.toLowerCase().includes(t),
      )
      .slice(0, 8);
  }, [produtos, buscaProd]);

  const addProduto = (p: Produto) => {
    setItens((prev) => {
      const ix = prev.findIndex((x) => x.produto.id === p.id);
      if (ix >= 0) {
        const cp = [...prev];
        cp[ix] = { ...cp[ix], qtd: cp[ix].qtd + 1 };
        return cp;
      }
      return [...prev, { produto: p, qtd: 1, preco: Number(p.preco_venda), desconto: 0 }];
    });
    setBuscaProd("");
    setShowProdList(false);
    setTimeout(() => buscaRef.current?.focus(), 30);
  };

  const onBuscaSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (prodFilt.length > 0) addProduto(prodFilt[0]);
  };

  const updItem = (i: number, patch: Partial<Item>) =>
    setItens((prev) => prev.map((it, ix) => (ix === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItens((prev) => prev.filter((_, ix) => ix !== i));

  const subtotal = itens.reduce((s, i) => s + i.qtd * i.preco - i.desconto, 0);
  const total = Math.max(0, subtotal - descontoGeral);

  const criarCliente = async () => {
    if (!novoCli.nome.trim()) return toast.error("Informe o nome");
    try {
      const c = await upsertCliente.mutateAsync({ nome: novoCli.nome, telefone: novoCli.telefone || null, documento: novoCli.documento || null });
      setCliente(c as any);
      setBuscaCliente("");
      setNovoCli({ nome: "", telefone: "", documento: "" });
      setNovoCliOpen(false);
      toast.success("Cliente cadastrado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao cadastrar cliente");
    }
  };

  const salvar = async () => {
    if (itens.length === 0) return toast.error("Adicione ao menos um item");
    try {
      const pedido = await createPedido.mutateAsync({
        cliente_id: cliente?.id ?? null,
        vendedor_id: vendedorId ?? null,
        origem,
        pagamento,
        desconto: descontoGeral,
        observacoes: observacoes || null,
        itens: itens.map((i) => ({ produto_id: i.produto.id, qtd: i.qtd, preco_unit: i.preco })),
      });
      toast.success(`Pedido ${pedido.numero} criado`);
      onCreated(pedido.id);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  return (
    <div className="space-y-4">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-surface/95 px-4 py-2.5 backdrop-blur md:-mx-6">
        <div className="text-sm">
          <span className="font-semibold">{tipo === "pedido" ? "Novo pedido" : "Novo orçamento"}</span>
          <span className="ml-2 text-muted-foreground">· {itens.length} {itens.length === 1 ? "item" : "itens"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button type="button" onClick={salvar} disabled={createPedido.isPending || itens.length === 0} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50">
            {createPedido.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {createPedido.isPending ? "Salvando..." : `Finalizar · ${formatBRL(total)}`}
          </button>
        </div>
      </div>

      <SectionCard title="Dados Principais">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
          <Field label="Orçamento" className="md:col-span-2"><input disabled placeholder="—" className={`${inp} bg-muted/40`} /></Field>
          <Field label="Pedido" className="md:col-span-2"><input disabled placeholder="auto" className={`${inp} bg-muted/40`} /></Field>
          <Field label="Nota" className="md:col-span-2"><input disabled placeholder="—" className={`${inp} bg-muted/40`} /></Field>
          <Field label="Data do pedido" className="md:col-span-3">
            <input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className={inp} />
          </Field>
          <Field label="Tipo" className="md:col-span-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className={inp}>
              <option value="pedido">Pedido</option>
              <option value="orcamento">Orçamento</option>
            </select>
          </Field>

          <Field label="Entrada/Saída" className="md:col-span-3">
            <select className={inp} defaultValue="saida"><option value="saida">Saída</option><option value="entrada">Entrada</option></select>
          </Field>
          <Field label="Operação" className="md:col-span-3">
            <select value={operacao} onChange={(e) => setOperacao(e.target.value as any)} className={inp}>
              <option value="venda">Venda (Saída)</option>
              <option value="devolucao">Devolução</option>
            </select>
          </Field>
          <Field label="Pagamento" className="md:col-span-3">
            <select value={pagamento} onChange={(e) => setPagamento(e.target.value as any)} className={inp}>
              <option value="pix">PIX</option><option value="credito">Crédito</option><option value="debito">Débito</option><option value="dinheiro">Dinheiro</option><option value="fiado">Fiado</option>
            </select>
          </Field>
          <Field label="Origem" className="md:col-span-3">
            <input disabled value={origem} className={`${inp} bg-muted/40 capitalize`} />
          </Field>

          <Field label="Cliente / Fornecedor" className="md:col-span-12">
            {cliente ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{cliente.nome}</span>
                  {cliente.telefone && <span className="text-xs text-muted-foreground">· {cliente.telefone}</span>}
                  {cliente.documento && <span className="text-xs text-muted-foreground">· {cliente.documento}</span>}
                </div>
                <button type="button" onClick={() => setCliente(null)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Pesquise por nome, telefone ou documento... (mín. 2 caracteres)"
                    className={`${inp} pl-9`}
                  />
                  {buscaCliente.length >= 2 && (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                      {clientesFilt.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum cliente encontrado</p>
                      )}
                      {clientesFilt.map((c) => (
                        <button key={c.id} type="button" onClick={() => { setCliente(c); setBuscaCliente(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                          <p className="font-medium">{c.nome}</p>
                          {c.telefone && <p className="text-[11px] text-muted-foreground">{c.telefone}{c.documento ? ` · ${c.documento}` : ""}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setNovoCliOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                  <Plus className="h-3.5 w-3.5" /> Novo
                </button>
              </div>
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Produtos">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={buscaRef}
              value={buscaProd}
              onFocus={() => setShowProdList(true)}
              onChange={(e) => { setBuscaProd(e.target.value); setShowProdList(true); }}
              onKeyDown={onBuscaSubmit}
              placeholder="Pesquise produto por nome, SKU ou código de barras... (Enter adiciona o primeiro)"
              className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {showProdList && prodFilt.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                {prodFilt.map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduto(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded bg-muted">
                      {p.imagem_url ? <img src={p.imagem_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">IMG</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="text-[11px] text-muted-foreground">{p.sku} · estoque {Number(p.estoque)} {p.unidade}</p>
                    </div>
                    <span className="text-sm font-semibold tabular text-primary">{formatBRL(Number(p.preco_venda))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2 text-left w-10">#</th>
                  <th className="px-2 py-2 text-left w-24">Ref.</th>
                  <th className="px-2 py-2 text-left">Produto</th>
                  <th className="px-2 py-2 text-right w-20">Qtde</th>
                  <th className="px-2 py-2 text-center w-16">UN</th>
                  <th className="px-2 py-2 text-right w-28">Vlr. Unitário</th>
                  <th className="px-2 py-2 text-right w-24">Vlr. Desc.</th>
                  <th className="px-2 py-2 text-right w-28">Total Líquido</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-muted-foreground">Pesquise e adicione produtos acima</td></tr>
                )}
                {itens.map((it, i) => {
                  const tot = Math.max(0, it.qtd * it.preco - it.desconto);
                  return (
                    <tr key={it.produto.id} className="border-b last:border-b-0">
                      <td className="px-2 py-1.5 text-xs text-muted-foreground tabular">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px]">{it.produto.sku}</td>
                      <td className="px-2 py-1.5">{it.produto.nome}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={1} value={it.qtd} onChange={(e) => updItem(i, { qtd: Math.max(1, Number(e.target.value) || 1) })} className={inpRight} />
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">{it.produto.unidade}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" min={0} value={it.preco} onChange={(e) => updItem(i, { preco: Math.max(0, Number(e.target.value) || 0) })} className={inpRight} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" min={0} value={it.desconto} onChange={(e) => updItem(i, { desconto: Math.max(0, Number(e.target.value) || 0) })} className={inpRight} />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular font-semibold">{formatBRL(tot)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Observações</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} placeholder="Observações do pedido..." className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Subtotal</span><span className="tabular font-medium">{formatBRL(subtotal)}</span></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Desconto geral</span>
                <input type="number" min={0} value={descontoGeral} onChange={(e) => setDescontoGeral(Math.max(0, Number(e.target.value) || 0))} className="h-7 w-24 rounded-md border border-input bg-background px-2 text-right text-xs tabular" />
              </div>
              <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">Total</span><span className="tabular font-bold text-primary">{formatBRL(total)}</span></div>
            </div>
          </div>
        </div>
      </SectionCard>

      <Dialog open={novoCliOpen} onOpenChange={setNovoCliOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar cliente</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Field label="Nome"><input value={novoCli.nome} onChange={(e) => setNovoCli((s) => ({ ...s, nome: e.target.value }))} className={inp} /></Field>
            <Field label="Telefone"><input value={novoCli.telefone} onChange={(e) => setNovoCli((s) => ({ ...s, telefone: e.target.value }))} className={inp} /></Field>
            <Field label="CPF/CNPJ"><input value={novoCli.documento} onChange={(e) => setNovoCli((s) => ({ ...s, documento: e.target.value }))} className={inp} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNovoCliOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
              <button type="button" onClick={criarCliente} disabled={upsertCliente.isPending} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">{upsertCliente.isPending ? "Salvando..." : "Salvar cliente"}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}