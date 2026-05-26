import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function genImageBestEffort(nome: string, key: string): Promise<string | null> {
  try {
    const prompt = `Foto profissional de produto: ${nome}. Fundo branco neutro, iluminação suave, embalagem brasileira realista, alto detalhe, sem texto adicional, estilo catálogo de mercado/conveniência.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Identifica um produto a partir de um código de barras (EAN/UPC) e cadastra
 * automaticamente. Se o produto já existir, retorna o existente.
 * Usa Lovable AI para inferir nome/marca/categoria/unidade quando possível.
 */
export const identifyAndCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      ean: z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9\-]+$/, "Código inválido"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ean = data.ean.trim();

    // 1) Já existe?
    const { data: existente } = await supabase
      .from("produtos")
      .select("id, nome, sku, codigo_barras, imagem_url, estoque, preco_venda, unidade")
      .or(`codigo_barras.eq.${ean},sku.eq.${ean}`)
      .limit(1)
      .maybeSingle();

    if (existente) {
      return { already: true as const, produto: existente, identified: false };
    }

    const key = process.env.LOVABLE_API_KEY;

    // 2) Tenta identificar via IA
    let identified = false;
    let info: { nome: string; marca?: string; unidade?: string; categoria_sugerida?: string } = {
      nome: `Produto ${ean}`,
    };
    if (key) try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você identifica produtos de varejo brasileiro a partir do código de barras (EAN/UPC). Responda APENAS com JSON válido, sem markdown.",
            },
            {
              role: "user",
              content: `Código de barras: ${ean}\n\nDevolva JSON com o seguinte schema:\n{\n  "unknown": boolean,         // true se não souber o produto\n  "nome": string,             // ex: "Heineken Long Neck 330ml"\n  "marca": string,            // ex: "Heineken"\n  "unidade": "UN"|"CX"|"KG"|"L"|"ML",\n  "categoria_sugerida": string // ex: "Bebidas", "Limpeza", "Mercearia"\n}\nSe não souber, devolva {"unknown": true}.`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (aiRes.ok) {
        const aiJson: any = await aiRes.json();
        const raw = aiJson?.choices?.[0]?.message?.content;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (!parsed?.unknown && typeof parsed?.nome === "string" && parsed.nome.trim().length > 1) {
              info = {
                nome: parsed.nome.trim(),
                marca: typeof parsed.marca === "string" ? parsed.marca : undefined,
                unidade: typeof parsed.unidade === "string" ? parsed.unidade : undefined,
                categoria_sugerida: typeof parsed.categoria_sugerida === "string" ? parsed.categoria_sugerida : undefined,
              };
              identified = true;
            }
          } catch { /* fallback */ }
        }
      }
    } catch { /* fallback */ }

    // 3) Imagem (best-effort)
    const imagemUrl = identified && key ? await genImageBestEffort(info.nome, key) : null;

    // 4) Insert
    const insertRow = {
      nome: info.nome,
      sku: ean,
      codigo_barras: ean,
      unidade: info.unidade ?? "UN",
      preco_custo: 0,
      preco_venda: 0,
      estoque: 0,
      estoque_minimo: 0,
      ativo: true,
      imagem_url: imagemUrl,
    };
    const { data: criado, error } = await supabase
      .from("produtos")
      .insert(insertRow)
      .select("id, nome, sku, codigo_barras, imagem_url, estoque, preco_venda, unidade")
      .single();
    if (error) throw new Error(error.message);

    // 5) Persiste imagem na galeria reutilizável (best-effort)
    if (imagemUrl) {
      try {
        await context.supabase.from("product_images" as any).insert({
          nome: info.nome,
          nome_chave: slugify(info.nome),
          url: imagemUrl,
          created_by: context.userId,
        });
      } catch { /* ignore */ }
    }

    return { already: false as const, produto: criado, identified, warning: key ? null : "AI indisponível — cadastro mínimo, edite para completar" };
  });