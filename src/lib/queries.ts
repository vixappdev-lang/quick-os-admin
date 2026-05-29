import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { supabase as centralSupabase } from "@/integrations/supabase/client";
import { activeSupabase as supabase } from "@/integrations/supabase/active-client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const SUPER_ADMIN_EMAIL = "admin@loja.com";

export type Produto = Tables<"produtos">;
export type Categoria = Tables<"categorias">;
export type Cliente = Tables<"clientes">;
export type Pedido = Tables<"pedidos">;
export type PedidoItem = Tables<"pedido_itens">;
export type CaixaSessao = Tables<"caixa_sessoes">;
export type CaixaMovimento = Tables<"caixa_movimentos">;
export type Despesa = Tables<"despesas">;
export type Conta = Tables<"contas">;
export type NfeEntrada = Tables<"nfe_entradas">;
export type NfeItem = Tables<"nfe_itens">;
export type EstoqueMovimento = Tables<"estoque_movimentos">;
export type Profile = Tables<"profiles">;
export type UserRole = Tables<"user_roles">;
export type AppSettings = Tables<"app_settings">;

// FORNECEDORES
export function useFornecedores() {
  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores" as any).select("*").order("razao_social");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}
export function useUpsertFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase.from("fornecedores" as any).update(rest as any).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("fornecedores" as any).insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}
export function useDeleteFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

// PATRIMONIO
export function usePatrimonio() {
  return useQuery({
    queryKey: ["patrimonio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patrimonio" as any).select("*").order("data_aquisicao", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}
export function useUpsertPatrimonio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("patrimonio" as any).update(rest as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patrimonio" as any).insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patrimonio"] }),
  });
}
export function useDeletePatrimonio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patrimonio" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patrimonio"] }),
  });
}

// CONTAS (insert/update/delete)
export function useUpsertConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("contas").update(rest as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas").insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contas"] }),
  });
}
export function useDeleteConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contas"] }),
  });
}

// ENTRADA DE ESTOQUE (manual, com flag fiscal)
export function useNovaEntradaEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      produto_id: string;
      qtd_un: number; // já em unidades
      preco_custo?: number | null;
      fornecedor_id?: string | null;
      tem_nota_fiscal: boolean;
      observacao?: string | null;
    }) => {
      // lê estoque atual
      const { data: prod, error: pe } = await supabase.from("produtos").select("estoque").eq("id", input.produto_id).single();
      if (pe) throw pe;
      const novo = Number(prod.estoque) + Math.abs(input.qtd_un);
      const patch: any = { estoque: novo };
      if (input.tem_nota_fiscal) patch.tem_nota_fiscal = true;
      if (input.fornecedor_id) patch.fornecedor_id = input.fornecedor_id;
      if (input.preco_custo != null) patch.preco_custo = input.preco_custo;
      const { error: ue } = await supabase.from("produtos").update(patch).eq("id", input.produto_id);
      if (ue) throw ue;
      const motivo = `Entrada${input.tem_nota_fiscal ? " (NF)" : " (sem NF)"}${input.observacao ? " — " + input.observacao : ""}`;
      const { error: me } = await supabase.from("estoque_movimentos").insert({
        produto_id: input.produto_id,
        tipo: "entrada" as any,
        qtd: Math.abs(input.qtd_un),
        motivo,
      } as any);
      if (me) throw me;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
    },
  });
}

// APP SETTINGS
export function useAppSettings() {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", "main")
        .maybeSingle();
      if (error) throw error;
      return data as AppSettings | null;
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
export function useUpdateAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      const { data, error } = await supabase
        .from("app_settings")
        .update(patch as any)
        .eq("id", "main")
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_settings"] }),
  });
}

// PRODUTOS
export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categoria:categorias(id,nome,cor)")
        .order("nome");
      if (error) throw error;
      return data as (Produto & { categoria: { id: string; nome: string; cor: string | null } | null })[];
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
export function useProduto(id: string) {
  return useQuery({
    queryKey: ["produtos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
export function useUpsertProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"produtos"> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase.from("produtos").update(rest as TablesUpdate<"produtos">).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("produtos").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}
export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

// CATEGORIAS
export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("nome");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
export function useUpsertCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; nome: string; cor?: string | null; icone?: string | null; ativo?: boolean }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase.from("categorias").update(rest as any).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("categorias").insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}
export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

// CLIENTES
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
export function useCliente(id: string) {
  return useQuery({
    queryKey: ["clientes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
export function useUpsertCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"clientes"> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase.from("clientes").update(rest as TablesUpdate<"clientes">).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("clientes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

// Vendedores (profiles com role 'vendedor' ou staff)
export function useVendedores() {
  return useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data: me } = await centralSupabase.auth.getUser();
      const myId = me.user?.id;
      const myEmail = (me.user?.email ?? "").toLowerCase();
      const isSuper = myEmail === SUPER_ADMIN_EMAIL;
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        centralSupabase.from("profiles").select("id, nome, email, created_by_admin").order("nome"),
        centralSupabase.from("user_roles").select("user_id, role"),
      ]);
      const rmap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rmap.get(r.user_id) ?? [];
        arr.push(r.role);
        rmap.set(r.user_id, arr);
      });
      return (profiles ?? [])
        .map((p: any) => ({ ...p, roles: rmap.get(p.id) ?? [] }))
        .filter((p: any) => p.roles.some((r: string) => ["vendedor", "admin", "gerente", "operador"].includes(r)))
        // Super-admin vê todos; demais admins veem a si próprios e os usuários que criaram.
        .filter((p: any) => isSuper || !myId || p.id === myId || p.created_by_admin === myId);
    },
    staleTime: 60_000,
  });
}

// Atualizar pedido (edição completa)
export function useUpdatePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      cliente_id?: string | null;
      pagamento?: string | null;
      observacoes?: string | null;
      desconto?: number;
      itens?: { produto_id: string; qtd: number; preco_unit: number; desconto?: number }[];
    }) => {
      const toCents = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 100);
      const fromCents = (v: number) => v / 100;
      const patch: any = { updated_at: new Date().toISOString() };
      if (input.cliente_id !== undefined) patch.cliente_id = input.cliente_id;
      if (input.pagamento !== undefined) patch.pagamento = input.pagamento;
      if (input.observacoes !== undefined) patch.observacoes = input.observacoes;
      if (input.itens) {
        const subtotalCents = input.itens.reduce((s, i) => s + Math.max(0, toCents(i.preco_unit) * i.qtd - toCents(i.desconto ?? 0)), 0);
        const descontoCents = Math.min(toCents(input.desconto ?? 0), subtotalCents);
        patch.subtotal = fromCents(subtotalCents);
        patch.desconto = fromCents(descontoCents);
        patch.total = fromCents(Math.max(0, subtotalCents - descontoCents));
        // substitui itens
        await supabase.from("pedido_itens").delete().eq("pedido_id", input.id);
        const itensInsert = input.itens.map((i) => ({
          pedido_id: input.id,
          produto_id: i.produto_id,
          qtd: i.qtd,
          preco_unit: i.preco_unit,
          desconto: i.desconto ?? 0,
          total: fromCents(Math.max(0, toCents(i.preco_unit) * i.qtd - toCents(i.desconto ?? 0))),
        }));
        if (itensInsert.length) await supabase.from("pedido_itens").insert(itensInsert);
      } else if (input.desconto !== undefined) {
        patch.desconto = input.desconto;
      }
      const { data, error } = await supabase.from("pedidos").update(patch).eq("id", input.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos", v.id] });
    },
  });
}

// Histórico de caixa
export function useCaixaHistorico(limit = 10) {
  return useQuery({
    queryKey: ["caixa", "historico", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_sessoes")
        .select("*")
        .order("abertura", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCaixaSessaoDetalhe(sessaoId?: string | null) {
  return useQuery({
    queryKey: ["caixa", "sessao", sessaoId],
    enabled: !!sessaoId,
    queryFn: async () => {
      const { data: sessao, error } = await supabase
        .from("caixa_sessoes").select("*").eq("id", sessaoId!).maybeSingle();
      if (error) throw error;
      const { data: movs } = await supabase
        .from("caixa_movimentos").select("*").eq("sessao_id", sessaoId!)
        .order("created_at", { ascending: true });
      return { ...(sessao as any), movimentos: movs ?? [] } as any;
    },
    staleTime: 15_000,
  });
}

export function useFaturamentos() {
  return useQuery({
    queryKey: ["faturamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturamentos" as any).select("*")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

// Faturamentos
export function useCriarFaturamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pedidoIds: string[]; total: number; userId?: string | null }) => {
      const { data: fat, error } = await supabase
        .from("faturamentos" as any)
        .insert({ total: input.total, created_by: input.userId ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      if (input.pedidoIds.length) {
        const rows = input.pedidoIds.map((pid) => ({ faturamento_id: (fat as any).id, pedido_id: pid }));
        const { error: re } = await supabase.from("faturamento_pedidos" as any).insert(rows as any);
        if (re) throw re;
        // marca pedidos como concluido
        await supabase.from("pedidos").update({ status: "concluido", updated_at: new Date().toISOString() }).in("id", input.pedidoIds);
      }
      return fat;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["faturamentos"] });
    },
  });
}

// PEDIDOS
export function usePedidos(filters?: { vendedorId?: string }) {
  return useQuery({
    queryKey: ["pedidos", filters],
    queryFn: async () => {
      let q = supabase
        .from("pedidos")
        .select("*, cliente:clientes(id,nome,telefone), itens:pedido_itens(id,qtd,preco_unit,total,produto:produtos(id,nome,sku))")
        .order("created_at", { ascending: false });
      if (filters?.vendedorId) q = q.eq("vendedor_id", filters.vendedorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}
export function usePedido(id: string) {
  return useQuery({
    queryKey: ["pedidos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, cliente:clientes(*), itens:pedido_itens(*, produto:produtos(id,nome,sku,unidade)), vendedor:profiles!pedidos_vendedor_id_fkey(id,nome)")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        // fallback without join name (no FK named)
        const { data: d2 } = await supabase
          .from("pedidos")
          .select("*, cliente:clientes(*), itens:pedido_itens(*, produto:produtos(id,nome,sku,unidade))")
          .eq("id", id)
          .maybeSingle();
        return d2 as any;
      }
      return data as any;
    },
    enabled: !!id,
  });
}
export function useUpdatePedidoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: Pedido["status"] }) => {
      const { data, error } = await supabase
        .from("pedidos")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

// PAGAMENTOS DO PEDIDO (múltiplas formas)
export function usePedidoPagamentos(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ["pedido_pagamentos", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_pagamentos" as any)
        .select("*")
        .eq("pedido_id", pedidoId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!pedidoId,
  });
}
export function useAddPedidoPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pedido_id: string; forma: string; condicao?: string | null; vencimento?: string | null; valor: number }) => {
      const { data, error } = await supabase
        .from("pedido_pagamentos" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pedido_pagamentos", v.pedido_id] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos", v.pedido_id] });
    },
  });
}
export function useRemovePedidoPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; pedido_id: string }) => {
      const { error } = await supabase.from("pedido_pagamentos" as any).delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["pedido_pagamentos", v.pedido_id] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos", v.pedido_id] });
    },
  });
}
export function useEncerrarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("pedidos")
        .update({ status: "encerrado" as any, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos", id] });
    },
  });
}
export function useCreatePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      cliente_id: string | null;
      vendedor_id?: string | null;
      operador_id?: string | null;
      origem: Pedido["origem"];
      pagamento?: Pedido["pagamento"] | null;
      desconto?: number;
      observacoes?: string | null;
      tipo_operacao?: "saida" | "entrada";
      fornecedor_id?: string | null;
      itens: { produto_id: string; qtd: number; preco_unit: number; desconto?: number; qtd_un_por_embalagem?: number; embalagem_tipo?: string }[];
      pagamentos?: { forma: string; condicao?: string | null; vencimento?: string | null; valor: number }[];
    }) => {
      const toCents = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 100);
      const fromCents = (v: number) => v / 100;
      const subtotalCents = input.itens.reduce((s, i) => s + Math.max(0, toCents(i.preco_unit) * i.qtd - toCents(i.desconto ?? 0)), 0);
      const descontoCents = Math.min(toCents(input.desconto ?? 0), subtotalCents);
      const subtotal = fromCents(subtotalCents);
      const desconto = fromCents(descontoCents);
      const total = fromCents(Math.max(0, subtotalCents - descontoCents));
      const { data: pedido, error: pe } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: input.cliente_id,
          vendedor_id: input.vendedor_id ?? null,
          operador_id: input.operador_id ?? null,
          origem: input.origem,
          pagamento: input.pagamento ?? null,
          status: "pendente",
          subtotal, desconto, total,
          observacoes: input.observacoes ?? null,
          tipo_operacao: input.tipo_operacao ?? "saida",
          fornecedor_id: input.fornecedor_id ?? null,
        } as any)
        .select()
        .single();
      if (pe) throw pe;
      const itensInsert = input.itens.map((i) => ({
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        qtd: i.qtd,
        preco_unit: i.preco_unit,
        desconto: i.desconto ?? 0,
        qtd_un_por_embalagem: i.qtd_un_por_embalagem ?? 1,
        embalagem_tipo: i.embalagem_tipo ?? "UN",
        total: fromCents(Math.max(0, toCents(i.preco_unit) * i.qtd - toCents(i.desconto ?? 0))),
      }));
      const { error: ie } = await supabase.from("pedido_itens").insert(itensInsert);
      if (ie) throw ie;
      // Múltiplas formas de pagamento (opcional)
      if (input.pagamentos && input.pagamentos.length > 0) {
        const rows = input.pagamentos
          .filter((p) => Number(p.valor) > 0)
          .map((p) => ({
            pedido_id: pedido.id,
            forma: p.forma,
            condicao: p.condicao ?? null,
            vencimento: p.vencimento ?? null,
            valor: p.valor,
          }));
        if (rows.length > 0) {
          const { error: pe2 } = await supabase.from("pedido_pagamentos" as any).insert(rows as any);
          if (pe2) throw pe2;
        }
      }
      // Se a venda veio do PDV, lança movimento de venda no caixa atual (se houver)
      if (input.origem === "pdv" && total > 0) {
        try {
          const { data: sessao } = await supabase
            .from("caixa_sessoes").select("id").eq("status", "aberto")
            .order("abertura", { ascending: false }).limit(1).maybeSingle();
          if (sessao?.id) {
            await supabase.from("caixa_movimentos").insert({
              sessao_id: sessao.id,
              tipo: "venda" as any,
              valor: total,
              descricao: `Venda ${pedido.numero} (${input.pagamento ?? "—"})`,
            } as any);
          }
        } catch {}
      }
      return pedido;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["caixa"] });
    },
  });
}

// CAIXA
export function useCaixaAtual() {
  return useQuery({
    queryKey: ["caixa", "atual"],
    queryFn: async () => {
      const { data: sessao, error } = await supabase
        .from("caixa_sessoes")
        .select("*")
        .eq("status", "aberto")
        .order("abertura", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!sessao) return null;
      const { data: movs } = await supabase
        .from("caixa_movimentos")
        .select("*")
        .eq("sessao_id", sessao.id);
      return { ...sessao, movimentos: movs ?? [] } as any;
    },
    staleTime: 15_000,
  });
}
export function useAbrirCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { valor_inicial: number; operador_id: string }) => {
      const { data, error } = await supabase.from("caixa_sessoes").insert({
        valor_inicial: input.valor_inicial,
        operador_id: input.operador_id,
        status: "aberto",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caixa"] }),
  });
}
export function useFecharCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; valor_final: number; observacoes?: string }) => {
      const { data, error } = await supabase.from("caixa_sessoes").update({
        status: "fechado",
        valor_final: input.valor_final,
        fechamento: new Date().toISOString(),
        observacoes: input.observacoes ?? null,
      }).eq("id", input.id).select().single();
      if (error) throw error;
      // Auto-registra Faturamento com a soma das vendas da sessão
      try {
        const { data: movs } = await supabase
          .from("caixa_movimentos").select("valor,tipo").eq("sessao_id", input.id);
        const totalVendas = (movs ?? [])
          .filter((m: any) => m.tipo === "venda")
          .reduce((s: number, m: any) => s + Number(m.valor), 0);
        if (totalVendas > 0) {
          const { data: u } = await supabase.auth.getUser();
          await supabase.from("faturamentos" as any).insert({
            total: totalVendas,
            created_by: u.user?.id ?? null,
          } as any);
        }
      } catch {}
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa"] });
      qc.invalidateQueries({ queryKey: ["faturamentos"] });
    },
  });
}
export function useCaixaMovimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessao_id: string; tipo: "suprimento" | "sangria" | "venda" | "despesa"; valor: number; descricao?: string }) => {
      const { error } = await supabase.from("caixa_movimentos").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caixa"] }),
  });
}

// ESTOQUE
export function useEstoqueMovimentos(produtoId?: string) {
  return useQuery({
    queryKey: ["estoque", "movimentos", produtoId],
    queryFn: async () => {
      let q = supabase
        .from("estoque_movimentos")
        .select("*, produto:produtos(id,nome,sku,unidade)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (produtoId) q = q.eq("produto_id", produtoId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
  });
}
export function useAjusteEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { produto_id: string; tipo: "entrada" | "saida" | "ajuste" | "perda"; qtd: number; motivo?: string }) => {
      // ler estoque atual
      const { data: prod, error: pe } = await supabase.from("produtos").select("estoque").eq("id", input.produto_id).single();
      if (pe) throw pe;
      const delta = (input.tipo === "saida" || input.tipo === "perda")
        ? -Math.abs(input.qtd)
        : (input.tipo === "ajuste" ? input.qtd - Number(prod.estoque) : Math.abs(input.qtd));
      const novo = input.tipo === "ajuste" ? input.qtd : Number(prod.estoque) + delta;
      const { error: ue } = await supabase.from("produtos").update({ estoque: novo }).eq("id", input.produto_id);
      if (ue) throw ue;
      const { error: me } = await supabase.from("estoque_movimentos").insert({
        produto_id: input.produto_id,
        tipo: input.tipo,
        qtd: Math.abs(delta || input.qtd),
        motivo: input.motivo ?? null,
      });
      if (me) throw me;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

// DESPESAS + CONTAS
export function useDespesas() {
  return useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").order("vencimento", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}
export function useUpsertDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"despesas"> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("despesas").update(rest as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("despesas").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas"] }),
  });
}
export function useContas() {
  return useQuery({
    queryKey: ["contas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas").select("*, cliente:clientes(id,nome)").order("vencimento");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
  });
}

// NFE
export function useNfes() {
  return useQuery({
    queryKey: ["nfes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfe_entradas")
        .select("*, itens:nfe_itens(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
  });
}
export function useNfe(id: string) {
  return useQuery({
    queryKey: ["nfes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfe_entradas")
        .select("*, itens:nfe_itens(*, produto:produtos(id,nome,sku))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

// USUARIOS
export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data: me } = await centralSupabase.auth.getUser();
      const myId = me.user?.id;
      const myEmail = (me.user?.email ?? "").toLowerCase();
      const isSuper = myEmail === SUPER_ADMIN_EMAIL;
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        centralSupabase.from("profiles").select("*").order("nome"),
        centralSupabase.from("user_roles").select("*"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const map = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role);
        map.set(r.user_id, arr);
      });
      return (profiles ?? [])
        .filter((p: any) => isSuper || !myId || p.id === myId || p.created_by_admin === myId)
        .map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
    staleTime: 30_000,
  });
}

// AUDIT
export function useAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

// PRODUCT IMAGES (galeria reutilizável de imagens IA)
export function useProductImages(query?: string) {
  return useQuery({
    queryKey: ["product-images", query ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("product_images" as any)
        .select("id, nome, nome_chave, url, created_at")
        .order("created_at", { ascending: false })
        .limit(24);
      if (query && query.trim().length >= 2) {
        q = q.ilike("nome_chave", `%${query.trim().toLowerCase()}%`);
      }
      const { data, error } = await q;
      if (error) return [] as any[];
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}

// APP LOGS — auditoria filtrável
export const LOG_CATEGORIAS = ["login", "produto", "pedido", "erro", "webhook"] as const;
export type LogCategoria = (typeof LOG_CATEGORIAS)[number];

export async function logEvent(categoria: LogCategoria, mensagem: string, payload?: any) {
  try {
    const { data: { user } } = await centralSupabase.auth.getUser();
    let ip: string | null = null;
    let ua: string | null = null;
    if (typeof window !== "undefined") {
      ua = window.navigator.userAgent;
      try {
        const cached = sessionStorage.getItem("__client_ip");
        if (cached) ip = cached;
        else {
          const r = await fetch("https://api.ipify.org?format=json").then((x) => x.json()).catch(() => null);
          if (r?.ip) { ip = r.ip; sessionStorage.setItem("__client_ip", r.ip); }
        }
      } catch {/* ignore */}
    }
    await centralSupabase.from("app_logs" as any).insert({
      categoria,
      mensagem,
      payload: payload ?? null,
      user_id: user?.id ?? null,
      ip,
      user_agent: ua,
    } as any);
  } catch {
    /* não-bloqueante */
  }
}

export function useAppLogs(filtro: { categoria?: LogCategoria | "all"; busca?: string } = {}) {
  return useQuery({
    queryKey: ["app_logs", filtro.categoria ?? "all", filtro.busca ?? ""],
    queryFn: async () => {
      let q = centralSupabase
        .from("app_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filtro.categoria && filtro.categoria !== "all") q = q.eq("categoria", filtro.categoria);
      if (filtro.busca && filtro.busca.trim().length >= 2) q = q.ilike("mensagem", `%${filtro.busca.trim()}%`);
      const { data, error } = await q;
      if (error) return [] as any[];
      return (data ?? []) as any[];
    },
    refetchInterval: 5_000,
    staleTime: 2_000,
  });
}

// NFE WEBHOOK EVENTS — feed em tempo real
export function useNfeWebhookEvents() {
  return useQuery({
    queryKey: ["nfe_webhook_events"],
    queryFn: async () => {
      const { data, error } = await centralSupabase
        .from("nfe_webhook_events" as any)
        .select("*")
        .order("recebido_em", { ascending: false })
        .limit(100);
      if (error) return [] as any[];
      return (data ?? []) as any[];
    },
    staleTime: 1_000,
  });
}

// FATURAMENTO — pedidos faturados no período
export function useFaturamento(periodo: "dia" | "mes" | "ano" = "mes") {
  return useQuery({
    queryKey: ["faturamento", periodo],
    queryFn: async () => {
      const now = new Date();
      let from = new Date();
      if (periodo === "dia") from.setHours(0, 0, 0, 0);
      else if (periodo === "mes") from = new Date(now.getFullYear(), now.getMonth(), 1);
      else from = new Date(now.getFullYear(), 0, 1);
      const { data, error } = await supabase
        .from("pedidos")
        .select("id,total,faturado_em" as any)
        .gte("faturado_em", from.toISOString())
        .not("faturado_em", "is", null);
      if (error) throw error;
      const total = (data ?? []).reduce((s: number, p: any) => s + Number(p.total ?? 0), 0);
      return { total, qtd: (data ?? []).length, from: from.toISOString() };
    },
    staleTime: 30_000,
  });
}

export function useFaturarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data, error } = await supabase
        .from("pedidos")
        .update({ faturado_em: new Date().toISOString() } as any)
        .eq("id", pedidoId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido", id] });
      qc.invalidateQueries({ queryKey: ["faturamento"] });
    },
  });
}

export function useSalvarNfeEmitida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pedidoId: string; invoice: any }) => {
      const inv = input.invoice ?? {};
      const patch: any = {
        nfe_id: inv.id ?? inv.invoiceId ?? null,
        nfe_status: inv.status ?? null,
        nfe_numero: inv.number ? String(inv.number) : null,
        nfe_chave: inv.accessKey ?? inv.acessKey ?? null,
        nfe_pdf_url: inv?.pdf?.url ?? null,
        nfe_xml_url: inv?.xml?.url ?? null,
        nfe_emitida_em: new Date().toISOString(),
        faturado_em: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("pedidos")
        .update(patch)
        .eq("id", input.pedidoId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pedido", v.pedidoId] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["faturamento"] });
    },
  });
}

// Eventos nfe.io disponíveis para o usuário marcar
export const NFEIO_EVENTOS: { key: string; label: string }[] = [
  { key: "issued", label: "Emitida (issued)" },
  { key: "issueFailed", label: "Falha na emissão (issueFailed)" },
  { key: "cancelled", label: "Cancelada (cancelled)" },
  { key: "cancelFailed", label: "Falha no cancelamento (cancelFailed)" },
  { key: "inutilized", label: "Inutilizada (inutilized)" },
  { key: "inutilizeFailed", label: "Falha na inutilização (inutilizeFailed)" },
  { key: "disabled", label: "Desabilitada (disabled)" },
  { key: "pdfGenerated", label: "PDF gerado (pdfGenerated)" },
  { key: "pdfGenerateFailed", label: "Falha no PDF (pdfGenerateFailed)" },
  { key: "xmlGenerated", label: "XML gerado (xmlGenerated)" },
  { key: "xmlGenerateFailed", label: "Falha no XML (xmlGenerateFailed)" },
];
