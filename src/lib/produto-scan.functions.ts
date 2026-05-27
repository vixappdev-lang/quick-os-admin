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

/**
 * Auto-cadastro de produto a partir do EAN.
 * Usa sugestão do gtin_global quando disponível; caso contrário cria
 * um placeholder com nome "Produto <EAN>" e estoque zero. Sempre verifica
 * antes se já existe (idempotente) para evitar duplicidade.
 */
export const autoCreateProductFromEan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      ean: z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9\-]+$/),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ean = data.ean.trim();

    // Idempotência: se já existe, devolve.
    const { data: existente } = await supabase
      .from("produtos")
      .select("id, nome, sku, codigo_barras, imagem_url, estoque, preco_venda, unidade")
      .or(`codigo_barras.eq.${ean},sku.eq.${ean}`)
      .limit(1)
      .maybeSingle();
    if (existente) return { created: false as const, produto: existente };

    // Sugestão da base global
    let nome: string | null = null;
    let unidade = "UN";
    let imagem_url: string | null = null;
    try {
      const { data: g } = await supabase
        .from("gtin_global" as any)
        .select("nome, unidade, imagem_url")
        .eq("gtin", ean)
        .maybeSingle();
      if (g) {
        nome = (g as any).nome ?? null;
        unidade = (g as any).unidade ?? "UN";
        imagem_url = (g as any).imagem_url ?? null;
      }
    } catch { /* ignore */ }

    const { data: novo, error } = await supabase
      .from("produtos")
      .insert({
        sku: ean,
        codigo_barras: ean,
        nome: nome ?? `Produto ${ean}`,
        unidade,
        imagem_url,
        estoque: 0,
        preco_venda: 0,
      } as any)
      .select("id, nome, sku, codigo_barras, imagem_url, estoque, preco_venda, unidade")
      .single();
    if (error) throw new Error(error.message);
    return { created: true as const, produto: novo };
  });