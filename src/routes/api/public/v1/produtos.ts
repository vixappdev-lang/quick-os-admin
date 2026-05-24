import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey, json, unauthorized, corsHeaders } from "./_auth";

export const Route = createFileRoute("/api/public/v1/produtos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth) return unauthorized();
        const url = new URL(request.url);
        const q = url.searchParams.get("q");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
        let query = supabaseAdmin
          .from("produtos")
          .select("id, nome, sku, codigo_barras, preco_venda, preco_custo, estoque, unidade, ativo")
          .order("nome")
          .limit(limit);
        if (q) query = query.or(`nome.ilike.%${q}%,sku.ilike.%${q}%,codigo_barras.ilike.%${q}%`);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      },
    },
  },
});