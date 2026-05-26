import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lookup-only de produto por EAN/UPC.
 * - Procura primeiro em `produtos` (do tenant) por codigo_barras ou sku.
 * - Se não achar, consulta a tabela global `gtin_global` para sugerir
 *   nome/marca/unidade/categoria/imagem ao formulário de cadastro manual.
 * - NUNCA insere. O cadastro é sempre feito explicitamente pelo usuário,
 *   no formulário manual, com o EAN já preenchido.
 */
export const lookupProductByEan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      ean: z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9\-]+$/, "Código inválido"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ean = data.ean.trim();

    // 1) Já existe no catálogo do tenant?
    const { data: existente, error: e1 } = await supabase
      .from("produtos")
      .select("id, nome, sku, codigo_barras, imagem_url, estoque, preco_venda, unidade")
      .or(`codigo_barras.eq.${ean},sku.eq.${ean}`)
      .limit(1)
      .maybeSingle();
    if (e1) {
      console.error("[lookupProductByEan] produtos lookup", e1);
    }

    if (existente) {
      return { found: true as const, ean, produto: existente, sugestao: null };
    }

    // 2) Consulta a base global de GTIN para pré-preencher o formulário manual.
    try {
      const { data: g } = await supabase
        .from("gtin_global" as any)
        .select("nome, marca, unidade, categoria_sugerida, imagem_url")
        .eq("gtin", ean)
        .limit(1)
        .maybeSingle();
      if (g) {
        return {
          found: false as const,
          ean,
          produto: null,
          sugestao: {
            nome: (g as any).nome ?? null,
            marca: (g as any).marca ?? null,
            unidade: (g as any).unidade ?? null,
            categoria_sugerida: (g as any).categoria_sugerida ?? null,
            imagem_url: (g as any).imagem_url ?? null,
          },
        };
      }
    } catch (err) {
      console.error("[lookupProductByEan] gtin_global lookup", err);
    }

    return { found: false as const, ean, produto: null, sugestao: null };
  });