import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Barcode, Plus, Minus, Trash2, User, Percent, CreditCard, Banknote, QrCode, HandCoins, CheckCircle2, Power, Settings, Package, FileText, Receipt } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppSettings, useCategorias, useCreatePedido, useProdutos, type Produto } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { beepError } from "@/lib/sounds";
import { beepScan } from "@/lib/sounds";
import { useHidScanner } from "@/lib/hid-scanner";
import { normalizeEan } from "@/lib/ean";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({ meta: [{ title: "PDV — Quick OS" }] }),
  component: PdvPage,
});

type PaymentId = "pix" | "dinheiro" | "nota_promissoria" | "cheque" | "debito" | "credito" | "fiado" | "outro";
type CartItem = { produto: Produto; qtd: number };
const PAGAMENTOS: { id: PaymentId; nome: string; icon: any }[] = [
  { id: "pix", nome: "PIX", icon: QrCode },
  { id: "dinheiro", nome: "Dinheiro", icon: Banknote },
  { id: "nota_promissoria", nome: "Nota promissória", icon: FileText },
  { id: "cheque", nome: "Cheque", icon: Receipt },
  { id: "debito", nome: "Débito", icon: CreditCard },
  { id: "credito", nome: "Crédito", icon: CreditCard },
  { id: "fiado", nome: "Fiado", icon: HandCoins },
  { id: "outro", nome: "Outro", icon: CreditCard },
];

const toCents = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);
const fromCents = (value: number) => value / 100;
const parseMoney = (value: string) => {
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function PdvPage() {
  const { user } = useAuth();
  const { data: produtos = [], isLoading } = useProdutos();
  const { data: categorias = [] } = useCategorias();
  const { data: settings } = useAppSettings();
  const createPedido = useCreatePedido();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [pag, setPag] = useState<PaymentId>("pix");
  const [recebido, setRecebido] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  // Lookup O(1) por código de barras / SKU para reagir a scanner HID instantaneamente
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

  const handleScanCode = (code: string) => {
    const norm = normalizeEan(code);
    const p = indexByCode.get(norm) ?? indexByCode.get(code.trim().toLowerCase());
    if (!p) {
      beepError();
      toast.error(`Código não cadastrado: ${code}`);
      return;
    }
    beepScan();
    addProduto(p);
    toast.success(`${p.nome} · ${formatBRL(Number(p.preco_venda))}`);
  };


  const paymentMap = (settings?.metodos_pagamento ?? {}) as Record<string, boolean>;
  const pagamentosAtivos = useMemo(() => {
    const list = PAGAMENTOS.filter((p) => paymentMap[p.id] !== false);
    return list.length ? list : PAGAMENTOS.slice(0, 5);
  }, [paymentMap]);

  useEffect(() => {
    if (!pagamentosAtivos.some((p) => p.id === pag)) setPag(pagamentosAtivos[0]?.id ?? "pix");
  }, [pag, pagamentosAtivos]);

  const filtrados = useMemo(
    () =>
      produtos.filter(
        (p: any) =>
          p.ativo !== false &&
          (!cat || p.categoria_id === cat) &&
          (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku?.toLowerCase().includes(busca.toLowerCase()) || p.codigo_barras?.toLowerCase().includes(busca.toLowerCase())),
      ),
    [produtos, busca, cat],
  );

  const subtotalCents = cart.reduce((s, i) => s + toCents(Number(i.produto.preco_venda)) * i.qtd, 0);
  const descontoCents = Math.min(toCents(desconto), subtotalCents);
  const totalCents = Math.max(0, subtotalCents - descontoCents);
  const subtotal = fromCents(subtotalCents);
  const total = fromCents(totalCents);
  const troco = pag === "dinheiro" && recebido ? fromCents(Math.max(0, toCents(parseMoney(recebido)) - totalCents)) : 0;

  const addProduto = (p: Produto) => {
    setCart((c) => {
      const ex = c.find((i) => i.produto.id === p.id);
      if (ex) return c.map((i) => (i.produto.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
      return [...c, { produto: p, qtd: 1 }];
    });
  };

  const finalizar = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio");
    if (pag === "fiado") return toast.error("Selecione um cliente antes de vender fiado");
    if (pag === "dinheiro" && recebido && toCents(parseMoney(recebido)) < totalCents) return toast.error("Valor recebido menor que o total");
    try {
      const pedido = await createPedido.mutateAsync({
        cliente_id: null,
        operador_id: user?.id ?? null,
        origem: "pdv",
        pagamento: pag,
        desconto: fromCents(descontoCents),
        observacoes: "Venda criada pelo PDV",
        itens: cart.map((i) => ({ produto_id: i.produto.id, qtd: i.qtd, preco_unit: fromCents(toCents(Number(i.produto.preco_venda))) })),
      });
      toast.success(`Venda ${pedido.numero} finalizada · ${formatBRL(total)}`);
      setCart([]);
      setDesconto(0);
      setRecebido("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao finalizar venda");
    }
  };

  const disabled = settings?.pdv_ativo === false;

  // Captura GLOBAL de scanner HID. Desativada quando a câmera do BarcodeScanner está aberta
  // para evitar captura dupla (o leitor manda Enter no input manual).
  useHidScanner(handleScanCode, !disabled && !scanOpen);

  return (
    <div className="relative -mx-4 -my-4 min-h-[calc(100vh-3.5rem)] md:-mx-6 md:-my-6">
      <div className={cn("grid min-h-[calc(100vh-3.5rem)] grid-cols-1 overflow-hidden lg:grid-cols-[1fr_420px]", disabled && "pointer-events-none select-none blur-[2px]")}> 
        <div className="flex min-h-[60vh] flex-col overflow-hidden border-r bg-card">
          <div className="border-b p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto por nome, SKU ou código..."
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button onClick={() => setScanOpen(true)} className="flex h-11 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
                <Barcode className="h-4 w-4" /> Scanner
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => setCat(null)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !cat ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted")}>Todas</button>
              {categorias.map((c: any) => (
                <button key={c.id} onClick={() => setCat(c.id)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", cat === c.id ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted")}>{c.nome}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4">
            {isLoading && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Carregando produtos...</div>}
            {!isLoading && filtrados.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filtrados.map((p: any) => (
                <button key={p.id} onClick={() => addProduto(p)} className="group flex min-h-[176px] flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:border-primary/50 hover:shadow-elegant">
                  <div className="flex h-24 items-center justify-center overflow-hidden bg-muted/60">
                    {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  <div className="flex flex-1 flex-col border-t p-2.5">
                    <p className="line-clamp-2 text-[12px] font-medium leading-tight">{p.nome}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{p.sku || "sem SKU"}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span className="tabular text-sm font-semibold text-primary">{formatBRL(Number(p.preco_venda))}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px]", Number(p.estoque) <= Number(p.estoque_minimo ?? 0) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{Number(p.estoque)}{p.unidade}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex min-h-[520px] flex-col overflow-hidden bg-surface lg:min-h-0">
          <div className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-semibold">Venda em andamento</p>
              <p className="text-xs text-muted-foreground">{user?.name ?? "Operador"} · {cart.length} itens</p>
            </div>
            <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive">Limpar</button>
          </div>

          <div className="border-b bg-card px-4 py-3 sm:px-5">
            <button className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
              <User className="h-3.5 w-3.5" /> Selecionar cliente (opcional)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {cart.length === 0 && <div className="flex h-full min-h-44 flex-col items-center justify-center px-6 py-12 text-center"><p className="text-sm text-muted-foreground">Adicione produtos para iniciar a venda</p></div>}
            {cart.map((item) => (
              <div key={item.produto.id} className="border-b bg-card px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.produto.nome}</p><p className="text-[11px] text-muted-foreground">{item.produto.sku || "sem SKU"} · {formatBRL(Number(item.produto.preco_venda))} un</p></div>
                  <button onClick={() => setCart((c) => c.filter((i) => i.produto.id !== item.produto.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCart((c) => c.map((i) => i.produto.id === item.produto.id ? { ...i, qtd: Math.max(1, i.qtd - 1) } : i))} className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted"><Minus className="h-3 w-3" /></button>
                    <input value={item.qtd} onChange={(e) => setCart((c) => c.map((i) => i.produto.id === item.produto.id ? { ...i, qtd: Math.max(1, parseInt(e.target.value) || 1) } : i))} className="h-7 w-12 rounded-md border bg-background text-center text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button onClick={() => setCart((c) => c.map((i) => i.produto.id === item.produto.id ? { ...i, qtd: i.qtd + 1 } : i))} className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted"><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="tabular text-sm font-semibold">{formatBRL(Number(item.produto.preco_venda) * item.qtd)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t bg-card px-4 py-3 text-sm sm:px-5">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular">{formatBRL(subtotal)}</span></div>
            <div className="mt-2 flex items-center justify-between"><span className="text-muted-foreground">Desconto</span><div className="relative"><Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" /><input type="number" value={desconto || ""} onChange={(e) => setDesconto(Math.max(0, parseMoney(e.target.value)))} placeholder="0,00" className="h-7 w-24 rounded-md border bg-background pr-6 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" /></div></div>
            <div className="mt-2 flex items-baseline justify-between border-t pt-2"><span className="text-sm font-medium">Total</span><span className="tabular text-2xl font-bold text-primary">{formatBRL(total)}</span></div>
          </div>

          <div className="border-t bg-card px-4 py-3 sm:px-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
              {pagamentosAtivos.map((p) => (
                <button key={p.id} onClick={() => setPag(p.id)} className={cn("flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] font-medium transition-colors", pag === p.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}><p.icon className="h-3.5 w-3.5" />{p.nome}</button>
              ))}
            </div>
            {pag === "dinheiro" && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"><div className="flex items-center gap-2"><span className="text-muted-foreground">Recebido</span><input type="number" value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder="0,00" className="h-7 w-24 rounded border bg-background px-2 text-right tabular focus:outline-none focus:ring-2 focus:ring-primary/20" /></div><span className="text-muted-foreground">Troco: <span className="tabular font-semibold text-success">{formatBRL(troco)}</span></span></div>}
          </div>

          <div className="border-t bg-card p-3">
            <button onClick={finalizar} disabled={createPedido.isPending || cart.length === 0} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-elegant transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> {createPedido.isPending ? "Finalizando..." : `Finalizar venda · ${formatBRL(total)}`}
            </button>
          </div>
        </aside>
      </div>

      {disabled && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/30 p-4 backdrop-blur-sm">
          <div className="glass max-w-md rounded-xl p-6 text-center shadow-elegant">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><Power className="h-5 w-5" /></div>
            <h2 className="text-lg font-semibold">Essa tela está desativada</h2>
            <p className="mt-1 text-sm text-muted-foreground">Vá até Configurações › PDV para ativar e liberar as ações de venda.</p>
            <Link to="/configuracoes" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"><Settings className="h-4 w-4" /> Abrir configurações</Link>
          </div>
        </div>
      )}
      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code) => { setScanOpen(false); handleScanCode(code); }}
      />
    </div>
  );
}
