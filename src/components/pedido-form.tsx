import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Banknote, CalendarDays, CreditCard, FileText, Hash, Loader2, Minus, PackagePlus, Plus, QrCode, Receipt, ReceiptText, Save, Search, Trash2, User as UserIcon, WalletCards, X } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import {
  useAppSettings,
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

type PaymentMethod = "pix" | "dinheiro" | "nota_promissoria" | "cheque" | "debito" | "credito" | "fiado" | "outro";
type Item = { produto: Produto; qtd: number; preco: number; desconto: number };

interface Props {
  vendedorId?: string;
  origem?: "balcao" | "delivery" | "pdv";
  onCreated: (pedidoId: string) => void;
  onCancel: () => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: "pix", label: "PIX", icon: QrCode },
  { id: "dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "nota_promissoria", label: "Nota promissória", icon: FileText },
  { id: "cheque", label: "Cheque", icon: Receipt },
  { id: "debito", label: "Débito", icon: WalletCards },
  { id: "credito", label: "Crédito", icon: CreditCard },
  { id: "fiado", label: "Fiado", icon: ReceiptText },
  { id: "outro", label: "Outro", icon: ArrowRightLeft },
];

const inputBase = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted/40 disabled:text-muted-foreground";
const inputRight = "h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const toCents = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);
const fromCents = (value: number) => value / 100;
const money = (value: number) => fromCents(toCents(value));

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function numericValue(value: string, fallback = 0) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function PedidoForm({ vendedorId, origem = "balcao", onCreated, onCancel }: Props) {
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const { data: settings } = useAppSettings();
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
  const [pagamento, setPagamento] = useState<PaymentMethod>("pix");
  const [valorRecebido, setValorRecebido] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [itens, setItens] = useState<Item[]>([]);
  const [buscaProd, setBuscaProd] = useState("");
  const [showProdList, setShowProdList] = useState(false);
  const [novoCliOpen, setNovoCliOpen] = useState(false);
  const [novoCli, setNovoCli] = useState({ nome: "", telefone: "", documento: "" });
  const buscaRef = useRef<HTMLInputElement>(null);

  const paymentMap = (settings?.metodos_pagamento ?? {}) as Record<string, boolean>;
  const activePayments = useMemo(() => {
    const filtered = PAYMENT_OPTIONS.filter((p) => paymentMap[p.id] !== false);
    return filtered.length ? filtered : PAYMENT_OPTIONS.slice(0, 5);
  }, [paymentMap]);

  useEffect(() => {
    if (!activePayments.some((p) => p.id === pagamento)) {
      setPagamento(activePayments[0]?.id ?? "pix");
    }
  }, [activePayments, pagamento]);

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
          p.ativo !== false &&
          (p.nome.toLowerCase().includes(t) ||
            p.sku?.toLowerCase().includes(t) ||
            p.codigo_barras?.toLowerCase().includes(t)),
      )
      .slice(0, 10);
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

  const subtotalCents = itens.reduce((sum, item) => {
    const bruto = toCents(item.preco) * item.qtd;
    const desconto = toCents(item.desconto);
    return sum + Math.max(0, bruto - desconto);
  }, 0);
  const descontoCents = Math.min(toCents(descontoGeral), subtotalCents);
  const totalCents = Math.max(0, subtotalCents - descontoCents);
  const subtotal = fromCents(subtotalCents);
  const total = fromCents(totalCents);
  const recebido = numericValue(valorRecebido);
  const troco = pagamento === "dinheiro" ? Math.max(0, money(recebido - total)) : 0;

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
    if (pagamento === "fiado" && !cliente) return toast.error("Selecione um cliente para pagamento fiado");
    if (pagamento === "dinheiro" && valorRecebido && toCents(recebido) < totalCents) return toast.error("Valor recebido menor que o total");
    try {
      const pedido = await createPedido.mutateAsync({
        cliente_id: cliente?.id ?? null,
        vendedor_id: vendedorId ?? null,
        origem,
        pagamento,
        desconto: fromCents(descontoCents),
        observacoes: observacoes || null,
        itens: itens.map((i) => ({
          produto_id: i.produto.id,
          qtd: i.qtd,
          preco_unit: money(i.preco),
          desconto: money(i.desconto),
        })),
      });
      toast.success(`Pedido ${pedido.numero} criado`);
      onCreated(pedido.id);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      <div className="sticky top-0 z-20 -mx-4 hidden border-b bg-surface/95 px-4 py-3 backdrop-blur md:-mx-6 md:block md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                <ReceiptText className="h-3.5 w-3.5" /> {tipo === "pedido" ? "Novo pedido" : "Novo orçamento"}
              </span>
              <span className="text-xs text-muted-foreground">{itens.length} {itens.length === 1 ? "item" : "itens"} · {cliente?.nome ?? "cliente avulso"}</span>
            </div>
            <p className="mt-1 text-sm font-semibold tabular text-foreground">Total atual: {formatBRL(total)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onCancel} className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button type="button" onClick={salvar} disabled={createPedido.isPending || itens.length === 0} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {createPedido.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {createPedido.isPending ? "Salvando..." : `Salvar pedido · ${formatBRL(total)}`}
            </button>
          </div>
        </div>
      </div>

      <SectionCard title="Dados principais" description="Cliente e tipo da operação" className="shadow-elegant">
        {/* Campos meta-administrativos colapsados no mobile */}
        <details className="md:hidden -mt-1 mb-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer select-none font-medium text-muted-foreground">Mais detalhes (orçamento, data, tipo, operação)</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Data"><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className={`${inputBase} pl-9`} /></div></Field>
            <Field label="Tipo">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className={inputBase}>
                <option value="pedido">Pedido</option>
                <option value="orcamento">Orçamento</option>
              </select>
            </Field>
            <Field label="Operação" className="col-span-2">
              <select value={operacao} onChange={(e) => setOperacao(e.target.value as any)} className={inputBase}>
                <option value="venda">Venda (Saída)</option>
                <option value="devolucao">Devolução</option>
              </select>
            </Field>
          </div>
        </details>

        {/* Layout desktop completo */}
        <div className="hidden md:grid grid-cols-2 gap-3 lg:grid-cols-12">
          <Field label="Orçamento" className="lg:col-span-2"><div className="relative"><Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input disabled placeholder="—" className={`${inputBase} pl-9`} /></div></Field>
          <Field label="Pedido" className="lg:col-span-2"><input disabled value="Automático" className={inputBase} /></Field>
          <Field label="Nota" className="lg:col-span-2"><input disabled placeholder="Após faturar" className={inputBase} /></Field>
          <Field label="Data pedido" className="col-span-2 lg:col-span-3"><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className={`${inputBase} pl-9`} /></div></Field>
          <Field label="Tipo" className="lg:col-span-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className={inputBase}>
              <option value="pedido">Pedido</option>
              <option value="orcamento">Orçamento</option>
            </select>
          </Field>

          <Field label="Empresa" className="col-span-2 lg:col-span-4"><input disabled value={settings?.empresa_razao ?? "Empresa principal"} className={inputBase} /></Field>
          <Field label="Entrada/Saída" className="lg:col-span-2"><select className={inputBase} defaultValue="saida"><option value="saida">Saída</option><option value="entrada">Entrada</option></select></Field>
          <Field label="Operação" className="lg:col-span-3">
            <select value={operacao} onChange={(e) => setOperacao(e.target.value as any)} className={inputBase}>
              <option value="venda">Venda (Saída)</option>
              <option value="devolucao">Devolução</option>
            </select>
          </Field>
          <Field label="Origem" className="lg:col-span-3"><input disabled value={origem} className={`${inputBase} capitalize`} /></Field>
        </div>

        {/* Cliente (visível em todos os tamanhos) */}
        <div className="mt-3 md:mt-3">
          <Field label="Cliente / Fornecedor">
            {cliente ? (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/25 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><UserIcon className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{cliente.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{[cliente.telefone, cliente.documento].filter(Boolean).join(" · ") || "Cliente selecionado"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setCliente(null)} className="inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-destructive"><X className="mr-1 h-3.5 w-3.5" /> Trocar</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Pesquise por nome, telefone ou documento..."
                    className={`${inputBase} pl-9`}
                  />
                  {buscaCliente.length >= 2 && (
                    <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                      {clientesFilt.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Nenhum cliente encontrado</p>}
                      {clientesFilt.map((c) => (
                        <button key={c.id} type="button" onClick={() => { setCliente(c); setBuscaCliente(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                          <p className="font-medium">{c.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{[c.telefone, c.documento].filter(Boolean).join(" · ") || "Sem documento"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setNovoCliOpen(true)} className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted sm:w-auto">
                  <Plus className="h-3.5 w-3.5" /> Novo cliente
                </button>
              </div>
            )}
          </Field>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SectionCard title="Produtos" description="Busque por nome, SKU ou código de barras e adicione os itens" padded={false}>
            <div className="border-b p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={buscaRef}
                  value={buscaProd}
                  onFocus={() => setShowProdList(true)}
                  onChange={(e) => { setBuscaProd(e.target.value); setShowProdList(true); }}
                  onKeyDown={onBuscaSubmit}
                  placeholder="Pesquisar produto... Enter adiciona o primeiro resultado"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {showProdList && buscaProd && (
                  <div className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                    {prodFilt.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhum produto encontrado</p>}
                    {prodFilt.map((p) => (
                      <button key={p.id} type="button" onClick={() => addProduto(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" /> : <PackagePlus className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{p.sku || "sem SKU"} · estoque {Number(p.estoque)} {p.unidade}</p>
                        </div>
                        <span className="tabular text-sm font-semibold text-primary">{formatBRL(Number(p.preco_venda))}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de itens — TABELA em md+ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-12 px-3 py-2.5 text-left">Nº</th>
                    <th className="w-28 px-3 py-2.5 text-left">Ref.</th>
                    <th className="px-3 py-2.5 text-left">Produto</th>
                    <th className="w-24 px-3 py-2.5 text-right">Qtde</th>
                    <th className="w-16 px-3 py-2.5 text-center">UN</th>
                    <th className="w-32 px-3 py-2.5 text-right">Vlr. unitário</th>
                    <th className="w-28 px-3 py-2.5 text-right">Vlr. desc.</th>
                    <th className="w-32 px-3 py-2.5 text-right">Total líquido</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-14 text-center text-sm text-muted-foreground">Pesquise um produto acima para montar o pedido.</td></tr>
                  )}
                  {itens.map((it, i) => {
                    const tot = fromCents(Math.max(0, toCents(it.preco) * it.qtd - toCents(it.desconto)));
                    return (
                      <tr key={it.produto.id} className="border-b last:border-b-0 hover:bg-muted/25">
                        <td className="px-3 py-2 text-xs text-muted-foreground tabular">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{it.produto.sku || "—"}</td>
                        <td className="px-3 py-2"><p className="font-medium">{it.produto.nome}</p><p className="text-[11px] text-muted-foreground">Estoque: {Number(it.produto.estoque)} {it.produto.unidade}</p></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => updItem(i, { qtd: Math.max(1, it.qtd - 1) })} className="flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-muted"><Minus className="h-3 w-3" /></button>
                            <input type="number" min={1} value={it.qtd} onChange={(e) => updItem(i, { qtd: Math.max(1, Math.round(numericValue(e.target.value, 1))) })} className="h-8 w-14 rounded-md border border-input bg-background text-center text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            <button type="button" onClick={() => updItem(i, { qtd: it.qtd + 1 })} className="flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-muted"><Plus className="h-3 w-3" /></button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-xs">{it.produto.unidade}</td>
                        <td className="px-3 py-2"><input type="number" step="0.01" min={0} value={it.preco} onChange={(e) => updItem(i, { preco: money(Math.max(0, numericValue(e.target.value))) })} className={inputRight} /></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" min={0} value={it.desconto} onChange={(e) => updItem(i, { desconto: money(Math.max(0, numericValue(e.target.value))) })} className={inputRight} /></td>
                        <td className="px-3 py-2 text-right tabular font-semibold">{formatBRL(tot)}</td>
                        <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeItem(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Lista de itens — CARDS em mobile */}
            <div className="md:hidden divide-y">
              {itens.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Pesquise um produto acima para montar o pedido.</p>
              )}
              {itens.map((it, i) => {
                const tot = fromCents(Math.max(0, toCents(it.preco) * it.qtd - toCents(it.desconto)));
                return (
                  <div key={it.produto.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {it.produto.imagem_url ? <img src={it.produto.imagem_url} alt={it.produto.nome} className="h-full w-full object-cover" /> : <PackagePlus className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{it.produto.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{it.produto.sku || "sem SKU"} · estoque {Number(it.produto.estoque)} {it.produto.unidade}</p>
                      </div>
                      <button type="button" onClick={() => removeItem(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => updItem(i, { qtd: Math.max(1, it.qtd - 1) })} className="flex h-9 w-9 items-center justify-center rounded-md border bg-background"><Minus className="h-3.5 w-3.5" /></button>
                        <input type="number" min={1} value={it.qtd} onChange={(e) => updItem(i, { qtd: Math.max(1, Math.round(numericValue(e.target.value, 1))) })} className="h-9 w-14 rounded-md border border-input bg-background text-center text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <button type="button" onClick={() => updItem(i, { qtd: it.qtd + 1 })} className="flex h-9 w-9 items-center justify-center rounded-md border bg-background"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <p className="tabular text-sm font-semibold">{formatBRL(tot)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-muted-foreground">Vlr. unit.
                        <input type="number" step="0.01" min={0} value={it.preco} onChange={(e) => updItem(i, { preco: money(Math.max(0, numericValue(e.target.value))) })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">Vlr. desc.
                        <input type="number" step="0.01" min={0} value={it.desconto} onChange={(e) => updItem(i, { desconto: money(Math.max(0, numericValue(e.target.value))) })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Observações">
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} placeholder="Condição comercial, entrega, separação, contato do comprador..." className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </SectionCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <SectionCard title="Pagamento" description="Use apenas métodos ativos nas configurações">
            <div className="grid grid-cols-2 gap-2">
              {activePayments.map((p) => (
                <button key={p.id} type="button" onClick={() => setPagamento(p.id)} className={cn("flex h-12 items-center gap-2 rounded-md border px-3 text-left text-xs font-semibold transition", pagamento === p.id ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted")}>
                  <p.icon className="h-4 w-4" /> {p.label}
                </button>
              ))}
            </div>
            {pagamento === "dinheiro" && (
              <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Recebido</span>
                  <input type="number" step="0.01" value={valorRecebido} onChange={(e) => setValorRecebido(e.target.value)} placeholder="0,00" className="h-8 w-28 rounded-md border bg-background px-2 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="mt-2 flex justify-between border-t pt-2"><span className="text-muted-foreground">Troco</span><span className="tabular font-semibold text-success">{formatBRL(troco)}</span></div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Resumo" className="shadow-elegant">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Itens</span><span className="tabular">{itens.reduce((s, i) => s + i.qtd, 0)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular">{formatBRL(subtotal)}</span></div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Desconto geral</span>
                <input type="number" step="0.01" min={0} value={descontoGeral} onChange={(e) => setDescontoGeral(money(Math.max(0, numericValue(e.target.value))))} className="h-8 w-28 rounded-md border border-input bg-background px-2 text-right text-sm tabular" />
              </div>
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="font-semibold">Total</span>
                <span className="tabular text-2xl font-bold text-primary">{formatBRL(total)}</span>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>

      <Dialog open={novoCliOpen} onOpenChange={setNovoCliOpen}>
        <DialogContent className="max-sm:!w-screen max-sm:!max-w-none max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!top-0 max-sm:!left-0">
          <DialogHeader><DialogTitle>Cadastrar cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Nome"><input autoFocus value={novoCli.nome} onChange={(e) => setNovoCli((s) => ({ ...s, nome: e.target.value }))} className={inputBase} /></Field>
            <Field label="Telefone"><input value={novoCli.telefone} onChange={(e) => setNovoCli((s) => ({ ...s, telefone: e.target.value }))} className={inputBase} /></Field>
            <Field label="CPF/CNPJ"><input value={novoCli.documento} onChange={(e) => setNovoCli((s) => ({ ...s, documento: e.target.value }))} className={inputBase} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNovoCliOpen(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
              <button type="button" onClick={criarCliente} disabled={upsertCliente.isPending} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">{upsertCliente.isPending ? "Salvando..." : "Salvar cliente"}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barra de ações MOBILE — fixa no rodapé com safe-area */}
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t bg-card/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <button type="button" onClick={onCancel} className="h-11 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="button" onClick={salvar} disabled={createPedido.isPending || itens.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50">
          {createPedido.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {createPedido.isPending ? "Salvando..." : `Salvar · ${formatBRL(total)}`}
        </button>
      </div>
    </div>
  );
}
