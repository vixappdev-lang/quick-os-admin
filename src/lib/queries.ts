import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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

// PEDIDOS
export function usePedidos(filters?: { vendedorId?: string }) {
  return useQuery({
    queryKey: ["pedidos", filters],
    queryFn: async () => {
      let q = supabase
        .from("pedidos")
        .select("*, cliente:clientes(id,nome), itens:pedido_itens(id,qtd,preco_unit,total,produto:produtos(id,nome,sku))")
        .order("created_at", { ascending: false });
      if (filters?.vendedorId) q = q.eq("vendedor_id", filters.vendedorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 15_000,
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
      itens: { produto_id: string; qtd: number; preco_unit: number }[];
    }) => {
      const subtotal = input.itens.reduce((s, i) => s + i.qtd * i.preco_unit, 0);
      const desconto = input.desconto ?? 0;
      const total = Math.max(0, subtotal - desconto);
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
        })
        .select()
        .single();
      if (pe) throw pe;
      const itensInsert = input.itens.map((i) => ({
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        qtd: i.qtd,
        preco_unit: i.preco_unit,
        total: i.qtd * i.preco_unit,
      }));
      const { error: ie } = await supabase.from("pedido_itens").insert(itensInsert);
      if (ie) throw ie;
      return pedido;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

// CAIXA
export function useCaixaAtual() {
  return useQuery({
    queryKey: ["caixa", "atual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_sessoes")
        .select("*, movimentos:caixa_movimentos(*)")
        .eq("status", "aberto")
        .order("abertura", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
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
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caixa"] }),
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
  });
}
export function useAjusteEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { produto_id: string; tipo: "entrada" | "saida" | "ajuste"; qtd: number; motivo?: string }) => {
      // ler estoque atual
      const { data: prod, error: pe } = await supabase.from("produtos").select("estoque").eq("id", input.produto_id).single();
      if (pe) throw pe;
      const delta = input.tipo === "saida" ? -Math.abs(input.qtd) : (input.tipo === "ajuste" ? input.qtd - Number(prod.estoque) : Math.abs(input.qtd));
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
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const map = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role);
        map.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
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
  });
}
