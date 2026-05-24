import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey, json, unauthorized, corsHeaders } from "./_auth";

const PedidoSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  pagamento: z.enum(["pix", "credito", "debito", "dinheiro", "fiado"]).nullable().optional(),
  origem: z.enum(["balcao", "delivery", "pdv"]).default("balcao"),
  desconto: z.number().min(0).default(0),
  observacoes: z.string().max(1000).nullable().optional(),
  itens: z.array(z.object({
    produto_id: z.string().uuid(),
    qtd: z.number().positive(),
    preco_unit: z.number().nonnegative().optional(),
  })).min(1).max(200),
});

export const Route = createFileRoute("/api/public/v1/pedidos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth) return unauthorized();
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const status = url.searchParams.get("status");
        let q = supabaseAdmin
          .from("pedidos")
          .select("id, numero, status, total, subtotal, desconto, pagamento, origem, cliente_id, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (status) q = q.eq("status", status as any);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      },

      POST: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth) return unauthorized();
        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
        const parsed = PedidoSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Validation failed", details: parsed.error.format() }, 422);
        const input = parsed.data;

        // resolve preços faltantes
        const ids = input.itens.map((i) => i.produto_id);
        const { data: prods, error: pe } = await supabaseAdmin
          .from("produtos").select("id, preco_venda").in("id", ids);
        if (pe) return json({ error: pe.message }, 500);
        const priceMap = new Map((prods ?? []).map((p) => [p.id, Number(p.preco_venda)]));
        const itens = input.itens.map((i) => {
          const preco = i.preco_unit ?? priceMap.get(i.produto_id);
          if (preco == null) throw new Error(`Produto ${i.produto_id} não encontrado`);
          return { produto_id: i.produto_id, qtd: i.qtd, preco_unit: preco, total: preco * i.qtd };
        });
        const subtotal = itens.reduce((s, i) => s + i.total, 0);
        const total = Math.max(0, subtotal - input.desconto);

        const { data: pedido, error: ce } = await supabaseAdmin.from("pedidos").insert({
          cliente_id: input.cliente_id ?? null,
          origem: input.origem,
          pagamento: input.pagamento ?? null,
          status: "pendente",
          subtotal, desconto: input.desconto, total,
          observacoes: input.observacoes ?? null,
        }).select().single();
        if (ce) return json({ error: ce.message }, 500);

        const { error: ie } = await supabaseAdmin
          .from("pedido_itens")
          .insert(itens.map((i) => ({ ...i, pedido_id: pedido.id })));
        if (ie) return json({ error: ie.message }, 500);

        return json({ data: { id: pedido.id, numero: pedido.numero, total: pedido.total } }, 201);
      },
    },
  },
});