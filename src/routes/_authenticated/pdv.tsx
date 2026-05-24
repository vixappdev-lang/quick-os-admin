import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Barcode, X, Plus, Minus, Trash2, User, Percent, CreditCard, Banknote, QrCode, HandCoins, CheckCircle2 } from "lucide-react";
import { produtos, type Produto, categorias } from "@/data/mock";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({ meta: [{ title: "PDV — Quick OS" }] }),
  component: PdvPage,
});

type CartItem = { produto: Produto; qtd: number };
const PAGAMENTOS = [
  { id: "pix", nome: "PIX", icon: QrCode },
  { id: "credito", nome: "Crédito", icon: CreditCard },
  { id: "debito", nome: "Débito", icon: CreditCard },
  { id: "dinheiro", nome: "Dinheiro", icon: Banknote },
  { id: "fiado", nome: "Fiado", icon: HandCoins },
] as const;

function PdvPage() {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([
    { produto: produtos[0], qtd: 6 },
    { produto: produtos[3], qtd: 2 },
    { produto: produtos[8], qtd: 1 },
  ]);
  const [desconto, setDesconto] = useState(0);
  const [pag, setPag] = useState<typeof PAGAMENTOS[number]["id"]>("pix");
  const [recebido, setRecebido] = useState("");

  const filtrados = useMemo(
    () =>
      produtos.filter(
        (p) => (!cat || p.categoria === cat) && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku.toLowerCase().includes(busca.toLowerCase())),
      ),
    [busca, cat],
  );

  const subtotal = cart.reduce((s, i) => s + i.produto.preco * i.qtd, 0);
  const total = Math.max(0, subtotal - desconto);
  const troco = pag === "dinheiro" && recebido ? Math.max(0, parseFloat(recebido) - total) : 0;

  const addProduto = (p: Produto) => {
    setCart((c) => {
      const ex = c.find((i) => i.produto.id === p.id);
      if (ex) return c.map((i) => (i.produto.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
      return [...c, { produto: p, qtd: 1 }];
    });
  };

  const finalizar = () => {
    if (cart.length === 0) return toast.error("Carrinho vazio");
    toast.success(`Venda finalizada · ${formatBRL(total)}`);
    setCart([]);
    setDesconto(0);
    setRecebido("");
  };

  return (
    <div className="-mx-6 -my-6 grid h-[calc(100vh-3.5rem)] grid-cols-[1fr_420px]">
      {/* LEFT */}
      <div className="flex flex-col overflow-hidden border-r bg-card">
        <div className="border-b p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto por nome ou SKU... (F2)"
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button className="flex h-11 items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
              <Barcode className="h-4 w-4" /> Scanner
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button onClick={() => setCat(null)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !cat ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted")}>
              Todas
            </button>
            {categorias.map((c) => (
              <button key={c.id} onClick={() => setCat(c.nome)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", cat === c.nome ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted")}>
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduto(p)}
                className="group flex flex-col rounded-lg border bg-card text-left transition-all hover:border-primary/50 hover:shadow-elegant"
              >
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-muted to-muted/30 text-3xl">
                  🍾
                </div>
                <div className="border-t p-2.5">
                  <p className="line-clamp-2 text-[12px] font-medium leading-tight">{p.nome}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{p.sku}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="tabular text-sm font-semibold text-primary">{formatBRL(p.preco)}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px]", p.estoque < p.estoqueMin ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                      {p.estoque}un
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — carrinho */}
      <aside className="flex flex-col overflow-hidden bg-surface">
        <div className="flex items-center justify-between border-b bg-card px-5 py-3">
          <div>
            <p className="text-sm font-semibold">Venda em andamento</p>
            <p className="text-xs text-muted-foreground">Caixa 01 · Ana Lima</p>
          </div>
          <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive">Limpar</button>
        </div>

        <div className="border-b bg-card px-5 py-3">
          <button className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
            <User className="h-3.5 w-3.5" /> Selecionar cliente (opcional)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {cart.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">Adicione produtos para iniciar a venda</p>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.produto.id} className="border-b bg-card px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.produto.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{item.produto.sku} · {formatBRL(item.produto.preco)} un</p>
                </div>
                <button onClick={() => setCart((c) => c.filter((i) => i.produto.id !== item.produto.id))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => setCart((c) => c.map((i) => i.produto.id === item.produto.id ? { ...i, qtd: Math.max(1, i.qtd - 1) } : i))} className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted">
                    <Minus className="h-3 w-3" />
                  </button>
                  <input value={item.qtd} onChange={(e) => setCart((c) => c.map((i) => i.produto.id === item.produto.id ? { ...i, qtd: Math.max(1, parseInt(e.target.value) || 1) } : i))} className="h-7 w-12 rounded-md border bg-background text-center text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <button onClick={() => setCart((c) => c.map((i) => i.produto.id === item.produto.id ? { ...i, qtd: i.qtd + 1 } : i))} className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="tabular text-sm font-semibold">{formatBRL(item.produto.preco * item.qtd)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t bg-card px-5 py-3 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular">{formatBRL(subtotal)}</span></div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Desconto</span>
            <div className="relative">
              <Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input type="number" value={desconto || ""} onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} placeholder="0,00" className="h-7 w-24 rounded-md border bg-background pr-6 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="text-sm font-medium">Total</span>
            <span className="tabular text-2xl font-bold text-primary">{formatBRL(total)}</span>
          </div>
        </div>

        <div className="border-t bg-card px-5 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forma de pagamento</p>
          <div className="grid grid-cols-5 gap-1.5">
            {PAGAMENTOS.map((p) => (
              <button key={p.id} onClick={() => setPag(p.id)} className={cn("flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] font-medium transition-colors", pag === p.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                <p.icon className="h-3.5 w-3.5" />
                {p.nome}
              </button>
            ))}
          </div>
          {pag === "dinheiro" && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Recebido</span>
                <input type="number" value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder="0,00" className="h-7 w-24 rounded border bg-background px-2 text-right tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <span className="text-muted-foreground">Troco: <span className="tabular font-semibold text-success">{formatBRL(troco)}</span></span>
            </div>
          )}
        </div>

        <div className="border-t bg-card p-3">
          <button onClick={finalizar} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-elegant transition-colors hover:bg-[var(--primary-hover)]">
            <CheckCircle2 className="h-4 w-4" /> Finalizar venda · {formatBRL(total)}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">F8 para finalizar · ESC para cancelar</p>
        </div>
      </aside>
    </div>
  );
}