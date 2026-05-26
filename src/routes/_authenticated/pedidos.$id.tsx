import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, CheckCircle2, Clock, Receipt, Truck, User, Pencil, Save, X, Minus, Plus, Trash2, Search, PackagePlus, MoreVertical, Wallet, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge, statusTone } from "@/components/status-badge";
import { usePedido, useUpdatePedidoStatus, useUpdatePedido, useProdutos, usePedidoPagamentos, useAddPedidoPagamento, useRemovePedidoPagamento, useEncerrarPedido, type Pedido } from "@/lib/queries";
import { formatBRL, formatDateTime, formatTime } from "@/lib/format";
import { printRomaneio } from "@/components/romaneio-print";
import { toast } from "sonner";
import { PAGAMENTO_LIST, pagamentoLabel } from "@/lib/pagamento";
import { PaymentSplitter } from "@/components/payment-splitter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({ meta: [{ title: "Detalhes do pedido — Quick OS" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ edit: s.edit === 1 || s.edit === "1" ? 1 : undefined }) as { edit?: 1 },
  component: PedidoDetail,
});

const FLOW: Pedido["status"][] = ["pendente", "autorizado", "separacao", "conferencia", "concluido"];

type EditItem = { produto: { id: string; nome: string; sku?: string | null; unidade?: string | null; imagem_url?: string | null }; qtd: number; preco_unit: number; desconto: number };

function PedidoDetail() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const { data: pedido, isLoading } = usePedido(id);
  const { data: produtos = [] } = useProdutos();
  const updateStatus = useUpdatePedidoStatus();
  const updatePedido = useUpdatePedido();
  const [editMode, setEditMode] = useState<boolean>(edit === 1);
  const [pagamento, setPagamento] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [desconto, setDesconto] = useState<string>("0");
  const [editItens, setEditItens] = useState<EditItem[]>([]);
  const [buscaProd, setBuscaProd] = useState("");
  const [showProdList, setShowProdList] = useState(false);

  useEffect(() => { setEditMode(edit === 1); }, [edit]);
  useEffect(() => {
    if (pedido) {
      setPagamento(pedido.pagamento ?? "pix");
      setObservacoes(pedido.observacoes ?? "");
      setDesconto(String(Number(pedido.desconto ?? 0)));
      setEditItens(
        (pedido.itens ?? []).map((i: any) => ({
          produto: {
            id: i.produto?.id ?? i.produto_id,
            nome: i.produto?.nome ?? "—",
            sku: i.produto?.sku ?? null,
            unidade: i.produto?.unidade ?? null,
            imagem_url: i.produto?.imagem_url ?? null,
          },
          qtd: Number(i.qtd),
          preco_unit: Number(i.preco_unit),
          desconto: Number(i.desconto ?? 0),
        }))
      );
    }
  }, [pedido?.id]);

  const prodFilt = useMemo(() => {
    const t = buscaProd.trim().toLowerCase();
    if (t.length < 1) return [];
    return produtos
      .filter((p: any) => p.ativo !== false && (p.nome.toLowerCase().includes(t) || p.sku?.toLowerCase().includes(t) || p.codigo_barras?.toLowerCase().includes(t)))
      .slice(0, 10);
  }, [produtos, buscaProd]);

  const addProduto = (p: any) => {
    setEditItens((prev) => {
      const ix = prev.findIndex((x) => x.produto.id === p.id);
      if (ix >= 0) {
        const cp = [...prev];
        cp[ix] = { ...cp[ix], qtd: cp[ix].qtd + 1 };
        return cp;
      }
      return [...prev, { produto: { id: p.id, nome: p.nome, sku: p.sku, unidade: p.unidade, imagem_url: p.imagem_url }, qtd: 1, preco_unit: Number(p.preco_venda), desconto: 0 }];
    });
    setBuscaProd("");
    setShowProdList(false);
  };
  const updItem = (i: number, patch: Partial<EditItem>) =>
    setEditItens((prev) => prev.map((it, ix) => (ix === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setEditItens((prev) => prev.filter((_, ix) => ix !== i));

  const toCents = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 100);
  const fromCents = (v: number) => v / 100;
  const subtotalEdit = useMemo(
    () => fromCents(editItens.reduce((s, i) => s + Math.max(0, toCents(i.preco_unit) * i.qtd - toCents(i.desconto)), 0)),
    [editItens]
  );
  const totalEdit = useMemo(() => Math.max(0, subtotalEdit - (Number(desconto) || 0)), [subtotalEdit, desconto]);

  if (isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando pedido...</div>;
  if (!pedido) return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <div className="rounded-xl border border-dashed bg-card/60 p-10 text-center text-sm text-muted-foreground">Pedido não encontrado</div>
    </div>
  );

  const numeroCurto = pedido.numero ?? `#${String(pedido.id).slice(0, 8).toUpperCase()}`;
  const itens = pedido.itens ?? [];
  const ix = FLOW.indexOf(pedido.status);
  const nextStatus: Pedido["status"] | null = ix >= 0 && ix < FLOW.length - 1 ? FLOW[ix + 1] : null;

  const avancar = async () => {
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ id: pedido.id, status: nextStatus });
      toast.success(`Pedido movido para ${nextStatus}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const salvarEdicao = async () => {
    if (editItens.length === 0) return toast.error("O pedido precisa ter ao menos 1 item");
    try {
      await updatePedido.mutateAsync({
        id: pedido.id,
        pagamento,
        observacoes,
        desconto: Number(desconto) || 0,
        itens: editItens.map((i) => ({
          produto_id: i.produto.id,
          qtd: i.qtd,
          preco_unit: i.preco_unit,
          desconto: i.desconto,
        })),
      });
      toast.success("Pedido atualizado");
      setEditMode(false);
      navigate({ to: "/pedidos/$id", params: { id: pedido.id }, search: {} as any });
    } catch (e: any) { toast.error(e.message); }
  };

  const imprimir = () => printRomaneio(pedido);

  const timeline = [
    { icon: Receipt, label: "Pedido criado", time: formatTime(pedido.created_at), done: true },
    { icon: CheckCircle2, label: "Autorizado", time: ix >= 1 ? formatTime(pedido.updated_at) : "—", done: ix >= 1 },
    { icon: Truck, label: "Em separação", time: ix >= 2 ? formatTime(pedido.updated_at) : "—", done: ix >= 2 },
    { icon: CheckCircle2, label: "Conferência", time: ix >= 3 ? formatTime(pedido.updated_at) : "—", done: ix >= 3 },
    { icon: CheckCircle2, label: "Finalizado", time: ix >= 4 ? formatTime(pedido.updated_at) : "—", done: ix >= 4 },
  ];

  return (
    <div>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para pedidos
      </Link>
      <PageHeader
        title={`Pedido ${numeroCurto}`}
        description={`Criado em ${formatDateTime(pedido.created_at)}${pedido.vendedor?.nome ? ` · Vendedor ${pedido.vendedor.nome}` : ""}`}
        actions={
          <>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" /> Alterar
              </button>
            ) : (
              <>
                <button onClick={() => { setEditMode(false); navigate({ to: "/pedidos/$id", params: { id: pedido.id }, search: {} as any }); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><X className="h-3.5 w-3.5" /> Cancelar</button>
                <button onClick={salvarEdicao} disabled={updatePedido.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Salvar</button>
              </>
            )}
            <button onClick={imprimir} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
            {nextStatus && (
              <button onClick={avancar} disabled={updateStatus.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
                Avançar para {nextStatus}
              </button>
            )}
            <StatusBadge status={pedido.status} tone={statusTone(pedido.status)} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SectionCard title={`Itens do pedido (${editMode ? editItens.length : itens.length})`} padded={false}>
            {editMode && (
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={buscaProd}
                    onFocus={() => setShowProdList(true)}
                    onChange={(e) => { setBuscaProd(e.target.value); setShowProdList(true); }}
                    placeholder="Adicionar produto por nome, SKU ou código..."
                    className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {showProdList && buscaProd && (
                    <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                      {prodFilt.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Nenhum produto encontrado</p>}
                      {prodFilt.map((p: any) => (
                        <button key={p.id} type="button" onClick={() => addProduto(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                            {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-cover" /> : <PackagePlus className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{p.sku || "sem SKU"} · {Number(p.estoque)} {p.unidade}</p>
                          </div>
                          <span className="tabular text-sm font-semibold text-primary">{formatBRL(Number(p.preco_venda))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visualização (não edição) */}
            {!editMode && (
              <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qtd</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unitário</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr></thead>
              <tbody>
                {itens.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem itens</td></tr>}
                {itens.map((i: any) => (
                  <tr key={i.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{i.produto?.nome ?? "—"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{i.produto?.sku ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{Number(i.qtd)} {i.produto?.unidade ?? ""}</td>
                    <td className="px-4 py-3 text-right tabular">{formatBRL(Number(i.preco_unit))}</td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{formatBRL(Number(i.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            )}

            {/* Edição de itens — cards (mobile + desktop) */}
            {editMode && (
              <div className="divide-y">
                {editItens.length === 0 && (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">Use o buscador acima para adicionar produtos.</p>
                )}
                {editItens.map((it, i) => {
                  const tot = fromCents(Math.max(0, toCents(it.preco_unit) * it.qtd - toCents(it.desconto)));
                  return (
                    <div key={`${it.produto.id}-${i}`} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {it.produto.imagem_url ? <img src={it.produto.imagem_url} alt={it.produto.nome} className="h-full w-full object-cover" /> : <PackagePlus className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.produto.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{it.produto.sku || "sem SKU"} · {it.produto.unidade ?? "UN"}</p>
                        </div>
                        <button onClick={() => removeItem(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remover">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <label className="block text-[11px] text-muted-foreground">Qtd</label>
                          <div className="mt-1 flex items-center gap-1">
                            <button type="button" onClick={() => updItem(i, { qtd: Math.max(1, it.qtd - 1) })} className="flex h-9 w-9 items-center justify-center rounded-md border bg-background"><Minus className="h-3.5 w-3.5" /></button>
                            <input type="number" min={1} value={it.qtd} onChange={(e) => updItem(i, { qtd: Math.max(1, Math.round(Number(e.target.value) || 1)) })} className="h-9 w-full rounded-md border border-input bg-background text-center text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            <button type="button" onClick={() => updItem(i, { qtd: it.qtd + 1 })} className="flex h-9 w-9 items-center justify-center rounded-md border bg-background"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted-foreground">Vlr. unit.</label>
                          <input type="number" step="0.01" min={0} value={it.preco_unit} onChange={(e) => updItem(i, { preco_unit: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted-foreground">Desconto</label>
                          <input type="number" step="0.01" min={0} value={it.desconto} onChange={(e) => updItem(i, { desconto: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted-foreground">Total</label>
                          <p className="mt-1 flex h-9 items-center justify-end px-2 text-sm font-semibold tabular">{formatBRL(tot)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular">{formatBRL(editMode ? subtotalEdit : Number(pedido.subtotal))}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Desconto</span>
                {editMode ? (
                  <input type="number" step="0.01" min="0" value={desconto} onChange={(e) => setDesconto(e.target.value)} className="h-7 w-28 rounded border bg-background px-2 text-right text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/20" />
                ) : (
                  <span className="tabular">- {formatBRL(Number(pedido.desconto))}</span>
                )}
              </div>
              <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Total</span><span className="tabular text-base text-primary">{formatBRL(editMode ? totalEdit : Number(pedido.total))}</span></div>
            </div>
          </SectionCard>

          {(editMode || pedido.observacoes) && (
            <SectionCard title="Observações">
              {editMode ? (
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} className="w-full rounded-md border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              ) : (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{pedido.observacoes}</p>
              )}
            </SectionCard>
          )}

          <SectionCard title="Timeline" padded={false}>
            <ul className="px-5 py-4">
              {timeline.map((t, i) => (
                <li key={i} className="relative flex items-start gap-3 pb-5 last:pb-0">
                  {i < timeline.length - 1 && <span className="absolute left-3.5 top-7 h-full w-px bg-border" />}
                  <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                    <t.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Cliente">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-semibold">{pedido.cliente?.nome ?? "Balcão"}</p>
                {pedido.cliente?.telefone && <p className="text-xs text-muted-foreground">{pedido.cliente.telefone}</p>}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pagamento">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Método</span>
                {editMode ? (
                  <select value={pagamento} onChange={(e) => setPagamento(e.target.value)} className="h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {PAGAMENTO_LIST.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                ) : (
                  <span className="font-medium">{pagamentoLabel(pedido.pagamento)}</span>
                )}
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={pedido.status} tone={statusTone(pedido.status)} /></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Valor</span><span className="tabular font-semibold">{formatBRL(Number(pedido.total))}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Origem">
            <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium capitalize">{pedido.origem}</p><p className="text-xs text-muted-foreground">{formatDateTime(pedido.created_at)}</p></div></div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}